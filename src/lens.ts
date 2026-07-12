// The spectral lens: render a memory store as a self-contained interactive HTML page.
// Color = memory type (a spectrum); each memory = a tile on a wheel; click a tile to "zoom" —
// it focuses and its [[links]] surface as the next layer (bounded, per BUILD_PLAN Phase 4 /
// the fractal-QR concept realized as a VIEW over the real graph).
import type { RecalledMemory } from "./types.js";

export interface LensNode {
  name: string;
  title: string;
  type: string;
  description: string;
  body: string;
  links: string[];
  ageDays: number | null;
  stale: boolean;
}

export interface LensData {
  generated: string;
  nodes: LensNode[];
}

export function toLensData(memories: RecalledMemory[], generated: string): LensData {
  return {
    generated,
    nodes: memories.map((m) => ({
      name: m.name,
      title: titleOf(m.name),
      type: m.type,
      description: m.description,
      body: m.body,
      links: m.links,
      ageDays: m.ageDays,
      stale: m.stale,
    })),
  };
}

function titleOf(name: string): string {
  return name
    .replace(/^(user|feedback|project|reference)_/, "")
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/** Returns a full, self-contained HTML document (data inlined; no external requests). */
export function renderLens(data: LensData): string {
  // Escape `<` so an embedded body can't break out of the <script> tag.
  const json = JSON.stringify(data).replace(/</g, "\u003c").replace(new RegExp(String.fromCharCode(8232),"g"), "\u2028").replace(new RegExp(String.fromCharCode(8233),"g"), "\u2029");
  return TEMPLATE.replace("/*__DATA__*/", json);
}

const TEMPLATE = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Aurum Recall — Spectral Lens</title>
<style>
  :root {
    --bg:#0b0d12; --panel:#12151d; --line:#232838; --text:#e8ecf4; --muted:#8b94a7;
    --user:#f2b134; --feedback:#f2547d; --project:#4d9dff; --reference:#3fd6a8;
  }
  * { box-sizing:border-box; }
  html,body { margin:0; height:100%; background:var(--bg); color:var(--text);
    font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif; overflow:hidden; }
  #wrap { display:flex; height:100%; }
  #stage { flex:1; position:relative; }
  svg { width:100%; height:100%; display:block; }
  .edge { stroke:#39415a; stroke-width:1; opacity:.35; transition:opacity .2s,stroke .2s; }
  .edge.hot { stroke:#c9d3e8; opacity:.9; stroke-width:1.5; }
  .tile { cursor:pointer; transition:transform .18s, opacity .2s; transform-box:fill-box; transform-origin:center; }
  .tile rect { transition:filter .2s; }
  .tile:hover { transform:scale(1.18); }
  .tile.dim { opacity:.18; }
  .tile.focus { transform:scale(1.5); }
  .label { font-size:9px; fill:var(--muted); pointer-events:none; text-anchor:middle; opacity:.65; }
  .label.dim { opacity:.08; }
  header { position:absolute; top:0; left:0; padding:16px 20px; pointer-events:none; }
  header h1 { margin:0; font-size:15px; letter-spacing:.14em; text-transform:uppercase; color:#cfd6e6; }
  header p { margin:2px 0 0; font-size:12px; color:var(--muted); }
  #legend { position:absolute; bottom:14px; left:20px; display:flex; gap:14px; font-size:11px; color:var(--muted); }
  #legend span { display:inline-flex; align-items:center; gap:6px; }
  #legend i { width:11px; height:11px; border-radius:3px; display:inline-block; }
  #panel { width:340px; background:var(--panel); border-left:1px solid var(--line); padding:22px;
    overflow:auto; transform:translateX(100%); transition:transform .25s; position:absolute; right:0; top:0; bottom:0; }
  #panel.open { transform:translateX(0); }
  #panel .badge { display:inline-block; font-size:10px; letter-spacing:.1em; text-transform:uppercase;
    padding:3px 9px; border-radius:999px; font-weight:600; }
  #panel h2 { margin:12px 0 4px; font-size:19px; }
  #panel .desc { color:var(--muted); font-size:13px; margin:0 0 14px; }
  #panel .meta { font-size:11px; color:var(--muted); margin-bottom:14px; }
  #panel .stale { color:#f2b134; }
  #panel .body { font-size:13.5px; line-height:1.65; color:#d6dcea; white-space:pre-wrap; word-wrap:break-word; }
  #panel .body b { color:#fff; }
  #panel .chips { margin-top:16px; display:flex; flex-wrap:wrap; gap:7px; }
  #panel .chip { font-size:11px; padding:4px 10px; border:1px solid var(--line); border-radius:999px;
    color:#bcc6db; cursor:pointer; background:#0e1119; }
  #panel .chip:hover { border-color:#4d9dff; color:#fff; }
  #panel .close { position:absolute; top:14px; right:16px; cursor:pointer; color:var(--muted); font-size:20px; }
  #panel .close:hover { color:#fff; }
  #hint { position:absolute; bottom:14px; right:20px; font-size:11px; color:var(--muted); }
</style>
</head>
<body>
<div id="wrap">
  <div id="stage">
    <header><h1>Aurum Recall</h1><p id="sub"></p></header>
    <svg id="svg" viewBox="-500 -500 1000 1000" preserveAspectRatio="xMidYMid meet"></svg>
    <div id="legend"></div>
    <div id="hint">click a tile to focus its layer · click empty space to reset</div>
  </div>
  <aside id="panel">
    <div class="close" onclick="clearFocus()">×</div>
    <div id="pbody"></div>
  </aside>
</div>
<script>
const DATA = /*__DATA__*/;
const TYPES = ["user","feedback","project","reference"];
const HUE = { user:"#f2b134", feedback:"#f2547d", project:"#4d9dff", reference:"#3fd6a8" };
const svg = document.getElementById("svg");
const NS = "http://www.w3.org/2000/svg";
const byName = new Map(DATA.nodes.map(n => [n.name, n]));

// ── edges (only links that resolve to a node; undirected, deduped) ──
const edgeSet = new Set(), edges = [];
for (const n of DATA.nodes) for (const l of n.links) {
  if (!byName.has(l)) continue;
  const key = [n.name, l].sort().join("|");
  if (edgeSet.has(key)) continue;
  edgeSet.add(key); edges.push([n.name, l]);
}
const degree = new Map(DATA.nodes.map(n => [n.name, 0]));
for (const [a,b] of edges) { degree.set(a, degree.get(a)+1); degree.set(b, degree.get(b)+1); }

// ── deterministic radial layout: types get angular sectors; hubs (more links) sit inward ──
const present = TYPES.filter(t => DATA.nodes.some(n => n.type === t));
const sector = 360 / present.length;
const pos = new Map();
present.forEach((type, ti) => {
  const mems = DATA.nodes.filter(n => n.type === type)
    .sort((a,b) => (degree.get(b.name)-degree.get(a.name)) || a.name.localeCompare(b.name));
  const a0 = ti*sector, a1 = (ti+1)*sector, pad = sector*0.12;
  mems.forEach((n, i) => {
    const frac = mems.length === 1 ? 0.5 : i/(mems.length-1);
    const ang = (a0+pad + frac*(a1-a0-2*pad) - 90) * Math.PI/180;
    const deg = degree.get(n.name);
    const r = 175 + (i%2)*70 + Math.max(0, 4-deg)*22;   // hubs inward, gentle 2-row stagger
    pos.set(n.name, { x:Math.cos(ang)*r, y:Math.sin(ang)*r, deg });
  });
});

// ── draw edges then tiles ──
const edgeEls = new Map();
for (const [a,b] of edges) {
  const pa = pos.get(a), pb = pos.get(b);
  const line = document.createElementNS(NS, "line");
  line.setAttribute("x1", pa.x); line.setAttribute("y1", pa.y);
  line.setAttribute("x2", pb.x); line.setAttribute("y2", pb.y);
  line.setAttribute("class", "edge");
  svg.appendChild(line);
  edgeEls.set([a,b].sort().join("|"), line);
}
const tileEls = new Map(), labelEls = new Map();
for (const n of DATA.nodes) {
  const p = pos.get(n.name), size = 20 + Math.min(p.deg,5)*4;
  const g = document.createElementNS(NS,"g"); g.setAttribute("class","tile");
  const rect = document.createElementNS(NS,"rect");
  rect.setAttribute("x", p.x-size/2); rect.setAttribute("y", p.y-size/2);
  rect.setAttribute("width", size); rect.setAttribute("height", size);
  rect.setAttribute("rx", 5); rect.setAttribute("fill", HUE[n.type] || "#888");
  rect.setAttribute("stroke", n.stale ? "#f2b13488" : "#ffffff22");
  rect.style.filter = "drop-shadow(0 0 6px " + (HUE[n.type]||"#888") + "66)";
  g.appendChild(rect);
  g.addEventListener("click", (e)=>{ e.stopPropagation(); focus(n.name); });
  svg.appendChild(g); tileEls.set(n.name, g);
  const lbl = document.createElementNS(NS,"text");
  lbl.setAttribute("x", p.x); lbl.setAttribute("y", p.y+size/2+11);
  lbl.setAttribute("class","label"); lbl.textContent = n.title.length>18? n.title.slice(0,17)+"…" : n.title;
  svg.appendChild(lbl); labelEls.set(n.name, lbl);
}

// ── focus (bounded zoom): highlight a node + its linked layer, open the panel ──
let current = null;
function neighbors(name){ const s=new Set([name]); for(const [a,b] of edges){ if(a===name)s.add(b); if(b===name)s.add(a);} return s; }
function focus(name){
  current = name;
  const near = neighbors(name);
  for (const [nm,g] of tileEls) g.classList.toggle("dim", !near.has(nm));
  for (const [nm,g] of tileEls) g.classList.toggle("focus", nm===name);
  for (const [nm,l] of labelEls) l.classList.toggle("dim", !near.has(nm));
  for (const [key,line] of edgeEls){ const [a,b]=key.split("|"); line.classList.toggle("hot", a===name||b===name); }
  openPanel(byName.get(name));
}
function clearFocus(){
  current=null;
  for (const g of tileEls.values()) g.classList.remove("dim","focus");
  for (const l of labelEls.values()) l.classList.remove("dim");
  for (const line of edgeEls.values()) line.classList.remove("hot");
  document.getElementById("panel").classList.remove("open");
}
svg.addEventListener("click", clearFocus);

function esc(s){ return s.replace(/[&<>]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }
function renderBody(b){
  let h = esc(b).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  h = h.replace(/\[\[([^\]]+)\]\]/g, (m,nm)=> byName.has(nm)
    ? '<span class="chip" style="display:inline-block;margin:0 2px" onclick="focus(\''+nm+'\')">'+esc(nm)+'</span>'
    : '[['+esc(nm)+']]');
  return h;
}
function openPanel(n){
  const hue = HUE[n.type] || "#888";
  const linkChips = n.links.filter(l=>byName.has(l))
    .map(l=>'<div class="chip" onclick="focus(\''+l+'\')">'+esc(byName.get(l).title)+'</div>').join("");
  const age = n.ageDays==null? "" : (n.stale
    ? '<span class="stale">⚠ '+n.ageDays+'d old — verify before trusting</span>'
    : n.ageDays+' days old');
  document.getElementById("pbody").innerHTML =
    '<span class="badge" style="background:'+hue+'22;color:'+hue+'">'+n.type+'</span>'
    + '<h2>'+esc(n.title)+'</h2>'
    + '<p class="desc">'+esc(n.description)+'</p>'
    + '<div class="meta">'+age+'</div>'
    + '<div class="body">'+renderBody(n.body)+'</div>'
    + (linkChips? '<div class="chips">'+linkChips+'</div>' : '');
  document.getElementById("panel").classList.add("open");
}

// ── chrome ──
document.getElementById("sub").textContent =
  DATA.nodes.length + " memories · " + edges.length + " links · generated " + DATA.generated;
document.getElementById("legend").innerHTML = present.map(t =>
  '<span><i style="background:'+HUE[t]+'"></i>'+t+'</span>').join("");
</script>
</body>
</html>`;
