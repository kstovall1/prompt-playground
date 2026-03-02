"""Foundation Model / AI Gateway integration for running prompts."""

import logging
import aiohttp
from server.config import get_workspace_host, get_oauth_token, get_workspace_client

logger = logging.getLogger(__name__)


CHAT_TASKS = {
    "llm/v1/chat",
    "llm/v1/completions",
}

# Tasks to exclude (not useful for prompt testing)
EXCLUDE_TASKS = {
    "llm/v1/embeddings",
}

# Name patterns to exclude (internal/eval endpoints that clutter the list)
EXCLUDE_NAME_PATTERNS = [
    "internal-optimized-model-",
    "optimized-model-",
    "-v1-eval-",
    "-v3-eval-",
    "-mtpt-",
    "kie-",
]

# Foundation Model API endpoints always start with "databricks-"
FOUNDATION_PREFIX = "databricks-"


def _clean_state(state_str: str) -> str:
    """Normalize state strings like 'EndpointStateReady.READY' to 'READY'."""
    if "." in state_str:
        return state_str.split(".")[-1]
    return state_str


def list_serving_endpoints(filter_chat_only: bool = True) -> list[dict]:
    """List available serving endpoints, filtering for chat-compatible ones.

    Returns only endpoints whose task is llm/v1/chat or llm/v1/completions,
    or Foundation Model API endpoints (databricks-*), excluding embeddings.
    """
    w = get_workspace_client()
    endpoints = []
    try:
        for ep in w.serving_endpoints.list():
            task = str(ep.task) if hasattr(ep, "task") and ep.task else "unknown"
            state = "UNKNOWN"
            if ep.state:
                state = _clean_state(
                    str(ep.state.ready) if hasattr(ep.state, "ready") else str(ep.state)
                )

            # Skip excluded tasks
            if task.lower() in EXCLUDE_TASKS:
                continue

            # Skip noisy internal/eval endpoints
            if any(pat in ep.name for pat in EXCLUDE_NAME_PATTERNS):
                continue

            if filter_chat_only:
                is_foundation = ep.name.startswith(FOUNDATION_PREFIX)
                is_chat = task.lower() in CHAT_TASKS
                if not (is_foundation or is_chat):
                    continue

            endpoints.append({
                "name": ep.name,
                "state": state,
                "task": task,
            })
    except Exception as e:
        logger.error("Error listing serving endpoints: %s", e)

    # Sort: foundation models first, then alphabetical
    endpoints.sort(key=lambda x: (0 if x["name"].startswith(FOUNDATION_PREFIX) else 1, x["name"]))
    return endpoints


async def call_model(
    endpoint_name: str,
    prompt: str,
    max_tokens: int = 4096,
    temperature: float = 1.0,
    system_prompt: str | None = None,
) -> dict:
    """Call a Foundation Model endpoint with the rendered prompt."""
    host = get_workspace_host()
    token = get_oauth_token()
    url = f"{host}/serving-endpoints/{endpoint_name}/invocations"

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    timeout = aiohttp.ClientTimeout(total=120)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.post(url, json=payload, headers=headers) as response:
            if response.status != 200:
                error_text = await response.text()
                # Detect temperature-unsupported errors from external model proxies (e.g. Azure OpenAI)
                if response.status == 400 and "temperature" in error_text:
                    import re, json as _json
                    # Unwrap Databricks outer envelope and any nested JSON string to get the real message
                    search_text = error_text
                    try:
                        outer = _json.loads(error_text)
                        inner_str = outer.get("message", "")
                        inner = _json.loads(inner_str) if isinstance(inner_str, str) else inner_str
                        search_text = (
                            inner.get("error", {}).get("message", "")
                            or inner.get("message", "")
                            or error_text
                        )
                    except Exception:
                        pass
                    if "unsupported" in search_text.lower() or "not support" in search_text.lower():
                        match = re.search(r"Only the default \(([^)]+)\) value is supported", search_text, re.IGNORECASE)
                        hint = f" Try setting it to {match.group(1)}." if match else " Try adjusting temperature in settings."
                        raise Exception(f"This model doesn't support the current temperature value.{hint}")
                raise Exception(f"Model API error ({response.status}): {error_text}")
            data = await response.json()

    content = ""
    usage = {}
    if "choices" in data and len(data["choices"]) > 0:
        msg = data["choices"][0].get("message", {})
        content = msg.get("content", "")
    if "usage" in data:
        usage = data["usage"]

    return {
        "content": content,
        "model": data.get("model", endpoint_name),
        "usage": usage,
    }
