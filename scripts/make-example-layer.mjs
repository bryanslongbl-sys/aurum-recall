// Generate a synthetic 8×8 memory layer (64 crystallized context tiles) for the README hero.
// Public-safe (invented labels). Shows the spectrum of context colors + trust borders + freshness.
// Run: node scripts/make-example-layer.mjs [out.json]
import { writeFileSync } from "node:fs";

const COLORS = ["gold", "blue", "green", "red", "purple", "white", "gray", "cyan", "orange"];
const TYPE_OF = { gold: "identity", blue: "project", green: "health", red: "legal", purple: "creative", white: "source", gray: "archive", cyan: "task", orange: "business" };
const TRUST = ["user_verified", "source_backed", "ai_inferred", "disputed", "stale", "unknown"];
const PRIV = ["private", "private", "private", "sensitive", "locked"];
const WORDS = ["Auth", "Billing", "Onboarding", "Round 5", "Corpus", "Schema", "Pipeline", "Roster",
  "Ledger", "Intake", "Redline", "Vitals", "Scan", "Deploy", "Runbook", "Vault", "Index", "Router",
  "Metrics", "Consent", "Backup", "Digest", "Signal", "Lattice", "Voyage", "Combat", "Theme", "Node",
  "Recall", "Trace", "Budget", "Warrant", "Trials", "Report", "Session", "Kernel", "Weights", "Shard"];

const nodes = [];
const children = [];
for (let i = 0; i < 64; i++) {
  const color = COLORS[(i * 3 + Math.floor(i / 8)) % COLORS.length];
  const id = "ctx_t" + String(i).padStart(2, "0");
  children.push(id);
  const stale = i % 11 === 0;
  nodes.push({
    id, parent_id: "ctx_layer1", label: WORDS[i % WORDS.length] + " " + (Math.floor(i / WORDS.length) + 1),
    type: TYPE_OF[color], color, path: "/layer-1/" + id, summary: "A crystallized context tile.",
    children: [], trust_level: stale ? "stale" : TRUST[i % TRUST.length],
    staleness_score: stale ? 0.85 : (i % 7) / 20, privacy_level: PRIV[i % PRIV.length],
    marker: { kind: "datamatrix", payload: "ctx://" + id },
  });
}
nodes.unshift({
  id: "ctx_layer1", parent_id: null, label: "Layer 1 — 64 tiles sealed", type: "root", color: "gold",
  path: "/layer-1", summary: "One completed 8×8 context layer: 64 crystallized memory tiles.",
  children, trust_level: "user_verified", privacy_level: "private", staleness_score: 0,
  marker: { kind: "qr", payload: "ctx://ctx_layer1" },
});

const map = { version: "0.1.0", root_id: "ctx_layer1", title: "Aurum Recall — Example Layer", nodes };
const out = process.argv[2] || "examples/example-layer.ctxmap.json";
writeFileSync(out, JSON.stringify(map, null, 2), "utf8");
console.error(`example layer → ${out} (64 tiles)`);
