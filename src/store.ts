// AurumRecall — the file-based memory store. See SPEC.md §4.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { extractLinks, parse, serialize } from "./frontmatter.js";
import {
  parseIndex,
  regenerate,
  removeLine,
  titleFromName,
  upsertLine,
} from "./memoryIndex.js";
import { ageDays, trustNote } from "./provenance.js";
import {
  MEMORY_TYPES,
  type IndexEntry,
  type Memory,
  type MemoryInput,
  type MemoryType,
  type RecallOptions,
  type RecalledMemory,
} from "./types.js";

const NAME_RE = /^[a-z0-9][a-z0-9_-]*$/;
const today = (): string => new Date().toISOString().slice(0, 10);

export interface StoreOptions {
  /** index filename inside the store dir. Default "MEMORY.md". */
  indexFile?: string;
  /** default staleness threshold in days. Default 30. */
  stalenessDays?: number;
  /** stamp created/updated dates in frontmatter on write. Default true. */
  stampDates?: boolean;
}

export class AurumRecall {
  readonly dir: string;
  private readonly indexFile: string;
  private readonly stalenessDays: number;
  private readonly stampDates: boolean;

  constructor(dir: string, opts: StoreOptions = {}) {
    this.dir = dir;
    this.indexFile = opts.indexFile ?? "MEMORY.md";
    this.stalenessDays = opts.stalenessDays ?? 30;
    this.stampDates = opts.stampDates ?? true;
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  private filePath(name: string): string {
    return join(this.dir, `${name}.md`);
  }
  private indexPath(): string {
    return join(this.dir, this.indexFile);
  }
  private readIndexRaw(): string {
    const p = this.indexPath();
    return existsSync(p) ? readFileSync(p, "utf8") : "";
  }

  // ── Recall (read) ─────────────────────────────────────────────────────────

  /** The working set: one entry per memory, scanned to decide relevance. */
  index(): IndexEntry[] {
    return parseIndex(this.readIndexRaw());
  }

  /** Load one memory by name, annotated with age + trust flag. */
  read(name: string, opts: RecallOptions = {}): RecalledMemory | null {
    const p = this.filePath(name);
    if (!existsSync(p)) return null;
    const fm = parse(readFileSync(p, "utf8"));
    const type = (fm.type as MemoryType) ?? "reference";
    const mem: Memory = {
      name,
      description: fm.description ?? "",
      type,
      body: fm.body,
      created: fm.created,
      updated: fm.updated,
      links: extractLinks(fm.body),
      file: p,
    };
    const threshold = opts.stalenessDays ?? this.stalenessDays;
    const age = ageDays(mem);
    return { ...mem, ageDays: age, stale: age != null && age > threshold, trustNote: trustNote(age, threshold) };
  }

  /** Load several memories on demand (the model picks names from index()). */
  recall(names: string[], opts: RecallOptions = {}): RecalledMemory[] {
    return names.map((n) => this.read(n, opts)).filter((m): m is RecalledMemory => m !== null);
  }

  /** Load every memory (for compaction, export, the visualizer). */
  all(opts: RecallOptions = {}): RecalledMemory[] {
    return readdirSync(this.dir)
      .filter((f) => f.endsWith(".md") && f !== this.indexFile)
      .map((f) => this.read(f.replace(/\.md$/i, ""), opts))
      .filter((m): m is RecalledMemory => m !== null);
  }

  // ── Write ─────────────────────────────────────────────────────────────────

  /** Create a new memory. Throws if one already exists — update() it instead (SPEC: don't duplicate). */
  remember(input: MemoryInput): Memory {
    this.validate(input);
    if (existsSync(this.filePath(input.name))) {
      throw new Error(`Memory "${input.name}" already exists — call update() instead of duplicating.`);
    }
    const stamp = this.stampDates ? today() : undefined;
    const content = serialize(
      { name: input.name, description: input.description, type: input.type, created: stamp, updated: stamp },
      input.body,
    );
    writeFileSync(this.filePath(input.name), content, "utf8");
    this.writeIndexLine(input);
    return this.read(input.name)!;
  }

  /** Update an existing memory in place; re-stamps `updated` and refreshes its index line. */
  update(name: string, patch: Partial<Omit<MemoryInput, "name">>): Memory {
    const cur = this.read(name);
    if (!cur) throw new Error(`Memory "${name}" not found.`);
    const next = {
      name,
      description: patch.description ?? cur.description,
      type: patch.type ?? cur.type,
      body: patch.body ?? cur.body,
      title: patch.title,
      hook: patch.hook,
    };
    this.validate(next);
    const content = serialize(
      {
        name,
        description: next.description,
        type: next.type,
        created: cur.created ?? (this.stampDates ? today() : undefined),
        updated: this.stampDates ? today() : cur.updated,
      },
      next.body,
    );
    writeFileSync(this.filePath(name), content, "utf8");
    this.writeIndexLine(next);
    return this.read(name)!;
  }

  /** Delete a memory and its index line. Wrong memory is worse than none. */
  forget(name: string): void {
    const p = this.filePath(name);
    if (existsSync(p)) unlinkSync(p);
    writeFileSync(this.indexPath(), removeLine(this.readIndexRaw(), name), "utf8");
  }

  /** Add a [[b]] link inside a's body (graph edge). No-op if already present. */
  link(a: string, b: string): void {
    const cur = this.read(a);
    if (!cur) throw new Error(`Memory "${a}" not found.`);
    if (cur.links.includes(b)) return;
    const body = `${cur.body.trimEnd()}\n\nRelated: [[${b}]]\n`;
    this.update(a, { body });
  }

  // ── Index maintenance ──────────────────────────────────────────────────────

  /** Rebuild MEMORY.md from the files (deterministic; loses hand-curated hooks — use sparingly). */
  regenerateIndex(): void {
    const mems = this.all();
    writeFileSync(this.indexPath(), regenerate(mems), "utf8");
  }

  /** Report index size against a target so the agent knows when to compact (SPEC §3). */
  compact(targetLines = 140): { lines: number; overTarget: boolean } {
    const lines = this.index().length;
    return { lines, overTarget: lines > targetLines };
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private writeIndexLine(input: MemoryInput): void {
    const entry: IndexEntry = {
      title: input.title ?? titleFromName(input.name),
      file: `${input.name}.md`,
      name: input.name,
      hook: input.hook ?? input.description,
    };
    writeFileSync(this.indexPath(), upsertLine(this.readIndexRaw(), entry), "utf8");
  }

  private validate(input: { name: string; description: string; type: MemoryType; body: string }): void {
    if (!NAME_RE.test(input.name)) {
      throw new Error(`Invalid name "${input.name}" — use a lowercase kebab/snake slug.`);
    }
    if (!MEMORY_TYPES.includes(input.type)) {
      throw new Error(`Invalid type "${input.type}" — one of ${MEMORY_TYPES.join(", ")}.`);
    }
    if (!input.description.trim()) throw new Error("description is required (it's the recall surface).");
    if (!input.body.trim()) throw new Error("body is required (the fact itself).");
  }
}
