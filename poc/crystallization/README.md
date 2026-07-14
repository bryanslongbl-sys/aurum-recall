# Context Crystallization — 8×8 layer PoC

> When context windows fill, they do not disappear. They **crystallize**.

A zero-dependency proof-of-concept for the crystallization mechanism behind ContextQR / the Aurum Memory Lattice. It shows, end to end, how a long-running agent's context turns into a compressed, navigable, **hash-verifiable** memory structure.

## Run
```bash
node poc/crystallization/crystallize.mjs
# → layer.json  (the sealed 8×8 layer)
# → layer.svg   (the visual map)
```
No install, no build — node built-ins only.

## The mechanism
1. **Crystallize** — when an agent's context window fills, compress it into a *tile*: a capsule with a summary, key entities, trust/freshness/privacy metadata, token counts, and a content **hash**.
2. **Fill a layer** — 64 tiles = one **8×8 layer**.
3. **Seal** — generate a layer summary and a **Merkle root** over the 64 tile hashes. The layer is now sealed and verifiable.
4. **Recurse** — layers hash-chain into volumes, volumes into an archive, all mapping back to a root index. (`tile → layer → volume → archive → root`.)

## The map's grammar (visual metadata)
| Channel | Encodes |
|---|---|
| **Colour** | context type — identity (gold), technical (blue), health (green), legal (red), creative (purple), business (orange), active-task (cyan), archive (gray), source (white) |
| **Border** | trust — solid gold = user-verified · white = source-backed · dashed = AI-inferred · red = disputed · faded = stale |
| **Opacity** | freshness — active / current / stale |
| **🔒** | private / sensitive |

*Route before you retrieve:* an agent reads the map, picks the branch, and pulls only the tiles it needs — instead of loading everything.

## Why the Merkle root matters
The sealed root lets any agent verify **whether memory it's about to trust has been changed** — a tile edited after sealing, a summary that no longer matches its source, stale vs. verified state. The PoC proves it: it recomputes the root (reproduces), then mutates one tile and shows the root changes (`tamper test: DETECTED`). This is what makes the lattice trustworthy for legal, medical, business, and long-horizon agent work.

## Schemas
See `layer.json` for a full sealed layer. Tile shape:
```json
{
  "tile_id": "ctx_000042", "layer": "layer_001", "position": [5, 2],
  "type": "technical", "summary": "…", "key_entities": ["…"],
  "trust_level": "user_verified", "freshness": "active", "privacy_level": "private",
  "token_count_original": 120000, "token_count_compressed": 1800,
  "hash": "sha256…"
}
```

## Scope (open-core)
This is the **public toy renderer + schema demo**. The production routing engine, compression heuristics, scoring logic, persistence, and agent-memory integration are the private, commercial layer — not in this repo.
