#!/usr/bin/env node
/**
 * Context Crystallization — 8x8 memory layer PoC (Aurum Recall / ContextQR)
 *
 * "When context windows fill, they do not disappear. They crystallize."
 *
 * Demonstrates the mechanism end-to-end, zero dependencies (node built-ins only):
 *   1. crystallize(ctx)  — compress a context window into a memory TILE (+ content hash)
 *   2. 64 tiles          — fill one 8x8 LAYER
 *   3. sealLayer(...)     — summary + Merkle root over tile hashes → sealed, verifiable layer
 *   4. renderSVG(layer)   — visual map: colour = context type, border = trust, opacity = freshness, 🔒 = private
 *   5. verify + tamper    — recompute the root; mutate one tile → the root changes (integrity proof)
 *
 * Run:  node poc/crystallization/crystallize.mjs
 * Out:  layer.json (the sealed layer)  ·  layer.svg (the visual 8x8 map)
 *
 * This is the public toy renderer. The production routing engine, compression heuristics,
 * and scoring logic are NOT here (open-core: preview public, engine private).
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const sha256 = (s) => createHash("sha256").update(s).digest("hex");

// ── Visual metadata (the map's grammar) ──────────────────────────────────────
const TYPE_COLOR = {
  identity: "#D4AF37", technical: "#3b82f6", health: "#10b981", legal: "#ef4444",
  creative: "#8b5cf6", business: "#f97316", active_task: "#06b6d4",
  archive: "#6b7280", source: "#e5e7eb",
};
const TRUST_BORDER = {
  user_verified: { color: "#D4AF37", width: 3, dash: "" },       // solid gold
  source_backed: { color: "#f8fafc", width: 2, dash: "" },       // white
  ai_inferred:   { color: "#94a3b8", width: 2, dash: "4 3" },    // dashed
  disputed:      { color: "#ef4444", width: 3, dash: "" },       // red
  stale:         { color: "#475569", width: 1, dash: "" },       // faded
};
const FRESH_OPACITY = { active: 1.0, current: 0.82, stale: 0.5 };

// ── 1. Crystallize a context window into a tile ──────────────────────────────
function crystallize(ctx, layerId, position) {
  const tile = {
    tile_id: `ctx_${String(ctx.n).padStart(6, "0")}`,
    layer: layerId,
    position, // [row, col]
    source: ctx.source ?? "conversation_window",
    type: ctx.type,
    summary: ctx.summary,
    key_entities: ctx.key_entities ?? [],
    trust_level: ctx.trust,
    freshness: ctx.freshness,
    privacy_level: ctx.privacy ?? "private",
    token_count_original: ctx.tokens_original ?? null,
    token_count_compressed: ctx.tokens_compressed ?? null,
    created_at: ctx.created_at ?? null,
    hash: null,
  };
  // Content hash of the compressed capsule — deterministic, so any edit changes it.
  tile.hash = sha256(JSON.stringify({
    type: tile.type, summary: tile.summary,
    entities: tile.key_entities, source: tile.source,
  }));
  return tile;
}

// ── 2/3. Merkle root over tile hashes, then seal the layer ───────────────────
function merkleRoot(hashes) {
  if (hashes.length === 0) return sha256("");
  let level = hashes.slice();
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i];
      const b = level[i + 1] ?? level[i]; // duplicate last if odd
      next.push(sha256(a + b));
    }
    level = next;
  }
  return level[0];
}

function sealLayer(layerId, tiles, nextLayer = null) {
  const topics = [...new Set(tiles.flatMap((t) => t.key_entities))].slice(0, 8);
  const root = merkleRoot(tiles.map((t) => t.hash));
  return {
    layer_id: layerId,
    tile_count: tiles.length,
    grid: [8, 8],
    summary: `Sealed layer of ${tiles.length} crystallized context tiles.`,
    dominant_topics: topics,
    child_tiles: tiles.map((t) => t.tile_id),
    next_layer: nextLayer,
    sealed: true,
    merkle_root: root,
    hash: root,
    tiles,
  };
}

// ── 4. Render the sealed layer as an 8x8 visual map ──────────────────────────
function renderSVG(layer) {
  const cell = 64, gap = 6, pad = 14, head = 30;
  const grid = 8 * cell + 7 * gap;
  const W = grid + 2 * pad;
  const H = grid + 2 * pad + head;
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="-apple-system,Segoe UI,sans-serif">`;
  out += `<rect width="${W}" height="${H}" fill="#0f172a"/>`;
  out += `<text x="${pad}" y="20" fill="#e2e8f0" font-size="14" font-weight="700">ContextQR · sealed 8×8 layer ${esc(layer.layer_id)}</text>`;
  out += `<text x="${W - pad}" y="20" fill="#64748b" font-size="10" text-anchor="end">merkle ${layer.merkle_root.slice(0, 12)}…</text>`;
  for (const t of layer.tiles) {
    const [r, c] = t.position;
    const x = pad + c * (cell + gap);
    const y = pad + head + r * (cell + gap);
    const color = TYPE_COLOR[t.type] ?? "#334155";
    const op = FRESH_OPACITY[t.freshness] ?? 0.82;
    const b = TRUST_BORDER[t.trust_level] ?? TRUST_BORDER.ai_inferred;
    out += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="8" fill="${color}" fill-opacity="${op}" stroke="${b.color}" stroke-width="${b.width}"${b.dash ? ` stroke-dasharray="${b.dash}"` : ""}/>`;
    // type initial (dark text on the tile)
    out += `<text x="${x + cell / 2}" y="${y + cell / 2 + 5}" fill="#0f172a" font-size="15" font-weight="800" text-anchor="middle" fill-opacity="0.55">${t.type[0].toUpperCase()}</text>`;
    if (t.privacy_level === "private") {
      out += `<text x="${x + cell - 12}" y="${y + 16}" font-size="11" text-anchor="middle">🔒</text>`;
    }
  }
  out += `</svg>`;
  return out;
}

// ── 5. Demo: fill, seal, render, verify, tamper ──────────────────────────────
function demoContext(n) {
  const types = Object.keys(TYPE_COLOR);
  const trusts = Object.keys(TRUST_BORDER);
  const fresh = ["active", "active", "current", "current", "stale"];
  const type = types[n % types.length];
  return {
    n,
    type,
    summary: `Compressed context window #${n} — ${type}.`,
    key_entities: ["ContextQR", "Aurum Recall", type],
    trust: trusts[n % trusts.length],
    freshness: fresh[n % fresh.length],
    privacy: n % 4 === 0 ? "private" : "family",
    tokens_original: 120000,
    tokens_compressed: 1800,
    created_at: "2026-07-14T00:00:00Z",
  };
}

function main() {
  // Fill an 8x8 layer from 64 crystallized context windows.
  const tiles = [];
  for (let i = 0; i < 64; i++) {
    const row = Math.floor(i / 8), col = i % 8;
    tiles.push(crystallize(demoContext(i + 1), "layer_001", [row, col]));
  }
  const layer = sealLayer("layer_001", tiles, "layer_002");

  writeFileSync(join(HERE, "layer.json"), JSON.stringify(layer, null, 2));
  writeFileSync(join(HERE, "layer.svg"), renderSVG(layer));

  // Verify: recompute the root from the tiles → must match the sealed root.
  const recomputed = merkleRoot(layer.tiles.map((t) => t.hash));
  const ok = recomputed === layer.merkle_root;

  // Tamper: mutate one tile's content → its hash → the root must change.
  const tampered = structuredClone(layer.tiles);
  tampered[42].summary = "EDITED after sealing";
  tampered[42].hash = sha256(JSON.stringify({
    type: tampered[42].type, summary: tampered[42].summary,
    entities: tampered[42].key_entities, source: tampered[42].source,
  }));
  const tamperedRoot = merkleRoot(tampered.map((t) => t.hash));

  console.log(`crystallized 64 context windows → 1 sealed 8x8 layer`);
  console.log(`  merkle_root : ${layer.merkle_root}`);
  console.log(`  verify      : ${ok ? "OK (root reproduces)" : "FAIL"}`);
  console.log(`  tamper test : ${tamperedRoot !== layer.merkle_root ? "DETECTED (root changed)" : "MISSED"}`);
  console.log(`  wrote       : layer.json, layer.svg`);
}

main();
