// Border style = trust level (spec §17). Brightness/opacity carries freshness (staleness_score).
import type { TrustLevel } from "../model/ContextNode.js";

export interface BorderStyle {
  stroke: string;
  strokeWidth: number;
  dasharray: string | null;
}

export const BORDERS: Record<TrustLevel, BorderStyle> = {
  user_verified: { stroke: "#D4AF37", strokeWidth: 4, dasharray: null },
  source_backed: { stroke: "#F8FAFC", strokeWidth: 3, dasharray: null },
  ai_inferred:   { stroke: "#CBD5E1", strokeWidth: 2, dasharray: "6 4" },
  disputed:      { stroke: "#EF4444", strokeWidth: 4, dasharray: "4 3" },
  stale:         { stroke: "#64748B", strokeWidth: 2, dasharray: "2 4" },
  unknown:       { stroke: "#94A3B8", strokeWidth: 2, dasharray: "3 3" },
};

export function borderFor(trust: TrustLevel): BorderStyle {
  return BORDERS[trust] ?? BORDERS.unknown;
}

/** Tile fill opacity from freshness: fresh = full, stale = faded (spec §4 brightness). */
export function freshnessOpacity(staleness?: number): number {
  const s = typeof staleness === "number" ? Math.min(1, Math.max(0, staleness)) : 0;
  return Number((1 - s * 0.75).toFixed(3)); // 1.0 fresh → 0.25 fully stale
}
