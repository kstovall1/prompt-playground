"""Template variable parsing and rendering utilities."""

import re


def parse_template_variables(template: str) -> list[str]:
    """Extract {{variable}} patterns from a template string, preserving order."""
    pattern = r"\{\{(\s*\w+\s*)\}\}"
    matches = re.findall(pattern, template)
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
        result = re.sub(
            r"\{\{\s*" + re.escape(key) + r"\s*\}\}",
            lambda m, v=value: v,
            result,
        )
    return result
