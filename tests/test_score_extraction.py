"""Regression tests for score extraction from MLflow EvaluationResult objects and traces.

These tests use mock objects to verify that _extract_scores_from_result and
_extract_row_scores produce correct output for known input shapes. If MLflow
changes its EvaluationResult structure or trace format, these tests will catch it
immediately without requiring a live workspace.
"""

import math
import types

import pandas as pd
import pytest

from server.evaluation import _extract_scores_from_result, _extract_row_scores


# --- Mock builders ---

def make_eval_result(df=None, tables=None):
    result = types.SimpleNamespace()
    result.result_df = df
    if tables is not None:
        result.tables = tables
    return result


def make_assessment_obj(name, value, rationale=None):
    a = types.SimpleNamespace()
    a.name = name
    a.value = value
    a.rationale = rationale
    return a


def make_trace_obj(assessments, use_data_attr=False):
    """Build a mock trace object. If use_data_attr=True, put assessments on trace.data
    instead of trace.info — exercises the fallback branch in _extract_row_scores."""
    if use_data_attr:
        info = types.SimpleNamespace()
        info.assessments = []
        data = types.SimpleNamespace()
        data.assessments = assessments
        trace = types.SimpleNamespace()
        trace.info = info
        trace.data = data
    else:
        info = types.SimpleNamespace()
        info.assessments = assessments
        trace = types.SimpleNamespace()
        trace.info = info
    return trace


# --- _extract_scores_from_result ---

class TestExtractScoresFromResult:

    def test_single_scorer_exact_column_name(self):
        df = pd.DataFrame({"response_quality": [3.5, 4.0, 2.0]})
        scores = _extract_scores_from_result(make_eval_result(df), "response_quality")
        assert scores == {0: (3.5, None, None), 1: (4.0, None, None), 2: (2.0, None, None)}

    def test_single_scorer_value_suffix_column(self):
        df = pd.DataFrame({
            "response_quality/value": [3.5, 4.0],
            "response_quality/rationale": ["needs work", "excellent"],
        })
        scores = _extract_scores_from_result(make_eval_result(df), "response_quality")
        assert scores == {0: (3.5, "needs work", None), 1: (4.0, "excellent", None)}

    def test_single_scorer_rationale_none_when_missing(self):
        df = pd.DataFrame({"response_quality": [3.0]})
        scores = _extract_scores_from_result(make_eval_result(df), "response_quality")
        assert scores[0][1] is None

    def test_single_scorer_no_matching_column_returns_empty(self):
        df = pd.DataFrame({"unrelated_column": [1.0, 2.0]})
        scores = _extract_scores_from_result(make_eval_result(df), "response_quality")
        assert scores == {}

    def test_result_df_none_falls_back_to_tables_dict(self):
        df = pd.DataFrame({"response_quality": [4.0]})
        result = make_eval_result(df=None, tables={"eval_table": df})
        scores = _extract_scores_from_result(result, "response_quality")
        assert scores == {0: (4.0, None, None)}

    def test_result_df_none_no_tables_returns_empty(self):
        scores = _extract_scores_from_result(make_eval_result(df=None), "response_quality")
        assert scores == {}

    def test_guidelines_scorer_pass_summary(self):
        # MLflow Guidelines judge produces sub-columns like "scorer_name/rule text"
        # plus an aggregated "scorer_name/value" column that should be skipped
        df = pd.DataFrame({
            "my_judge/value": [None, None],         # aggregated — must be skipped
            "my_judge/is polite": [True, False],
            "my_judge/is polite/rationale": ["Yes", "No"],
            "my_judge/is relevant": [True, True],
            "my_judge/is relevant/rationale": ["On topic", "Relevant"],
        })
        scores = _extract_scores_from_result(make_eval_result(df), "my_judge")
        assert scores[0][0] == "2/2"   # both pass
        assert scores[1][0] == "1/2"   # one fails

    def test_guidelines_scorer_returns_details_list(self):
        df = pd.DataFrame({
            "judge/rule_a": [True],
            "judge/rule_a/rationale": ["because"],
            "judge/rule_b": [False],
        })
        scores = _extract_scores_from_result(make_eval_result(df), "judge")
        details = scores[0][2]
        assert details is not None
        assert len(details) == 2
        names = {d["name"] for d in details}
        assert names == {"judge/rule_a", "judge/rule_b"}

    def test_guidelines_scorer_rationale_per_rule(self):
        df = pd.DataFrame({
            "judge/rule_a": [True],
            "judge/rule_a/rationale": ["good reason"],
        })
        scores = _extract_scores_from_result(make_eval_result(df), "judge")
        rule_a = scores[0][2][0]
        assert rule_a["rationale"] == "good reason"

    def test_guidelines_scorer_summary_is_none(self):
        # The middle element (summary rationale) is always None for Guidelines
        df = pd.DataFrame({"judge/rule_a": [True]})
        scores = _extract_scores_from_result(make_eval_result(df), "judge")
        assert scores[0][1] is None

    def test_row_index_from_dataframe_integer_index(self):
        df = pd.DataFrame({"response_quality": [1.0, 2.0, 3.0]})
        scores = _extract_scores_from_result(make_eval_result(df), "response_quality")
        assert set(scores.keys()) == {0, 1, 2}


