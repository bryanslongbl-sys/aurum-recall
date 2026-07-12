// Validation: required fields, enum values, and parent/child consistency (spec §14 `validate`).
// Hand-rolled (zero extra deps) — the schema JSON in schemas/ documents the same contract.
import type { ContextMap, ContextNode } from "../model/ContextNode.js";

const COLORS = ["gold","blue","green","red","purple","white","gray","cyan","orange"];
const TRUST = ["user_verified","source_backed","ai_inferred","disputed","stale","unknown"];
const PRIVACY = ["public","private","sensitive","locked"];
const REQUIRED: (keyof ContextNode)[] = ["id","label","type","color","path","summary","trust_level","privacy_level"];

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateContextMap(map: unknown): ValidationResult {
  const errors: string[] = [];
  const m = map as ContextMap;
  if (!m || typeof m !== "object") return { ok: false, errors: ["map is not an object"] };
  if (!m.version) errors.push("missing map.version");
  if (!m.root_id) errors.push("missing map.root_id");
  if (!Array.isArray(m.nodes)) return { ok: false, errors: [...errors, "map.nodes must be an array"] };

  const ids = new Set<string>();
  for (const n of m.nodes) {
    const at = n && n.id ? `node "${n.id}"` : "a node";
    for (const f of REQUIRED) if (n[f] === undefined || n[f] === null || n[f] === "") errors.push(`${at}: missing "${String(f)}"`);
    if (n.id) { if (ids.has(n.id)) errors.push(`duplicate id "${n.id}"`); ids.add(n.id); }
    if (n.color && !COLORS.includes(n.color)) errors.push(`${at}: bad color "${n.color}"`);
    if (n.trust_level && !TRUST.includes(n.trust_level)) errors.push(`${at}: bad trust_level "${n.trust_level}"`);
    if (n.privacy_level && !PRIVACY.includes(n.privacy_level)) errors.push(`${at}: bad privacy_level "${n.privacy_level}"`);
    if (n.staleness_score !== undefined && (n.staleness_score < 0 || n.staleness_score > 1)) errors.push(`${at}: staleness_score out of [0,1]`);
  }

  if (m.root_id && !ids.has(m.root_id)) errors.push(`root_id "${m.root_id}" is not a node`);

  // parent/child consistency
  for (const n of m.nodes) {
    if (n.parent_id && !ids.has(n.parent_id)) errors.push(`node "${n.id}": parent_id "${n.parent_id}" does not exist`);
    for (const c of n.children ?? []) {
      if (!ids.has(c)) { errors.push(`node "${n.id}": child "${c}" does not exist`); continue; }
      const child = m.nodes.find(x => x.id === c)!;
      if (child.parent_id && child.parent_id !== n.id) errors.push(`node "${n.id}": child "${c}" points to a different parent ("${child.parent_id}")`);
    }
  }

  return { ok: errors.length === 0, errors };
}
