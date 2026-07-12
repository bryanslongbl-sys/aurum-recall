// The index (MEMORY.md): one line per memory, the always-in-context working set.
// upsertLine() touches only the one line for a file — preserving the hand-curated hooks on
// every other line. regenerate() is the nuclear rebuild from the files' own descriptions.

import type { IndexEntry, Memory } from "./types.js";

const LINE_RE = /^-\s*\[([^\]]+)\]\(([^)]+)\)\s*(?:[—–-]\s*(.*))?$/;

const stem = (file: string): string => file.replace(/\.md$/i, "");

/** Title-case a memory name, dropping the type prefix. e.g. "user_who_i_am" -> "Who I Am". */
export function titleFromName(name: string): string {
  const noType = name.replace(/^(user|feedback|project|reference)_/, "");
  return noType
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function parseIndex(content: string): IndexEntry[] {
  const out: IndexEntry[] = [];
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(LINE_RE);
    if (!m) continue;
    const [, title, file, hook] = m;
    out.push({ title, file, name: stem(file), hook: (hook ?? "").trim() });
  }
  return out;
}

export function formatLine(e: IndexEntry): string {
  return e.hook ? `- [${e.title}](${e.file}) — ${e.hook}` : `- [${e.title}](${e.file})`;
}

/**
 * Add or replace the index line for a single memory, leaving every other line untouched.
 * Returns the new MEMORY.md content.
 */
export function upsertLine(
  content: string,
  entry: IndexEntry,
): string {
  const lines = content.split(/\r?\n/);
  const newLine = formatLine(entry);
  let replaced = false;
  const out = lines.map((line) => {
    const m = line.match(LINE_RE);
    if (m && stem(m[2]) === entry.name) {
      replaced = true;
      return newLine;
    }
    return line;
  });
  if (!replaced) {
    // append, trimming a single trailing blank line for tidiness
    while (out.length && out[out.length - 1].trim() === "") out.pop();
    out.push(newLine);
  }
  return out.join("\n") + "\n";
}

/** Remove the index line for a memory. */
export function removeLine(content: string, name: string): string {
  const out = content
    .split(/\r?\n/)
    .filter((line) => {
      const m = line.match(LINE_RE);
      return !(m && stem(m[2]) === name);
    });
  return out.join("\n");
}

/** Full deterministic rebuild from the memories themselves (loses hand-curated hooks — use sparingly). */
export function regenerate(memories: Memory[]): string {
  const lines = memories
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((m) =>
      formatLine({
        title: titleFromName(m.name),
        file: `${m.name}.md`,
        name: m.name,
        hook: m.description,
      }),
    );
  return lines.join("\n") + "\n";
}
