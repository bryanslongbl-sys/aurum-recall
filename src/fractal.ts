// Fractal Recall — a self-similar fractal-QR "brain" over a real memory store.
// The whole store is one QR (the top folder). Every data pixel of it IS a smaller QR — a memory
// (folder or file), colored by type. Zoom drills deeper (a pixel becomes its own QR of its links);
// click opens a pixel's contents; associative links eventually loop back to the source.
// Gemini's recursive drawMatrixRecursive engine, each module mapped to real memory. No deps.
// Realizes [[project_spectral_fractal_memory_qr]] — Bryan's visual/spatial digital brain.
import type { LensData } from "./lens.js";

export function renderFractal(data: LensData): string {
  // Escape `<` (so a body can't close the <script>) AND U+2028/U+2029, which are legal in JSON
  // but illegal inside a JS string literal — real prose contains them and would break the script.
  const json = JSON.stringify(data).replace(/</g, "\u003c").replace(new RegExp(String.fromCharCode(8232),"g"), "\u2028").replace(new RegExp(String.fromCharCode(8233),"g"), "\u2029");
  return TEMPLATE.replace("/*__DATA__*/", json);
}

const TEMPLATE = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Aurum Recall — Fractal Brain</title>
<style>
  :root { --user:#f2b134; --feedback:#f2547d; --project:#4d9dff; --reference:#3fd6a8; }
  html,body { margin:0; height:100%; background:#0b0d12; color:#e8ecf4; overflow:hidden;
    font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
  canvas { display:block; cursor:grab; } canvas:active { cursor:grabbing; }
  #hud { position:fixed; top:14px; left:14px; background:rgba(18,21,29,.9); border:1px solid #232838;
    border-radius:10px; padding:14px 16px; font-size:12px; line-height:1.7; pointer-events:none; max-width:250px; }
  #hud h1 { margin:0 0 6px; font-size:13px; letter-spacing:.16em; text-transform:uppercase; color:#cfd6e6; }
  #hud .muted { color:#8b94a7; } #hud .key { display:flex; align-items:center; gap:7px; }
  #hud .sw { width:11px; height:11px; border-radius:3px; }
  #tip { position:fixed; bottom:14px; left:14px; font-size:11px; color:#8b94a7; }
  #panel { position:fixed; right:0; top:0; bottom:0; width:340px; background:#12151d; border-left:1px solid #232838;
    padding:22px; overflow:auto; transform:translateX(100%); transition:transform .22s; }
  #panel.open { transform:translateX(0); }
  #panel .badge { display:inline-block; font-size:10px; letter-spacing:.1em; text-transform:uppercase; padding:3px 9px; border-radius:999px; font-weight:600; }
  #panel h2 { margin:12px 0 4px; font-size:19px; } #panel .desc { color:#8b94a7; font-size:13px; margin:0 0 12px; }
  #panel .meta { font-size:11px; color:#8b94a7; margin-bottom:14px; } #panel .stale { color:#f2b134; }
  #panel .body { font-size:13px; line-height:1.65; color:#d6dcea; white-space:pre-wrap; word-wrap:break-word; }
  #panel .body b { color:#fff; }
  #panel .chips { margin-top:16px; display:flex; flex-wrap:wrap; gap:7px; }
  #panel .chip { font-size:11px; padding:4px 10px; border:1px solid #232838; border-radius:999px; color:#bcc6db; cursor:pointer; background:#0e1119; }
  #panel .chip:hover { border-color:#4d9dff; color:#fff; } #panel .close { position:absolute; top:14px; right:16px; cursor:pointer; color:#8b94a7; font-size:20px; }
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="hud">
  <h1>Fractal Brain</h1>
  <div class="muted">zoom <span id="z">1.0</span>x · depth <span id="d">1</span></div>
  <div class="muted" id="sub"></div>
  <hr style="border:none;border-top:1px solid #232838;margin:9px 0">
  <div class="key"><span class="sw" style="background:var(--user)"></span>user</div>
  <div class="key"><span class="sw" style="background:var(--feedback)"></span>feedback</div>
  <div class="key"><span class="sw" style="background:var(--project)"></span>project</div>
  <div class="key"><span class="sw" style="background:var(--reference)"></span>reference</div>
