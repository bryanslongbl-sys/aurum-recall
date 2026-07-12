import { readFileSync } from "node:fs";
import type { ContextMap, ContextNode } from "../model/ContextNode.js";
import { validateContextMap } from "./validateContextMap.js";

export function loadContextMap(file: string): ContextMap {
  const raw = readFileSync(file, "utf8");
  let map: ContextMap;
  try { map = JSON.parse(raw); } catch (e) { throw new Error(`invalid JSON in ${file}: ${(e as Error).message}`); }
  const v = validateContextMap(map);
  if (!v.ok) throw new Error(`invalid context map:\n  - ${v.errors.join("\n  - ")}`);
  return map;
}

export function nodeById(map: ContextMap, id: string): ContextNode | undefined {
  return map.nodes.find(n => n.id === id);
}

export function childrenOf(map: ContextMap, id: string): ContextNode[] {
  const node = nodeById(map, id);
  if (!node) return [];
  // explicit children list wins; fall back to parent_id links
  const ids = node.children?.length ? node.children : map.nodes.filter(n => n.parent_id === id).map(n => n.id);
  return ids.map(c => nodeById(map, c)).filter((n): n is ContextNode => !!n);
}
