# ContextQR — Concept Paper

**A recursive, visually encoded, hash-verifiable AI memory lattice.**
Aurum Nebula LLC · authored 2026-07-12

> Context windows do not expire. They crystallize into recursive memory tiles.

---

## The problem

When an AI agent's context window fills, the working context is discarded. Long-running agents
suffer **context death**: they forget what they were doing, lose provenance, and re-load giant
transcripts to recover. RAG helps, but it retrieves text *first* — it has no cheap way to *route*
to the right memory before spending tokens.

## The idea: context crystallization

When the working context approaches its token threshold, **compress it into a memory tile** —
a summary + metadata + source links + an embedding reference — instead of throwing it away.

```
Live context → reaches token threshold
  → compress to summary + metadata + source pointers
  → mint one Context Tile
  → place it in the next open slot of an 8×8 Layer Grid
```

**64 tiles = one sealed layer.** When a layer fills, it is summarized, hashed, indexed, and becomes
a single parent tile in the next recursive level.

```
64 tiles      → 1 layer
64 layers     → 1 volume
64 volumes    → 1 archive
```

Memory grows like geological strata: Layer 0 = active context, Layer 1 = recent working memory,
deeper layers = older, compressed, still-navigable history.

## Merkle-style provenance

Hashes chain upward, so any tampering is detectable and every summary stays tied to its source:

```
context window → tile hash
64 tile hashes → layer hash
64 layer hashes → volume hash
… → root memory hash
```

This answers: *did this memory change? was this layer edited? is this summary still tied to its
source? can this context be trusted?* — which matters most for legal, medical, financial, and
long-running personal-agent memory.

## Visual routing (before retrieval)

Every tile carries meaning visually so an agent (or human) can route *before* loading text:

- **color** = context type · **border** = trust level · **brightness** = freshness
- **corner marker** = urgency/risk · **pattern** = privacy class · **fade** = stale

```
Question → route the visual map → narrow the branch → search inside it → verify source → answer
```

Only the **root** is a literal scannable QR. Deeper tiles are recursive routers, not nested pixels.

## The moat

Not ordinary QR codes. The defensible combination is:

```
visual context routing
+ context crystallization (windows → tiles)
+ recursive 8×8 memory layers
+ trust / freshness / privacy metadata
+ hash-verifiable memory provenance
+ agent navigation before retrieval
```

## What is open vs. what is not

This repository is the **open-core technical preview**: the schema, the toy renderer, the CLI, an
example layer, and a working demo that builds a lattice from a real memory store. The
production-grade routing engine, memory/compression heuristics, trust-scoring logic, persistence,
cloud service, and product integrations are intentionally *not* here.

*Timestamped authorship: Aurum Nebula LLC, 2026-07-12.*
