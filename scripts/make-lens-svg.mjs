// Renders the demo store as a STATIC SVG poster for the README (no browser, no client JS).
// GitHub-safe: inline attributes only (no <style>/<filter>, which sanitizers strip); glow is
// faked with low-opacity halo rects. Run: node scripts/make-lens-svg.mjs [out.svg]
import { writeFileSync } from "node:fs";
import { nodes } from "./demo-nodes.mjs";

const TYPES = ["user", "feedback", "project", "reference"];
const HUE = { user: "#f2b134", feedback: "#f2547d", project: "#4d9dff", reference: "#3fd6a8" };
const W = 1200, H = 760, CX = 600, CY = 385;
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

// ── edges + degree ──
const byName = new Map(nodes.map((n) => [n.name, n]));
const seen = new Set(), edges = [];
for (const n of nodes) for (const l of n.links) {
  if (!byName.has(l)) continue;
  const k = [n.name, l].sort().join("|");
  if (seen.has(k)) continue;
  seen.add(k); edges.push([n.name, l]);
}
const degree = new Map(nodes.map((n) => [n.name, 0]));
for (const [a, b] of edges) { degree.set(a, degree.get(a) + 1); degree.set(b, degree.get(b) + 1); }

// ── radial layout: type sectors, hubs inward (mirrors the interactive lens) ──
const present = TYPES.filter((t) => nodes.some((n) => n.type === t));
const sector = 360 / present.length;
const pos = new Map();
present.forEach((type, ti) => {
  const mems = nodes.filter((n) => n.type === type)
    .sort((a, b) => (degree.get(b.name) - degree.get(a.name)) || a.name.localeCompare(b.name));
  const a0 = ti * sector, a1 = (ti + 1) * sector, pad = sector * 0.1;
  mems.forEach((n, i) => {
    const frac = mems.length === 1 ? 0.5 : i / (mems.length - 1);
    const ang = (a0 + pad + frac * (a1 - a0 - 2 * pad) - 90) * Math.PI / 180;
    const deg = degree.get(n.name);
    const r = 178 + (i % 2) * 66 + Math.max(0, 4 - deg) * 20;
    pos.set(n.name, { x: CX + Math.cos(ang) * r, y: CY + Math.sin(ang) * r, deg });
  });
});

// ── build svg ──
const parts = [];
parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif">`);
parts.push(`<rect width="${W}" height="${H}" fill="#0b0d12"/>`);
parts.push(`<circle cx="${CX}" cy="${CY}" r="330" fill="#141a2b" opacity="0.5"/>`);
parts.push(`<circle cx="${CX}" cy="${CY}" r="210" fill="#161d31" opacity="0.5"/>`);

for (const [a, b] of edges) {
  const pa = pos.get(a), pb = pos.get(b);
  parts.push(`<line x1="${pa.x.toFixed(1)}" y1="${pa.y.toFixed(1)}" x2="${pb.x.toFixed(1)}" y2="${pb.y.toFixed(1)}" stroke="#3a4463" stroke-width="1.2" opacity="0.4"/>`);
}
for (const n of nodes) {
  const p = pos.get(n.name), hue = HUE[n.type], size = 22 + Math.min(p.deg, 5) * 5;
  const halo = size + 16;
  parts.push(`<rect x="${(p.x - halo / 2).toFixed(1)}" y="${(p.y - halo / 2).toFixed(1)}" width="${halo}" height="${halo}" rx="10" fill="${hue}" opacity="0.13"/>`);
  parts.push(`<rect x="${(p.x - size / 2).toFixed(1)}" y="${(p.y - size / 2).toFixed(1)}" width="${size}" height="${size}" rx="6" fill="${hue}" stroke="${n.stale ? "#f2b134aa" : "#ffffff33"}" stroke-width="1.2"/>`);
  const label = n.title.length > 16 ? n.title.slice(0, 15) + "…" : n.title;
  parts.push(`<text x="${p.x.toFixed(1)}" y="${(p.y + size / 2 + 13).toFixed(1)}" fill="#8b94a7" font-size="10" text-anchor="middle" opacity="0.8">${esc(label)}</text>`);
}

// title + subtitle
parts.push(`<text x="40" y="52" fill="#cfd6e6" font-size="22" font-weight="600" letter-spacing="3">AURUM RECALL</text>`);
parts.push(`<text x="41" y="74" fill="#8b94a7" font-size="13" letter-spacing="1">spectral lens · ${nodes.length} memories · ${edges.length} links · color = memory type</text>`);

// legend
present.forEach((t, i) => {
  const x = 40 + i * 150, y = H - 34;
  parts.push(`<rect x="${x}" y="${y - 10}" width="12" height="12" rx="3" fill="${HUE[t]}"/>`);
  parts.push(`<text x="${x + 19}" y="${y}" fill="#8b94a7" font-size="12">${t}</text>`);
});

parts.push(`</svg>`);
const out = process.argv[2] || "assets/lens.svg";
writeFileSync(out, parts.join("\n"), "utf8");
console.error(`lens poster → ${out} (${nodes.length} nodes, ${edges.length} edges)`);
