// Build a ContextQR lattice from a live Aurum Recall memory store — the bridge that unites the two
// layers: the store holds the memory, the lattice routes an agent through it.
import { AurumRecall } from "../store.js";
import type { ContextColor, ContextMap, ContextNode } from "./model/ContextNode.js";

const COLOR: Record<string, ContextColor> = { user: "gold", feedback: "purple", project: "blue", reference: "green" };
const sanitize = (s: string) => "ctx_" + String(s).replace(/[^a-zA-Z0-9_]/g, "_");
const title = (name: string) => name.replace(/^(user|feedback|project|reference|identity)_/, "")
  .split(/[_-]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(" ");

/** Root → type clusters (user/feedback/project/reference) → each memory as a leaf router. */
export function latticeFromStore(dir: string): ContextMap {
  const store = new AurumRecall(dir);
  const mems = store.all();
  const types = [...new Set(mems.map(m => m.type))].sort();
  const nodes: ContextNode[] = [];

  nodes.push({
    id: "ctx_root", parent_id: null, label: "Memory Core", type: "root", color: "gold", path: "/memory",
    summary: `${mems.length} memories across ${types.length} context types — route from here.`,
    children: types.map(t => "ctx_type_" + t), trust_level: "user_verified", privacy_level: "private",
    staleness_score: 0, marker: { kind: "qr", payload: "ctx://ctx_root" },
  });
  for (const t of types) {
    const inType = mems.filter(m => m.type === t);
    nodes.push({
      id: "ctx_type_" + t, parent_id: "ctx_root", label: t[0].toUpperCase() + t.slice(1), type: "cluster",
      color: COLOR[t] ?? "gray", path: "/memory/" + t, summary: `${inType.length} ${t} memories.`,
      children: inType.map(m => sanitize(m.name)), trust_level: "user_verified", privacy_level: "private",
      staleness_score: 0, marker: { kind: "datamatrix", payload: "ctx://ctx_type_" + t },
    });
  }
  for (const m of mems) {
    nodes.push({
      id: sanitize(m.name), parent_id: "ctx_type_" + m.type, label: title(m.name), type: m.type,
      color: COLOR[m.type] ?? "gray", path: "/memory/" + m.type + "/" + m.name, summary: m.description || m.name,
      children: [], source_paths: [m.file], trust_level: m.stale ? "stale" : "user_verified",
      staleness_score: m.stale ? 0.85 : (m.ageDays ? Math.min(0.5, m.ageDays / 120) : 0.02),
      privacy_level: "private", marker: { kind: "datamatrix", payload: "ctx://" + sanitize(m.name) },
    });
  }
  return {
    version: "0.1.0", root_id: "ctx_root", title: "Aurum Recall Memory Lattice",
    description: "Auto-generated from a live Aurum Recall memory store.", nodes,
  };
}
