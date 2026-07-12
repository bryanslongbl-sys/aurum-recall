#!/usr/bin/env node
// aurum-recall-lens <store-dir> [out.html] — render a memory store as a self-contained
// interactive spectral map. No server, no CDN: open the output file in any browser.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { AurumRecall } from "./store.js";
import { renderLens, toLensData } from "./lens.js";

const dir = resolve(process.argv[2] ?? process.env.AURUM_RECALL_DIR ?? "./memory");
const out = resolve(process.argv[3] ?? "lens.html");

const store = new AurumRecall(dir);
const memories = store.all();
const today = new Date().toISOString().slice(0, 10);
writeFileSync(out, renderLens(toLensData(memories, today)), "utf8");
console.error(`aurum-recall lens → ${out}  (${memories.length} memories from ${dir})`);
