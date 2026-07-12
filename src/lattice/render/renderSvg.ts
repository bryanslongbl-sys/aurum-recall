// Render a parent node's children as a color-coded square tile grid (spec §15).
import type { ContextMap, ContextNode } from "../model/ContextNode.js";
import { childrenOf, nodeById } from "../storage/loadContextMap.js";
import { colorHex, BLACK } from "./colors.js";
import { borderFor, freshnessOpacity } from "./borders.js";

const esc = (s: string) => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c] as string));

export interface RenderOptions {
  /** node whose children are rendered; defaults to the map root. */
  parentId?: string;
  tile?: number;   // tile size px
  gap?: number;    // gap px
  pad?: number;    // outer padding px
}

export function renderSvg(map: ContextMap, opts: RenderOptions = {}): string {
  const parentId = opts.parentId ?? map.root_id;
  const parent = nodeById(map, parentId);
  if (!parent) throw new Error(`node "${parentId}" not found`);
  const kids = childrenOf(map, parentId);
  const T = opts.tile ?? 150, G = opts.gap ?? 22, P = opts.pad ?? 40, HEAD = 64;
  const cols = Math.max(1, Math.ceil(Math.sqrt(kids.length)) || 1);
  const rows = Math.max(1, Math.ceil(kids.length / cols));
  const W = P * 2 + cols * T + (cols - 1) * G;
  const H = P + HEAD + rows * T + (rows - 1) * G + P;

  const out: string[] = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="ui-sans-serif,system-ui,Segoe UI,Roboto,sans-serif">`);
  out.push(`<rect width="${W}" height="${H}" fill="${BLACK}"/>`);
  out.push(`<text x="${P}" y="${P + 4}" fill="#cfd6e6" font-size="20" font-weight="700" letter-spacing="1">${esc(parent.label)}</text>`);
  out.push(`<text x="${P}" y="${P + 26}" fill="#8b94a7" font-size="12">${esc(parent.path)} · ${kids.length} nodes</text>`);

  kids.forEach((n, i) => {
    const gx = i % cols, gy = Math.floor(i / cols);
    const x = P + gx * (T + G), y = P + HEAD + gy * (T + G);
    out.push(tile(n, x, y, T));
  });

  out.push(`</svg>`);
  return out.join("\n");
}

function tile(n: ContextNode, x: number, y: number, T: number): string {
  const fill = colorHex(n.color);
  const b = borderFor(n.trust_level);
  const op = freshnessOpacity(n.staleness_score);
  const dash = b.dasharray ? ` stroke-dasharray="${b.dasharray}"` : "";
  const label = n.label.length > 16 ? n.label.slice(0, 15) + "…" : n.label;
  const inset = b.strokeWidth;
  const parts: string[] = [];
  parts.push(`<a href="${esc((n.marker?.payload) || ("ctx://" + n.id))}" data-node-id="${esc(n.id)}">`);
  parts.push(`<rect x="${x+inset/2}" y="${y+inset/2}" width="${T-inset}" height="${T-inset}" rx="10" fill="${fill}" fill-opacity="${op}" stroke="${b.stroke}" stroke-width="${b.strokeWidth}"${dash}/>`);
  // label
  parts.push(`<text x="${x+T/2}" y="${y+T-16}" text-anchor="middle" font-size="13" font-weight="600" fill="#0b0d12">${esc(label)}</text>`);
  // markers: 🔒 locked / sensitive, ⚠ stale, ● has children
  const badges: string[] = [];
  if (n.privacy_level === "locked" || n.privacy_level === "sensitive") badges.push("🔒");
  if (n.trust_level === "stale" || (n.staleness_score ?? 0) > 0.6) badges.push("⏾");
  if (n.trust_level === "disputed") badges.push("⚠");
  if (badges.length) parts.push(`<text x="${x+T-10}" y="${y+22}" text-anchor="end" font-size="15">${badges.join(" ")}</text>`);
  if ((n.children?.length ?? 0) > 0) parts.push(`<circle cx="${x+14}" cy="${y+14}" r="4" fill="#0b0d12" fill-opacity="0.55"/>`);
  parts.push(`</a>`);
  return parts.join("");
}
