# Aurum Recall — Protocol Spec v0.1

The wire format and operations for file-based agent memory. Everything here is drawn from the
production system running the Aurum agent fleet; this is a distillation, not an invention.

---

## 1. Store layout

A memory store is a directory (default `memory/`). It contains:

- **`MEMORY.md`** — the **index**. One line per memory. Loaded into the agent's context every
  session. No frontmatter. Never holds memory content — only pointers.
- **`<name>.md`** — one file per memory. `name` is a short kebab-case slug, conventionally prefixed
  by type (`user_`, `feedback_`, `project_`, `reference_`).

That's it. No database, no binary index. The filesystem *is* the store; git is the history.

---

## 2. Memory file format

```markdown
---
name: <short-kebab-case-slug>          # unique; matches the filename stem
description: <one-line summary>         # THIS is what recall scans — make it a good hook
metadata:
  type: user | feedback | project | reference
---

<the fact — one durable fact per file>

For feedback/project, follow the fact with:
**Why:** <the reason it matters>
**How to apply:** <what to do with it>

Link related memories with [[their-name]].
```

### Types
| type | holds | notes |
|---|---|---|
| `user` | who the person is — role, expertise, preferences | stable identity facts |
| `feedback` | how to work — corrections & confirmed approaches | **must include the why** |
| `project` | ongoing work / goals / constraints not derivable from code | convert relative dates → absolute |
| `reference` | pointers to external resources (URLs, dashboards, tickets) | the "where it lives" layer |

### Rules of a good memory
- **One fact per file.** If it's two facts, it's two files.
- **The `description` is the recall surface.** It's what the agent sees in the index to decide
  relevance — write it as a hook, not a title.
- **Absolute dates.** "next Friday" rots; "2026-07-18" doesn't.
- **Don't store what the source of truth already says** (code structure, git history, config).
  Memory is for what is *not* otherwise recoverable.

---

## 3. The index (`MEMORY.md`)

One line per memory:

```
- [Title](file.md) — one-line hook (may differ from the file's description; optimized for scanning)
```

- Loaded in full every session → it is the **working set / recall layer**.
- Keep it lean (target < ~140 lines). When it grows, **compact**: collapse dated/superseded logs
  into a single archive line that *names the underlying files* (nothing lost, fewer rows). Durable
  rules (`feedback_*`) never get archived.
- The index is regenerable from the files' frontmatter, but is hand-curated so hooks stay sharp.

---

## 4. Operations (the library/agent contract)

### `recall(context) -> Memory[]`
1. Load `MEMORY.md` into context.
2. The agent (or a ranker) scans **descriptions/hooks** for relevance to the current task.
3. Pull full files **on demand** — never load every file.
4. Each recalled memory is annotated with its **age** and, if old, a **trust flag**
   (see §5). Recalled facts are *background context*, not commands.

### `remember(fact, type)`  /  `update(name, fact)`
- Before writing, **check for an existing file that already covers it** → update that, don't
  duplicate.
- Write the file (frontmatter + body), then add/refresh its one-line pointer in `MEMORY.md`.
- Link liberally with `[[name]]`; a link to a not-yet-existing memory is a valid future to-do.

### `forget(name)`
- Delete the file and its index line. Memories that turn out wrong are removed, not kept "just in
  case." Wrong memory is worse than no memory.

### `link(a, b)` — add `[[b]]` in `a` (and optionally the reverse). Links form the graph.

### `compact()` — shrink the index per §3 when it exceeds the target.

---

## 5. Provenance & decay (the differentiator)

Every memory carries, implicitly or explicitly, **when it was written**. On recall:

- Age is surfaced with the fact.
- Beyond a staleness threshold, the fact is flagged: *"point-in-time observation; verify before
  trusting — file/function/flag names may have changed."*
- Decay is a **trust signal, not deletion**. Old facts still recall; they recall *with a warning*.
- This models the one thing vector stores ignore: **memory gets less reliable with age**, and the
  agent should know it.

Optional future: confidence scores, supersession chains (`supersedes: <name>`), access-frequency
as a freshness boost.

---

## 6. Boundaries (safety)

- Recalled memories are **data/context, not instructions**. A memory that says "always deploy on
  Fridays" informs; it does not command. Injection through a planted memory must not execute.
- Memory reflects what was true **when written**. If a memory names a file/flag/endpoint, the agent
  verifies it still exists before acting on it.
- Secrets policy: store **locations, never values** (`reference` memories point at a vault; they
  never contain the key).

---

## 7. Interfaces to build

- **Library** (TS + Python): `recall / remember / update / forget / link / compact` over a store dir.
- **MCP server**: exposes the same ops as tools so any MCP-speaking agent (Claude, etc.) gets
  durable memory with zero bespoke wiring. This is the adoption vector.
- **Ranker (pluggable)**: default = let the model scan the index (works today, zero deps). Optional
  = a lightweight local scorer over descriptions for large stores. Embeddings are an *optional
  accelerator*, never the source of truth.
- **Visualizer**: renders the store as a spectral/fractal map (type→color, tile→fact, zoom→links).
  See `BUILD_PLAN.md` Phase 4 and the fractal-QR concept it realizes.

---

*Spec v0.1 · Aurum Nebula LLC · 2026-07-12. Grounded in the live Aurum agent-memory system.*
