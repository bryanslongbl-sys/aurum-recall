// Fractal Recall — the spectral fractal-QR view over a real memory store.
// Fuses the recursive deep-zoom fractal-QR renderer (Gemini's engine idea) with the real memory
// graph (Aurum Recall's data layer): every memory is a deterministic QR "fingerprint" colored by
// type; zoom into one and it expands into its [[links]] as the next fractal layer (bounded).
// Self-contained HTML (canvas, no deps). See [[project_spectral_fractal_memory_qr]].
import type { LensData } from "./lens.js";

export function renderFractal(data: LensData): string {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return TEMPLATE.replace("/*__DATA__*/", json);
}

const TEMPLATE = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Aurum Recall — Fractal Lens</title>
<style>
  :root { --user:#f2b134; --feedback:#f2547d; --project:#4d9dff; --reference:#3fd6a8; }
  html,body { margin:0; height:100%; background:#0b0d12; color:#e8ecf4; overflow:hidden;
    font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
  canvas { display:block; cursor:grab; }
  canvas:active { cursor:grabbing; }
  #hud { position:fixed; top:14px; left:14px; background:rgba(18,21,29,.9); border:1px solid #232838;
    border-radius:10px; padding:14px 16px; font-size:12px; line-height:1.7; pointer-events:none; max-width:250px; }
  #hud h1 { margin:0 0 6px; font-size:13px; letter-spacing:.16em; text-transform:uppercase; color:#cfd6e6; }
  #hud .muted { color:#8b94a7; }
  #hud .key { display:flex; align-items:center; gap:7px; }
  #hud .sw { width:11px; height:11px; border-radius:3px; }
  #tip { position:fixed; bottom:14px; left:14px; font-size:11px; color:#8b94a7; }
  #panel { position:fixed; right:0; top:0; bottom:0; width:340px; background:#12151d; border-left:1px solid #232838;
    padding:22px; overflow:auto; transform:translateX(100%); transition:transform .22s; }
  #panel.open { transform:translateX(0); }
  #panel .badge { display:inline-block; font-size:10px; letter-spacing:.1em; text-transform:uppercase; padding:3px 9px; border-radius:999px; font-weight:600; }
  #panel h2 { margin:12px 0 4px; font-size:19px; }
  #panel .desc { color:#8b94a7; font-size:13px; margin:0 0 12px; }
  #panel .meta { font-size:11px; color:#8b94a7; margin-bottom:14px; }
  #panel .stale { color:#f2b134; }
  #panel .body { font-size:13px; line-height:1.65; color:#d6dcea; white-space:pre-wrap; word-wrap:break-word; }
  #panel .body b { color:#fff; }
  #panel .chips { margin-top:16px; display:flex; flex-wrap:wrap; gap:7px; }
  #panel .chip { font-size:11px; padding:4px 10px; border:1px solid #232838; border-radius:999px; color:#bcc6db; cursor:pointer; background:#0e1119; }
  #panel .chip:hover { border-color:#4d9dff; color:#fff; }
  #panel .close { position:absolute; top:14px; right:16px; cursor:pointer; color:#8b94a7; font-size:20px; }
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="hud">
  <h1>Fractal Recall</h1>
  <div class="muted">zoom <span id="z">1.00</span>x · depth <span id="d">1</span></div>
  <div class="muted" id="sub"></div>
  <hr style="border:none;border-top:1px solid #232838;margin:9px 0">
  <div class="key"><span class="sw" style="background:var(--user)"></span>user</div>
  <div class="key"><span class="sw" style="background:var(--feedback)"></span>feedback</div>
  <div class="key"><span class="sw" style="background:var(--project)"></span>project</div>
  <div class="key"><span class="sw" style="background:var(--reference)"></span>reference</div>
</div>
<div id="tip">scroll to zoom · drag to pan · zoom into a tile to open its links · click a tile to read</div>
<aside id="panel"><div class="close" onclick="closePanel()">×</div><div id="pbody"></div></aside>
<script>
const DATA = /*__DATA__*/;
const HUE = { user:"#f2b134", feedback:"#f2547d", project:"#4d9dff", reference:"#3fd6a8" };
const TYPES = ["user","feedback","project","reference"];
const cv = document.getElementById("c"), ctx = cv.getContext("2d");
const byName = new Map(DATA.nodes.map(n => [n.name, n]));

let W, H, DPR, inited = false;
function resize(){ DPR = window.devicePixelRatio || 1; W = window.innerWidth; H = window.innerHeight;
  cv.width = W*DPR; cv.height = H*DPR; cv.style.width = W+"px"; cv.style.height = H+"px"; ctx.setTransform(DPR,0,0,DPR,0,0);
  if(!inited){ initView(); inited = true; } render(); }

