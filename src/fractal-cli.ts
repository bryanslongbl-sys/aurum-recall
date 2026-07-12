#!/usr/bin/env node
// aurum-recall-fractal <store-dir> [out.html] — render a memory store as the fractal-QR lens:
// each memory a spectral QR fingerprint; zoom into one to expand its [[links]] as the next layer.
// Self-contained HTML; open in any browser.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { AurumRecall } from "./store.js";
import { renderFractal } from "./fractal.js";
import { toLensData } from "./lens.js";

const dir = resolve(process.argv[2] ?? process.env.AURUM_RECALL_DIR ?? "./memory");
const out = resolve(process.argv[3] ?? "fractal.html");

const store = new AurumRecall(dir);
const memories = store.all();
const today = new Date().toISOString().slice(0, 10);
writeFileSync(out, renderFractal(toLensData(memories, today)), "utf8");
console.error(`aurum-recall fractal → ${out}  (${memories.length} memories from ${dir})`);
