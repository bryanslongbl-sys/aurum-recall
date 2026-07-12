#!/usr/bin/env node
// contextqr CLI (spec §14): validate · render · qr · inspect · subtree. Zero CLI deps.
import { writeFileSync } from "node:fs";
import { loadContextMap, nodeById, childrenOf } from "./storage/loadContextMap.js";
import { validateContextMap } from "./storage/validateContextMap.js";
import { renderSvg } from "./render/renderSvg.js";
import { generateRootQr } from "./qr/generateRootQr.js";
import { latticeFromStore } from "./fromStore.js";

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}
function die(msg: string): never { console.error("✗ " + msg); process.exit(1); }

const [cmd, file, ...rest] = process.argv.slice(2);

async function main() {
  if (!cmd || cmd === "help" || cmd === "-h" || cmd === "--help") {
    console.log(`aurum-recall-lattice <command> [options]  —  ContextQR visual routing layer

  from-store <memory-dir> --out f.json       build a lattice from an Aurum Recall memory store
  validate   <map>                           check schema + parent/child consistency
  render     <map> [--parent ID] --out f.svg render a node's children as a tile map
  qr         <map> --out f.png [--url U]      generate the root QR
  inspect    <map> <nodeId>                   print a node's metadata + path
  subtree    <map> <nodeId> --out f.svg       render a selected node's children`);
    return;
  }
  if (!file) die("missing map file");

  if (cmd === "validate") {
    const raw = (await import("node:fs")).readFileSync(file, "utf8");
    const v = validateContextMap(JSON.parse(raw));
    if (v.ok) console.log("✓ valid context map");
    else die("invalid:\n  - " + v.errors.join("\n  - "));
    return;
  }

  if (cmd === "from-store" || cmd === "import") {
    const out = flag(rest, "--out") ?? die("from-store needs --out <file.json>");
    const map = latticeFromStore(file); // `file` here is a memory-store DIR
    writeFileSync(out, JSON.stringify(map, null, 2), "utf8");
    console.log(`✓ lattice from ${file} → ${out}  (${map.nodes.length} nodes)`);
    return;
  }

  const map = loadContextMap(file);

  if (cmd === "render") {
    const out = flag(rest, "--out") ?? die("render needs --out <file.svg>");
    const parentId = flag(rest, "--parent");
    writeFileSync(out, renderSvg(map, { parentId }), "utf8");
    console.log(`✓ rendered ${out}`);
    return;
  }
  if (cmd === "subtree") {
    const nodeId = rest[0] ?? die("subtree needs a nodeId");
    const out = flag(rest, "--out") ?? die("subtree needs --out <file.svg>");
    if (!nodeById(map, nodeId)) die(`node "${nodeId}" not found`);
    writeFileSync(out, renderSvg(map, { parentId: nodeId }), "utf8");
    console.log(`✓ rendered subtree of ${nodeId} → ${out}`);
    return;
  }
  if (cmd === "qr") {
    const out = flag(rest, "--out") ?? die("qr needs --out <file.png>");
    const url = flag(rest, "--url");
    const width = flag(rest, "--width");
    const r = await generateRootQr(map, out, { url, width: width ? Number(width) : undefined });
    console.log(`✓ root QR → ${r.out}  (payload: ${r.payload})`);
    return;
  }
  if (cmd === "inspect") {
    const nodeId = rest[0] ?? die("inspect needs a nodeId");
    const n = nodeById(map, nodeId) ?? die(`node "${nodeId}" not found`);
    const kids = childrenOf(map, nodeId).map(k => k.id);
    console.log(JSON.stringify({
      id: n.id, label: n.label, type: n.type, color: n.color, path: n.path,
      trust_level: n.trust_level, privacy_level: n.privacy_level, staleness_score: n.staleness_score,
      summary: n.summary, parent_id: n.parent_id ?? null, children: kids,
      source_paths: n.source_paths ?? [], marker: n.marker ?? null,
    }, null, 2));
    return;
  }
  die(`unknown command "${cmd}" — try: validate | render | qr | inspect | subtree`);
}

main().catch(e => die((e as Error).message));
