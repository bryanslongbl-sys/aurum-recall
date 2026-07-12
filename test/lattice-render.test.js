import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { loadContextMap, renderSvg } from "../dist/index.js";

const EX = join(dirname(fileURLToPath(import.meta.url)), "..", "examples", "aurum-memory.ctxmap.json");

test("root render contains child node ids + colors + links", () => {
  const map = loadContextMap(EX);
  const svg = renderSvg(map);
  assert.match(svg, /^<svg/);
  assert.ok(svg.includes('data-node-id="ctx_projects"'));
  assert.ok(svg.includes('data-node-id="ctx_health"'));
  assert.ok(svg.includes('href="ctx://ctx_projects"'));
  assert.ok(svg.includes("#2563EB")); // blue tile
  assert.ok(svg.includes("#D4AF37")); // gold border (user_verified)
});

test("subtree render scopes to a node's children", () => {
  const map = loadContextMap(EX);
  const svg = renderSvg(map, { parentId: "ctx_projects" });
  assert.ok(svg.includes('data-node-id="ctx_project_agentxray"'));
  assert.ok(!svg.includes('data-node-id="ctx_health"')); // health is not a child of projects
});
