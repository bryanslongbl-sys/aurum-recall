// Core types for Aurum Recall. See SPEC.md.

export type MemoryType = "user" | "feedback" | "project" | "reference";

export const MEMORY_TYPES: MemoryType[] = ["user", "feedback", "project", "reference"];

/** A single memory: one durable fact, one file. */
export interface Memory {
  /** kebab-case slug; equals the filename stem. */
  name: string;
  /** one-line hook — the recall surface scanned in the index. */
  description: string;
  type: MemoryType;
  /** the fact itself (Markdown). */
  body: string;
  /** ISO date the memory was first written, if stamped in frontmatter. */
  created?: string;
  /** ISO date the memory was last updated, if stamped. */
  updated?: string;
  /** [[names]] referenced in the body — the graph edges. */
  links: string[];
  /** absolute path to the file. */
  file: string;
}

/** A memory returned from recall, annotated with provenance/trust. */
export interface RecalledMemory extends Memory {
  /** days since the memory was last written; null if undeterminable. */
  ageDays: number | null;
  /** true when older than the staleness threshold. */
  stale: boolean;
  /** the "verify before trusting" flag, present only when stale. */
  trustNote?: string;
}

/** One line of the index (MEMORY.md) — the working set. */
export interface IndexEntry {
  /** display title inside the [brackets]. */
  title: string;
  /** the linked file, e.g. "user_who_i_am.md". */
  file: string;
  /** filename stem == memory name. */
  name: string;
  /** the one-line hook after the em dash. */
  hook: string;
}

export interface RecallOptions {
  /** age beyond which a memory is flagged stale. Default 30. */
  stalenessDays?: number;
}

/** Input to remember()/update(). */
export interface MemoryInput {
  name: string;
  description: string;
  type: MemoryType;
  body: string;
  /** optional index title; defaults to a Title-Cased name. */
  title?: string;
  /** optional index hook; defaults to description. */
  hook?: string;
}
