/**
 * Split a template string into system and user parts.
 * Mirrors the backend's parse_system_user() logic.
 *
 * Handles:
 * - XML-tagged strings: <system>...</system><user>...</user>
 * - Plain strings: (null, fullString)
 */
export function parseSystemUser(template: string): { system: string | null; user: string } {
  const sysMatch = template.match(/<system>([\s\S]*?)<\/system>/);
  const userMatch = template.match(/<user>([\s\S]*?)<\/user>/);
  if (sysMatch) {
    const system = sysMatch[1].trim();
    const user = userMatch
      ? userMatch[1].trim()
      : template.replace(/<system>[\s\S]*?<\/system>\s*/g, '').trim();
    return { system, user };
  }
  if (userMatch) {
    return { system: null, user: userMatch[1].trim() };
  }
  return { system: null, user: template };
}

/**
 * Build a template string from system and user parts.
 * Returns plain string when there's no system prompt.
 */
export function buildXmlTemplate(system: string, user: string): string {
  const s = system.trim();
  const u = user.trim();
  if (s) return `<system>\n${s}\n</system>\n\n<user>\n${u}\n</user>`;
  return u;
}

/**
 * Extract {{variable}} patterns from a template string, preserving order.
 * Matches the backend's parse_template_variables() logic.
 */
export function parseTemplateVariables(template: string): string[] {
  const matches = template.matchAll(/\{\{(\s*\w+\s*)\}\}/g);
  const seen = new Set<string>();
  const vars: string[] = [];
  for (const m of matches) {
    const v = m[1].trim();
    if (!seen.has(v)) {
      seen.add(v);
      vars.push(v);
    }
  }
  return vars;
}
