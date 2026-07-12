# Aurum Recall — Build Plan (for Opus)

Phased so each phase ships something real and testable. Don't build ahead of the phase you're in.
The North Star: **the fastest way to prove this is a lens on memory that already exists** — an
agent's live `.claude/memory` store (a folder of typed Markdown + a `MEMORY.md` index). Point the
first build at a real store and it demos itself.

---

## Phase 0 — Extract the proof (½ day)
The concept is already validated by the live Aurum agent-memory store. Phase 0 is just making it
legible as a reference implementation.
- Copy the real store's shape (NOT its private contents) into `examples/` as a sanitized sample.
- Write `SPEC.md` conformance notes from the real files (frontmatter, index format, decay warnings).
- **Deliverable:** a sanitized `examples/memory/` that any test can run against.

## Phase 1 — Core library (2–3 days) → the OSS heartbeat
TypeScript first (widest agent-tooling reach), Python port second.
- `AurumRecall(dir)` with `recall / remember / update / forget / link / compact`.
- Frontmatter read/write (gray-matter or equiv), filename↔`name` invariant, index (`MEMORY.md`)
  read + regenerate + hand-curation preserved.
- Provenance: derive age from git history OR a `created`/`updated` frontmatter stamp; emit the
  staleness flag on recall past a threshold.
- **No embeddings.** Recall = load index + return candidate files; ranking is the caller's model.
- Tests against `examples/memory/`. **Deliverable:** `npm i aurum-recall` works; round-trips a store.

## Phase 2 — MCP server (2 days) → the adoption vector
- Wrap the library as an MCP server exposing the ops as tools.
- A Claude/Claude-Code user adds one MCP entry and their agent has durable, inspectable memory.
- Ship a 5-minute "give your agent memory" quickstart.
- **Deliverable:** a working MCP server + quickstart; this is the thing people actually install.

## Phase 3 — Optional ranker (1–2 days) → scale without selling out the model
- Pluggable `Ranker` interface. Default = model-scans-index (zero deps).
- Optional local scorer over descriptions for large stores (BM25-class, then optional embeddings).
- Embeddings are an **accelerator layer over the files**, never the store. Files stay canonical.
- **Deliverable:** stores with 1000s of memories recall fast; nothing about ownership changes.

## Phase 4 — The spectral/fractal lens (3–5 days) → the "wow" + the IP
- Render the store as a **spectral map**: memory `type` → color band; each memory → an addressable
  tile; zoom into a tile → it resolves to that fact + its `[[links]]` as the next layer (bounded,
  not infinite — see [[project_spectral_fractal_memory_qr]]).
- This *is* the fractal-QR / O(1)-addressing concept, realized as a view over the real graph — the
  cheap POC we identified: **a lens on the memory that already exists**, not a new storage engine.
- **Deliverable:** open a store, see it as a living map; click to read; the demo that sells it.

## Phase 5 — Shared memory for agent teams (the business) 
- Hosted sync so a fleet of agents shares ONE curated, consented store (the Aurum cluster
  use-case, productized). Conflict handling = git-style merge on files.
- Tiering: **OSS core + local = free and sovereign forever**; **hosted sync + team memory +
  the lens = paid**. Never charge for the facts; charge for scale, sync, and the view.
- **Deliverable:** the monetization tier — but only after 1–4 have real users.

---

## Positioning guardrails (don't drift)
- The moat is **sovereign, readable, self-curating memory**, not retrieval quality. If a phase
  starts making memory opaque or vendor-locked, it's wrong.
- Dogfood relentlessly: the Aurum fleet should run on `aurum-recall` itself as it's built. If it's
  good enough for the agents building it, that's the proof.
- Ship the MCP server (Phase 2) before anything fancy — adoption first, lens second, business third.

## Sequencing vs. the money clock
This is the **long-game infra bet** ([[project_infrastructure_pivot]]), not this-week revenue.
Run it in parallel with a near-term-income floor; don't let it starve the rent. Phases 1–2 are cheap
and compounding (credibility, distribution); Phase 5 is where money enters, and only with users.

*Build plan · Aurum Nebula LLC · 2026-07-12.*