// ── top layout: type-clustered grid (spectral zones) ──
const nodes = DATA.nodes.slice().sort((a,b) => (TYPES.indexOf(a.type)-TYPES.indexOf(b.type)) || a.name.localeCompare(b.name));
const COLS = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
const STEP = 168; // world units between tile centers
nodes.forEach((n,i) => { n._wx = (i%COLS)*STEP; n._wy = Math.floor(i/COLS)*STEP; });
const spanW = COLS*STEP, spanH = Math.ceil(nodes.length/COLS)*STEP;

let zoom = 1, ox = 0, oy = 0;
function initView(){ zoom = Math.min((W-360)/(spanW+STEP), H/(spanH+STEP), 1) || 0.6;
  ox = (W-360)/2 - (spanW-STEP)/2*zoom; oy = H/2 - (spanH-STEP)/2*zoom; }

// ── deterministic QR fingerprint per memory ──
const FP = 9, fpCache = new Map();
function hash(s){ let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } return h>>>0; }
function rng(seed){ let s=seed>>>0||1; return ()=>{ s=(Math.imul(s,1664525)+1013904223)>>>0; return s/4294967296; }; }
function fpMatrix(name){
  if (fpCache.has(name)) return fpCache.get(name);
  const N=FP, r=rng(hash(name)), m=Array.from({length:N},()=>Array(N).fill(0));
  const eye=(ox,oy)=>{ for(let i=0;i<3;i++)for(let j=0;j<3;j++){ const on = i===0||i===2||j===0||j===2||(i===1&&j===1); m[ox+i][oy+j]= on?2:0; } };
  eye(0,0); eye(N-3,0); eye(0,N-3);
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){ const inEye=(i<3&&j<3)||(i>N-4&&j<3)||(i<3&&j>N-4); if(!inEye) m[i][j] = r()>0.44?1:0; }
  fpCache.set(name,m); return m;
}

