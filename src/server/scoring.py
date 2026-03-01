"""Built-in LLM-as-judge scoring for prompt evaluation.

Contains the default quality scorer that rates model responses on a 1.0-5.0 scale
via a direct HTTP call to a Databricks serving endpoint.
"""

import logging
import requests
from mlflow.genai.scorers import Scorer
from mlflow.entities import Feedback
from server.config import get_workspace_host, get_oauth_token

logger = logging.getLogger(__name__)

JUDGE_PROMPT = """You are evaluating the quality of an AI-generated response to a prompt.

Prompt sent to the model:
{rendered_prompt}

Model response:
{response}

Score the response on a scale of 1.0 to 5.0 where:
1.0 = Poor: off-topic, generic, or unhelpful
2.0 = Below average: some relevance but misses the mark
3.0 = Average: adequate but not impressive
4.0 = Good: relevant, specific, and useful
5.0 = Excellent: highly relevant, specific, creative, and immediately usable

Respond in this exact format:
SCORE: <number>
RATIONALE: <one sentence>"""


def score_response_sync(rendered_prompt: str, response: str, model_name: str, temperature: float = 0.0) -> tuple[float | None, str | None]:
    """Synchronous LLM-as-judge scoring via direct HTTP call."""
    try:
        host = get_workspace_host()
        token = get_oauth_token()
        url = f"{host}/serving-endpoints/{model_name}/invocations"
        judge_input = JUDGE_PROMPT.format(rendered_prompt=rendered_prompt, response=response)
        payload = {
            "messages": [{"role": "user", "content": judge_input}],
            "max_tokens": 150,
            "temperature": temperature,
        }
        resp = requests.post(
            url,
            json=payload,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            timeout=30,
        )
        resp.raise_for_status()
        text = resp.json()["choices"][0]["message"]["content"].strip()
        score = None
        rationale = None
        for line in text.split("\n"):
            if line.startswith("SCORE:"):
                try:
                    score = float(line.replace("SCORE:", "").strip())
                except ValueError:
                    pass
            elif line.startswith("RATIONALE:"):
                rationale = line.replace("RATIONALE:", "").strip()
        return score, rationale
    except Exception as e:
        logger.warning("Judge scoring failed: %s", e)
        return None, None


class QualityScorer(Scorer):
    """LLM-as-judge scorer that rates prompt responses on a 1.0-5.0 scale."""

    name: str = "response_quality"
    judge_model: str = ""
    judge_temperature: float = 0.0

    def __call__(self, inputs=None, outputs=None, expectations=None, trace=None) -> Feedback:
        request = inputs.get("request", "") if isinstance(inputs, dict) else ""
        response = outputs.get("response", "") if isinstance(outputs, dict) else str(outputs or "")
        score, rationale = score_response_sync(request, response, self.judge_model, self.judge_temperature)
        return Feedback(
            name="response_quality",
            value=score,
            rationale=rationale,
        )
