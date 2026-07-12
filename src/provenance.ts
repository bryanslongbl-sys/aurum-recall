// Trust decay: a memory gets less reliable with age, and the agent should be told so.
import { statSync } from "node:fs";
import type { Memory } from "./types.js";

/**
 * Days since a memory was last written. Prefers the frontmatter `updated`/`created` stamp
 * (portable, survives copies); falls back to file mtime. Returns null if undeterminable.
 * (Git commit time is a more robust source — see BUILD_PLAN Phase 1 — left as an opt-in
 * enhancement to avoid spawning git per file.)
 */
export function ageDays(m: Memory, now: number = Date.now()): number | null {
  const stamp = m.updated ?? m.created;
  let ms: number;
  if (stamp) {
    ms = Date.parse(stamp);
  } else {
    try {
      ms = statSync(m.file).mtimeMs;
    } catch {
      return null;
    }
  }
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.floor((now - ms) / 86_400_000));
}

/** The "verify before trusting" flag, present only past the threshold. */
export function trustNote(age: number | null, thresholdDays: number): string | undefined {
  if (age == null || age <= thresholdDays) return undefined;
  return `Written ${age} days ago — a point-in-time observation, not live state. ` +
    `Verify any file, function, flag, or endpoint it names still exists before acting on it.`;
}
