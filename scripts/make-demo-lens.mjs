// Generates a public-safe demo lens (HTML) from synthetic memories.
// Run: npm run build && node scripts/make-demo-lens.mjs [out.html]
import { renderLens } from "../dist/index.js";
import { writeFileSync } from "node:fs";
import { nodes } from "./demo-nodes.mjs";

const out = process.argv[2] || "demo-lens.html";
writeFileSync(out, renderLens({ generated: "demo", nodes }), "utf8");
console.error(`demo lens → ${out} (${nodes.length} synthetic memories)`);