# --- _extract_row_scores ---

class TestExtractRowScores:

    def test_trace_object_form_single_scorer(self, monkeypatch):
        trace = make_trace_obj([make_assessment_obj("response_quality", 3.5, "decent")])
        monkeypatch.setattr("mlflow.search_traces", lambda run_id, return_type: [trace])

        scores = _extract_row_scores("run-abc", "response_quality")
        assert scores == {0: (3.5, "decent", None)}

    def test_trace_dict_form_single_scorer(self, monkeypatch):
        trace = {
            "assessments": [{
                "name": "response_quality",
                "value": 4.0,
                "rationale": "very good",
                "feedback": {},
            }]
        }
        monkeypatch.setattr("mlflow.search_traces", lambda run_id, return_type: [trace])

        scores = _extract_row_scores("run-abc", "response_quality")
        assert scores == {0: (4.0, "very good", None)}

    def test_multiple_traces_keyed_by_trace_index(self, monkeypatch):
        traces = [
            make_trace_obj([make_assessment_obj("response_quality", 1.0)]),
            make_trace_obj([make_assessment_obj("response_quality", 5.0)]),
            make_trace_obj([make_assessment_obj("response_quality", 3.0)]),
        ]
        monkeypatch.setattr("mlflow.search_traces", lambda run_id, return_type: traces)

        scores = _extract_row_scores("run-abc", "response_quality")
        assert scores[0][0] == 1.0
        assert scores[1][0] == 5.0
        assert scores[2][0] == 3.0

    def test_guidelines_trace_form_pass_summary(self, monkeypatch):
        assessments = [
            make_assessment_obj("my_judge/rule_1", True, "passed"),
            make_assessment_obj("my_judge/rule_2", False, "failed"),
        ]
        trace = make_trace_obj(assessments)
        monkeypatch.setattr("mlflow.search_traces", lambda run_id, return_type: [trace])

        scores = _extract_row_scores("run-abc", "my_judge")
        assert scores[0][0] == "1/2"
        assert len(scores[0][2]) == 2

    def test_guidelines_trace_form_details_content(self, monkeypatch):
        assessments = [
            make_assessment_obj("judge/rule_a", True, "yes"),
            make_assessment_obj("judge/rule_b", False, "no"),
        ]
        monkeypatch.setattr("mlflow.search_traces", lambda run_id, return_type: [make_trace_obj(assessments)])

        scores = _extract_row_scores("run-abc", "judge")
        details = scores[0][2]
        names = {d["name"] for d in details}
        assert names == {"judge/rule_a", "judge/rule_b"}

    def test_no_matching_assessments_returns_empty(self, monkeypatch):
        trace = make_trace_obj([make_assessment_obj("some_other_scorer", 3.5)])
        monkeypatch.setattr("mlflow.search_traces", lambda run_id, return_type: [trace])

        scores = _extract_row_scores("run-abc", "response_quality")
        assert scores == {}

    def test_empty_trace_list_returns_empty(self, monkeypatch):
        monkeypatch.setattr("mlflow.search_traces", lambda run_id, return_type: [])
        scores = _extract_row_scores("run-abc", "response_quality")
        assert scores == {}

    def test_trace_data_assessments_fallback(self, monkeypatch):
        """Assessments on trace.data instead of trace.info — exercises the fallback branch."""
        trace = make_trace_obj(
            [make_assessment_obj("response_quality", 2.5, "mediocre")],
            use_data_attr=True,
        )
        monkeypatch.setattr("mlflow.search_traces", lambda run_id, return_type: [trace])

        scores = _extract_row_scores("run-abc", "response_quality")
        assert scores == {0: (2.5, "mediocre", None)}

    def test_assessment_with_none_value(self, monkeypatch):
        trace = make_trace_obj([make_assessment_obj("response_quality", None, "judge failed")])
        monkeypatch.setattr("mlflow.search_traces", lambda run_id, return_type: [trace])

        scores = _extract_row_scores("run-abc", "response_quality")
        assert scores[0][0] is None
        assert scores[0][1] == "judge failed"
