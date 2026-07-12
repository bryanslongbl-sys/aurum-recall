// Generates the fractal-QR lens from synthetic demo memories (public-safe).
// Run: npm run build && node scripts/make-fractal-demo.mjs [out.html]
import { renderFractal } from "../dist/index.js";
import { writeFileSync } from "node:fs";
import { nodes } from "./demo-nodes.mjs";

const out = process.argv[2] || "fractal-demo.html";
writeFileSync(out, renderFractal({ generated: "demo", nodes }), "utf8");
console.error(`fractal demo → ${out} (${nodes.length} synthetic memories)`);
