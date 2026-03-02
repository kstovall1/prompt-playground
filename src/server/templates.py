"""Template variable parsing and rendering utilities."""

import re


def _normalize_escapes(text: str) -> str:
    """Convert literal \\n and \\t escape sequences to actual whitespace characters.

    Some tools and APIs store templates with escape sequences as literal characters
    (e.g. backslash-n stored as two chars). Normalize them so templates render correctly.
    """
    return text.replace('\\n', '\n').replace('\\t', '\t')


def _template_to_str(template: str | list[dict]) -> str:
    """Flatten a template to a single string for variable extraction."""
    if isinstance(template, list):
        return " ".join(_normalize_escapes(m.get("content", "")) for m in template)
    return _normalize_escapes(template)


def parse_system_user(template: str | list[dict]) -> tuple[str | None, str]:
    """Split a template into (system_prompt, user_template).

    Handles three formats:
    - list[dict] (native MLflow chat format): extract by role
    - str with <system>...</system> XML tags: our storage convention
    - plain str: returns (None, template) — whole string is the user message
    """
    if isinstance(template, list):
        system = None
        user_parts = []
        for msg in template:
            role = msg.get("role", "")
            content = msg.get("content", "")
            if role == "system":
                system = content
            elif role == "user":
                user_parts.append(content)
        return system, "\n\n".join(user_parts) if user_parts else ""

    system_match = re.search(r"<system>(.*?)</system>", template, re.DOTALL)
    if system_match:
        system = system_match.group(1).strip()
        # Check for explicit <user> tag (new format); fall back to everything outside <system>
        user_match = re.search(r"<user>(.*?)</user>", template, re.DOTALL)
        if user_match:
            user = user_match.group(1).strip()
        else:
            user = re.sub(r"<system>.*?</system>\s*", "", template, flags=re.DOTALL).strip()
        return system, user

    # No system tag — check for a standalone <user> tag (unusual but handle it)
    user_match = re.search(r"<user>(.*?)</user>", template, re.DOTALL)
    if user_match:
        return None, user_match.group(1).strip()

    return None, template


def parse_template_variables(template: str | list[dict]) -> list[str]:
    """Extract {{variable}} patterns from a template string or messages list, preserving order."""
    pattern = r"\{\{(\s*\w+\s*)\}\}"
    matches = re.findall(pattern, _template_to_str(template))
    seen = set()
    variables = []
    for m in matches:
        var = m.strip()
        if var not in seen:
            seen.add(var)
            variables.append(var)
    return variables


def render_template(template: str, variables: dict[str, str]) -> str:
    """Substitute {{variable}} placeholders with provided values."""
    result = template
    for key, value in variables.items():
        # Use a lambda so the replacement value is treated as a literal string,
        # not a regex replacement pattern (which would interpret \1, \g<name>, etc.).
        result = re.sub(
            r"\{\{\s*" + re.escape(key) + r"\s*\}\}",
            lambda m, v=value: v,
            result,
        )
    return result
