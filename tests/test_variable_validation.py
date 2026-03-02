"""Tests for variable value validation in POST /api/run.

Covers:
- _validate_variables() accepts valid values and empty dicts
- _validate_variables() rejects values over 50k characters
- _validate_variables() rejects values containing {{...}} template syntax
- Boundary cases: exactly at limit passes, one over fails
- Non-word brace patterns like {{foo-bar}} are NOT flagged (\\w+ only)
- End-to-end: POST /api/run returns 400 for invalid variable values
- End-to-end: POST /api/run succeeds and reaches call_model with valid values
"""

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock

from server.routes.run import _validate_variables, router


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


def _model_result():
    return {"content": "ok", "model": "test-model", "usage": {}}


def _mock_mlflow(mock_mlflow):
    mock_run = MagicMock()
    mock_run.__enter__ = MagicMock(return_value=mock_run)
    mock_run.__exit__ = MagicMock(return_value=False)
    mock_run.info.run_id = "test-run-id"
    mock_mlflow.start_run.return_value = mock_run
    mock_span = MagicMock()
    mock_span.__enter__ = MagicMock(return_value=mock_span)
    mock_span.__exit__ = MagicMock(return_value=False)
    mock_mlflow.start_span.return_value = mock_span
    for attr in ("log_text", "log_metrics", "log_params", "log_param", "set_tags"):
        setattr(mock_mlflow, attr, MagicMock())


# ---------------------------------------------------------------------------
# Unit tests for _validate_variables()
# ---------------------------------------------------------------------------

class TestValidateVariablesUnit:

    def test_empty_dict_passes(self):
        _validate_variables({})  # should not raise

    def test_normal_values_pass(self):
        _validate_variables({"name": "Alice", "topic": "Python", "company": "Acme Corp"})

    def test_special_chars_pass(self):
        """SQL injection, regex metacharacters, backslashes are all valid variable values."""
        _validate_variables({
            "sql": "'; DROP TABLE prompts; --",
            "regex": r"\1 backref",
            "price": "$100.00 (USD) + tax",
        })

    def test_value_at_exact_max_length_passes(self):
        _validate_variables({"key": "A" * 50_000})

    def test_value_one_over_max_length_raises_400(self):
        with pytest.raises(HTTPException) as exc_info:
            _validate_variables({"key": "A" * 50_001})
        assert exc_info.value.status_code == 400
        assert "key" in exc_info.value.detail

    def test_error_message_names_the_offending_variable(self):
        with pytest.raises(HTTPException) as exc_info:
            _validate_variables({"my_var": "A" * 50_001})
        assert "my_var" in exc_info.value.detail

    def test_template_syntax_raises_400(self):
        with pytest.raises(HTTPException) as exc_info:
            _validate_variables({"a": "hello {{b}}"})
        assert exc_info.value.status_code == 400
        assert "a" in exc_info.value.detail

    def test_template_syntax_with_spaces_raises_400(self):
        with pytest.raises(HTTPException) as exc_info:
            _validate_variables({"a": "hello {{ b }}"})
        assert exc_info.value.status_code == 400

    def test_non_word_brace_pattern_passes(self):
        """{{foo-bar}} contains a hyphen so it doesn't match \\w+ — should not be flagged."""
        _validate_variables({"key": "value with {{foo-bar}} here"})

    def test_incomplete_braces_pass(self):
        """Partial or unclosed brace patterns are not template syntax."""
        _validate_variables({"key": "{single braces}", "other": "{{not_closed"})

    def test_multiple_valid_vars_all_pass(self):
        _validate_variables({"a": "hello", "b": "world", "c": "foo bar"})

    def test_multiple_vars_with_one_invalid_raises(self):
        with pytest.raises(HTTPException) as exc_info:
            _validate_variables({"ok": "fine", "bad": "A" * 50_001})
        assert exc_info.value.status_code == 400
        assert "bad" in exc_info.value.detail

    def test_template_injection_error_mentions_variable_name(self):
        with pytest.raises(HTTPException) as exc_info:
            _validate_variables({"user_input": "try {{secret_var}}"})
        assert "user_input" in exc_info.value.detail


# ---------------------------------------------------------------------------
# End-to-end via TestClient
# ---------------------------------------------------------------------------

class TestRunRouteVariableValidation:

    def _post(self, client, variables, draft="Hello {{name}}."):
        payload = {
            "prompt_name": "main.prompts.test",
            "prompt_version": "1",
            "model_name": "databricks-test-model",
            "draft_template": draft,
            "variables": variables,
        }
        with (
            patch("server.routes.run.configure_mlflow"),
            patch("server.routes.run.get_experiment_id", return_value=None),
            patch("server.routes.run.call_model", new=AsyncMock(return_value=_model_result())),
            patch("server.routes.run.mlflow") as mock_mlflow,
        ):
            _mock_mlflow(mock_mlflow)
            return client.post("/api/run", json=payload)

    def test_oversized_variable_returns_400(self, client):
        resp = self._post(client, {"name": "A" * 50_001})
        assert resp.status_code == 400
        assert "name" in resp.json()["detail"]

    def test_template_injection_in_variable_returns_400(self, client):
        resp = self._post(client, {"name": "hello {{other}}"})
        assert resp.status_code == 400
        assert "name" in resp.json()["detail"]

    def test_valid_variable_succeeds(self, client):
        resp = self._post(client, {"name": "Alice"})
        assert resp.status_code == 200

    def test_empty_variables_succeeds(self, client):
        resp = self._post(client, {}, draft="No variables here.")
        assert resp.status_code == 200

    def test_variable_at_exact_limit_succeeds(self, client):
        resp = self._post(client, {"name": "A" * 50_000})
        assert resp.status_code == 200

    def test_validation_runs_before_call_model(self, client):
        """call_model should NOT be called if variable validation fails."""
        mock_call = AsyncMock(return_value=_model_result())
        payload = {
            "prompt_name": "main.prompts.test",
            "prompt_version": "1",
            "model_name": "databricks-test-model",
            "draft_template": "Hello {{name}}.",
            "variables": {"name": "{{injected}}"},
        }
        with (
            patch("server.routes.run.configure_mlflow"),
            patch("server.routes.run.get_experiment_id", return_value=None),
            patch("server.routes.run.call_model", new=mock_call),
            patch("server.routes.run.mlflow") as mock_mlflow,
        ):
            _mock_mlflow(mock_mlflow)
            resp = client.post("/api/run", json=payload)

        assert resp.status_code == 400
        mock_call.assert_not_called()

    def test_sql_injection_in_variable_is_valid(self, client):
        """SQL-like content is legitimate variable data — should not be rejected."""
        resp = self._post(client, {"name": "'; DROP TABLE users; --"})
        assert resp.status_code == 200

    def test_backslash_in_variable_is_valid(self, client):
        resp = self._post(client, {"name": r"C:\Users\john"})
        assert resp.status_code == 200