function rr(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

let hits = [], deepest = 1;
function drawFingerprint(mem, cx, cy, size){
  const hue = HUE[mem.type] || "#8895a5", x0 = cx-size/2, y0 = cy-size/2, ms = size/FP;
  ctx.fillStyle = "#0e1017"; rr(x0,y0,size,size,size*0.09); ctx.fill();
  const m = fpMatrix(mem.name);
  for(let i=0;i<FP;i++) for(let j=0;j<FP;j++){ if(!m[i][j]) continue;
    ctx.fillStyle = m[i][j]===2 ? "#eef2fb" : hue;
    ctx.fillRect(x0+i*ms+ms*0.08, y0+j*ms+ms*0.08, ms*0.86, ms*0.86); }
  if(mem.stale){ ctx.strokeStyle="#f2b13488"; ctx.lineWidth=Math.max(1,size*0.012); rr(x0,y0,size,size,size*0.09); ctx.stroke(); }
  if(size>64){ ctx.fillStyle="#8b94a7"; ctx.font=Math.min(13,size*0.09)+"px ui-monospace,monospace"; ctx.textAlign="center";
    const t = mem.title.length>18? mem.title.slice(0,17)+"…" : mem.title; ctx.fillText(t, cx, y0+size+Math.min(15,size*0.11)); }
}

const EXPAND = 300, MAXDEPTH = 4;
function drawNode(mem, cx, cy, size, depth, visited){
  if(size < 3) return;
  if(cx+size/2 < 0 || cx-size/2 > W || cy+size/2 < 0 || cy-size/2 > H) return; // cull
  hits.push({ cx, cy, size, mem });
  if(depth+1 > deepest) deepest = depth+1;
  const kids = mem.links.map(l => byName.get(l)).filter(k => k && !visited.has(k.name));
  if(size > EXPAND && depth < MAXDEPTH && kids.length){
    // expand: container frame + label, recurse into linked memories as an inner grid
    const hue = HUE[mem.type] || "#8895a5", x0 = cx-size/2, y0 = cy-size/2;
    ctx.fillStyle = "rgba(14,17,23,.55)"; rr(x0,y0,size,size,size*0.06); ctx.fill();
    ctx.strokeStyle = hue+"66"; ctx.lineWidth = Math.max(1,size*0.006); rr(x0,y0,size,size,size*0.06); ctx.stroke();
    ctx.fillStyle = hue; ctx.font = "600 "+Math.min(15,size*0.05)+"px ui-monospace,monospace"; ctx.textAlign="left";
    ctx.fillText(mem.title, x0+size*0.06, y0+size*0.085);
    const n = kids.length, c = Math.ceil(Math.sqrt(n)), rws = Math.ceil(n/c);
    const titleH = size*0.14, pad = size*0.07;
    const areaX = x0+pad, areaY = y0+titleH, areaW = size-2*pad, areaH = size-titleH-pad;
    const cell = Math.min(areaW/c, areaH/rws);
    const startX = areaX + (areaW-cell*c)/2, startY = areaY + (areaH-cell*rws)/2;
    const nv = new Set(visited); nv.add(mem.name);
    kids.forEach((k,i) => { const gx=i%c, gy=Math.floor(i/c);
      drawNode(k, startX+cell*(gx+0.5), startY+cell*(gy+0.5), cell*0.8, depth+1, nv); });
  } else {
    drawFingerprint(mem, cx, cy, size);
  }
}

function render(){
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = "#0b0d12"; ctx.fillRect(0,0,W,H);
  hits = []; deepest = 1;
  const size = STEP*0.86*zoom;
  for(const n of nodes){ const cx = ox + n._wx*zoom, cy = oy + n._wy*zoom; drawNode(n, cx, cy, size, 0, new Set()); }
  document.getElementById("z").textContent = zoom.toFixed(2);
  document.getElementById("d").textContent = deepest;
  document.getElementById("sub").textContent = DATA.nodes.length + " memories · " + DATA.generated;
}

// ── interaction ──
cv.addEventListener("wheel", (e) => { e.preventDefault();
  const f = e.deltaY < 0 ? 1.12 : 1/1.12, oldz = zoom;
  zoom = Math.max(0.15, Math.min(zoom*f, 60));
  ox = e.clientX - (e.clientX-ox)*(zoom/oldz); oy = e.clientY - (e.clientY-oy)*(zoom/oldz); render(); }, { passive:false });
let drag=false, sx, sy, moved=0;
cv.addEventListener("mousedown", (e)=>{ drag=true; sx=e.clientX-ox; sy=e.clientY-oy; moved=0; });
window.addEventListener("mousemove", (e)=>{ if(!drag) return; const nx=e.clientX-sx, ny=e.clientY-sy; moved+=Math.abs(nx-ox)+Math.abs(ny-oy); ox=nx; oy=ny; render(); });
window.addEventListener("mouseup", (e)=>{ if(drag && moved<4) pick(e.clientX, e.clientY); drag=false; });
window.addEventListener("resize", resize);

function pick(px, py){
  let best=null;
  for(const h of hits){ if(px>=h.cx-h.size/2 && px<=h.cx+h.size/2 && py>=h.cy-h.size/2 && py<=h.cy+h.size/2){ if(!best || h.size<best.size) best=h; } }
  if(best) openPanel(best.mem);
}
function esc(s){ return s.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }
function renderBody(b){ let h=esc(b).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>");
  return h.replace(/\[\[([^\]]+)\]\]/g,(m,n)=> byName.has(n)? '<span class="chip" style="display:inline-block" onclick="goto(\''+n+'\')">'+esc(n)+'</span>' : "[["+esc(n)+"]]"); }
function openPanel(mem){
  const hue = HUE[mem.type] || "#8895a5";
  const chips = mem.links.filter(l=>byName.has(l)).map(l=>'<div class="chip" onclick="goto(\''+l+'\')">'+esc(byName.get(l).title)+'</div>').join("");
  const age = mem.ageDays==null? "" : (mem.stale? '<span class="stale">⚠ '+mem.ageDays+'d — verify before trusting</span>' : mem.ageDays+' days old');
  document.getElementById("pbody").innerHTML =
    '<span class="badge" style="background:'+hue+'22;color:'+hue+'">'+mem.type+'</span>'+
    '<h2>'+esc(mem.title)+'</h2><p class="desc">'+esc(mem.description)+'</p>'+
    '<div class="meta">'+age+'</div><div class="body">'+renderBody(mem.body)+'</div>'+
    (chips? '<div class="chips">'+chips+'</div>':'');
  document.getElementById("panel").classList.add("open");
}
function closePanel(){ document.getElementById("panel").classList.remove("open"); }
function goto(name){ const n = byName.get(name); if(!n) return;
  zoom = Math.min(6, 2.4); ox = (W-360)/2 - n._wx*zoom; oy = H/2 - n._wy*zoom; openPanel(n); render(); }
window.goto = goto; window.closePanel = closePanel;

resize();
</script>
</body>
</html>`;
