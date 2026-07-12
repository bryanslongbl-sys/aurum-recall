// Aurum Nebula palette — color = context category (spec §16).
import type { ContextColor } from "../model/ContextNode.js";

export const PALETTE: Record<ContextColor, string> = {
  gold: "#D4AF37",
  blue: "#2563EB",
  green: "#10B981",
  red: "#EF4444",
  purple: "#7C3AED",
  white: "#F8FAFC",
  gray: "#64748B",
  cyan: "#00D4FF",
  orange: "#F59E0B",
};

export const CHARCOAL = "#111827";
export const BLACK = "#030712";

export function colorHex(c: ContextColor): string {
  return PALETTE[c] ?? PALETTE.gray;
}