</div>
<div id="tip">scroll to zoom deeper · drag to pan · a pixel is a memory — zoom into it, or click to open it</div>
<aside id="panel"><div class="close" onclick="closePanel()">×</div><div id="pbody"></div></aside>
<script>
const DATA = /*__DATA__*/;
const HUE = { user:"#f2b134", feedback:"#f2547d", project:"#4d9dff", reference:"#3fd6a8" };
const TYPES = ["user","feedback","project","reference"];
const cv = document.getElementById("c"), ctx = cv.getContext("2d");
const byName = new Map(DATA.nodes.map(n => [n.name, n]));
const ROOT = { name:"__root__", title:"Memory Core", type:null, description:DATA.nodes.length+" memories",
  body:"The whole store as one QR. Every pixel is a memory — zoom into one and it becomes its own QR of its links.",
  links: DATA.nodes.map(n=>n.name), ageDays:null, stale:false };

const childCache = new Map();
function childrenOf(node){ if(childCache.has(node.name)) return childCache.get(node.name);
  const c = (node.links||[]).map(l => byName.get(l)).filter(Boolean); childCache.set(node.name, c); return c; }

function hash(s){ let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } return h>>>0; }
function rng(seed){ let s=seed>>>0||1; return ()=>{ s=(Math.imul(s,1664525)+1013904223)>>>0; return s/4294967296; }; }
function rr(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

// ── per-node QR layout: children mapped to data pixels spread across the matrix; finder eyes are
//    geometric (corners), so the module grid stays dense and QR-like regardless of size. ──
const EYE = 0.30; // finder-eye size as a fraction of the QR side
function inEye(cx,cy){ return (cx<EYE&&cy<EYE) || (cx>1-EYE&&cy<EYE) || (cx<EYE&&cy>1-EYE); }
function oddNear(x){ let n=Math.round(x); if(n%2===0) n++; return n; }
const layoutCache = new Map();
function qrLayout(node){
  if(layoutCache.has(node.name)) return layoutCache.get(node.name);
  const kids = childrenOf(node).slice().sort((a,b)=> (TYPES.indexOf(a.type)-TYPES.indexOf(b.type)) || a.name.localeCompare(b.name));
  const QN = Math.max(9, Math.min(31, oddNear(Math.sqrt(Math.max(kids.length,1)/0.4) + 6)));
  const dataPos = [];
  for(let j=0;j<QN;j++) for(let i=0;i<QN;i++){ if(!inEye((i+0.5)/QN,(j+0.5)/QN)) dataPos.push([i,j]); }
  const childAt = new Map(), used = new Set();
  const stride = Math.max(1, Math.floor(dataPos.length / Math.max(kids.length,1)));
  kids.forEach((k,idx)=>{ const p = dataPos[(idx*stride) % dataPos.length]; const key = p[0]+","+p[1]; childAt.set(key,k); used.add(key); });
  const r = rng(hash(node.name)), struct = new Set();
  for(const p of dataPos){ const key = p[0]+","+p[1]; if(!used.has(key) && r()>0.55) struct.add(key); }
  const L = { QN, childAt, struct }; layoutCache.set(node.name, L); return L;
}
function drawEye(ex,ey,e){ ctx.fillStyle="#e6ebf5"; ctx.fillRect(ex,ey,e,e);
  ctx.fillStyle="#0b0d12"; ctx.fillRect(ex+e*0.16,ey+e*0.16,e*0.68,e*0.68);
  ctx.fillStyle="#e6ebf5"; ctx.fillRect(ex+e*0.32,ey+e*0.32,e*0.36,e*0.36); }

// ── recursive self-similar render ──
let hits=[], deepest=1;
const EXPAND = 150, MAXDEPTH = 7;
function drawQR(node, cx, cy, size, depth, visited){
  if(size < 8) return;
  if(cx+size/2<0 || cx-size/2>W || cy+size/2<0 || cy-size/2>H) return;
  if(depth+1>deepest) deepest = depth+1;
  const L = qrLayout(node), QN = L.QN, ms = size/QN, x0 = cx-size/2, y0 = cy-size/2, g = ms*0.09, w = ms-2*g;
  ctx.fillStyle = "#0c0e14"; rr(x0,y0,size,size,Math.min(size*0.03,10)); ctx.fill();
  hits.push({ cx, cy, size, node });
  const canRecurse = ms > EXPAND && depth < MAXDEPTH;
  for(let j=0;j<QN;j++) for(let i=0;i<QN;i++){
    if(inEye((i+0.5)/QN,(j+0.5)/QN)) continue;
    const key = i+","+j, mx = x0+i*ms, my = y0+j*ms, child = L.childAt.get(key);
    if(child){
      if(canRecurse && childrenOf(child).length && !visited.has(child.name)){
        const nv = new Set(visited); nv.add(node.name);
        drawQR(child, mx+ms/2, my+ms/2, ms*0.96, depth+1, nv);
      } else {
        ctx.fillStyle = HUE[child.type] || "#8895a5"; ctx.fillRect(mx+g,my+g,w,w);
        if(child.stale){ ctx.fillStyle = "#f2b13455"; ctx.fillRect(mx+g,my+g,w,w*0.22); }
        hits.push({ cx:mx+ms/2, cy:my+ms/2, size:ms, node:child });
      }
    } else if(L.struct.has(key)){
      ctx.fillStyle = node.type ? HUE[node.type]+"2b" : "#242c40"; ctx.fillRect(mx+g,my+g,w,w);
    }
  }
  const e = size*EYE;
  drawEye(x0, y0, e); drawEye(x0+size-e, y0, e); drawEye(x0, y0+size-e, e);
  if(size > 320 && node.type){ ctx.fillStyle = "#8b94a7dd"; ctx.font = "600 13px ui-monospace,monospace";
    ctx.textAlign = "center"; ctx.fillText(node.title, cx, y0+size+16); }
}

let W, H, DPR, inited=false, base=800, zoom=1, ox=0, oy=0;
function initView(){ base = Math.min(W-380, H) * 0.9; zoom = 1; ox = (W-360)/2; oy = H/2; }
function resize(){ DPR = window.devicePixelRatio||1; W = window.innerWidth; H = window.innerHeight;
  cv.width = W*DPR; cv.height = H*DPR; cv.style.width = W+"px"; cv.style.height = H+"px"; ctx.setTransform(DPR,0,0,DPR,0,0);
  if(!inited){ initView(); inited = true; } render(); }
function render(){ ctx.clearRect(0,0,W,H); ctx.fillStyle = "#0b0d12"; ctx.fillRect(0,0,W,H);
  hits = []; deepest = 1; drawQR(ROOT, ox, oy, base*zoom, 0, new Set());
  document.getElementById("z").textContent = zoom.toFixed(zoom<10?1:0);
  document.getElementById("d").textContent = deepest;
  document.getElementById("sub").textContent = DATA.nodes.length+" memories · "+DATA.generated; }

cv.addEventListener("wheel", (e)=>{ e.preventDefault(); const f = e.deltaY<0?1.14:1/1.14, oz = zoom;
  zoom = Math.max(0.5, Math.min(zoom*f, 6000));
  ox = e.clientX - (e.clientX-ox)*(zoom/oz); oy = e.clientY - (e.clientY-oy)*(zoom/oz); render(); }, { passive:false });
let drag=false, sx, sy, moved=0;
cv.addEventListener("mousedown", (e)=>{ drag=true; sx=e.clientX-ox; sy=e.clientY-oy; moved=0; });
window.addEventListener("mousemove", (e)=>{ if(!drag) return; ox=e.clientX-sx; oy=e.clientY-sy; moved++; render(); });
window.addEventListener("mouseup", (e)=>{ if(drag && moved<3) pick(e.clientX, e.clientY); drag=false; });
window.addEventListener("resize", resize);
function pick(px,py){ let best=null;
  for(const h of hits){ if(px>=h.cx-h.size/2 && px<=h.cx+h.size/2 && py>=h.cy-h.size/2 && py<=h.cy+h.size/2){ if(!best || h.size<best.size) best=h; } }
  if(best) openPanel(best.node); }

function esc(s){ return String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }
function renderBody(b){ let h=esc(b).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>");
  return h.replace(/\[\[([^\]]+)\]\]/g,(m,n)=> byName.has(n)? '<span class="chip" style="display:inline-block" onclick="openName(\''+n+'\')">'+esc(n)+'</span>' : "[["+esc(n)+"]]"); }
function openPanel(node){ const hue = node.type? (HUE[node.type]||"#8895a5") : "#8895a5";
  const chips = childrenOf(node).map(k=>'<div class="chip" onclick="openName(\''+k.name+'\')">'+esc(k.title)+'</div>').join("");
  const age = node.ageDays==null? "" : (node.stale? '<span class="stale">⚠ '+node.ageDays+'d — verify before trusting</span>' : node.ageDays+' days old');
  document.getElementById("pbody").innerHTML =
    (node.type? '<span class="badge" style="background:'+hue+'22;color:'+hue+'">'+node.type+'</span>':'')+
    '<h2>'+esc(node.title)+'</h2><p class="desc">'+esc(node.description)+'</p>'+
    '<div class="meta">'+age+'</div><div class="body">'+renderBody(node.body)+'</div>'+
    (chips? '<div class="chips">'+chips+'</div>':'');
  document.getElementById("panel").classList.add("open"); }
function openName(n){ const node = n==="__root__"? ROOT : byName.get(n); if(node) openPanel(node); }
function closePanel(){ document.getElementById("panel").classList.remove("open"); }
window.openName = openName; window.closePanel = closePanel;

resize();
</script>
</body>
</html>`;
