// Minimal frontmatter parser/serializer for the Aurum Recall subset.
// Deliberately NOT a general YAML engine — zero runtime deps keeps memory portable and the
// parser predictable. Handles: top-level `key: value`, and a nested `metadata:` block whose
// indented keys (type/created/updated) are flattened up.

export interface ParsedFrontmatter {
  name?: string;
  description?: string;
  type?: string;
  created?: string;
  updated?: string;
  body: string;
}

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function unquote(v: string): string {
  const t = v.trim();
  if (t.length >= 2 && ((t[0] === '"' && t.endsWith('"')) || (t[0] === "'" && t.endsWith("'")))) {
    return t.slice(1, -1);
  }
  return t;
}

export function parse(content: string): ParsedFrontmatter {
  const m = content.match(FM_RE);
  if (!m) return { body: content };
  const [, block, body] = m;
  const flat: Record<string, string> = {};
  for (const line of block.split(/\r?\n/)) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const kv = line.match(/^(\s*)([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    const [, , key, rawVal] = kv;
    const val = rawVal.trim();
    // `metadata:` is a container; its indented children (type/created/updated) flatten up.
    if (key === "metadata" && val === "") continue;
    if (val === "") continue; // container line with no scalar value
    flat[key] = unquote(val);
  }
  return {
    name: flat.name,
    description: flat.description,
    type: flat.type,
    created: flat.created,
    updated: flat.updated,
    body: (body ?? "").replace(/^\r?\n/, ""),
  };
}

/** Quote a scalar only if it contains characters that would break the minimal parser. */
function scalar(v: string): string {
  return /[:#'"]/.test(v) ? JSON.stringify(v) : v;
}

export function serialize(fm: {
  name: string;
  description: string;
  type: string;
  created?: string;
  updated?: string;
}, body: string): string {
  const lines = [
    "---",
    `name: ${fm.name}`,
    `description: ${scalar(fm.description)}`,
    "metadata:",
    `  type: ${fm.type}`,
  ];
  if (fm.created) lines.push(`  created: ${fm.created}`);
  if (fm.updated) lines.push(`  updated: ${fm.updated}`);
  lines.push("---", "", body.trim(), "");
  return lines.join("\n");
}

/** Extract [[links]] from a body. */
export function extractLinks(body: string): string[] {
  const out = new Set<string>();
  for (const m of body.matchAll(/\[\[([^\]]+)\]\]/g)) out.add(m[1].trim());
  return [...out];
}
