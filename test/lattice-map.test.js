import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { loadContextMap, nodeById, childrenOf, validateContextMap } from "../dist/index.js";

const EX = join(dirname(fileURLToPath(import.meta.url)), "..", "examples", "aurum-memory.ctxmap.json");

test("example map validates", () => {
  const map = loadContextMap(EX);
  assert.equal(map.root_id, "ctx_root");
  assert.equal(validateContextMap(map).ok, true);
});

test("inspect: nodeById + childrenOf", () => {
  const map = loadContextMap(EX);
  const n = nodeById(map, "ctx_project_contextqr");
  assert.ok(n);
  assert.equal(n.color, "blue");
  const kids = childrenOf(map, "ctx_projects").map(k => k.id);
  assert.ok(kids.includes("ctx_project_contextqr"));
  assert.ok(kids.includes("ctx_project_agentxray"));
});

test("validation catches a dangling child + bad enum", () => {
  const bad = {
    version: "0.1.0", root_id: "r", title: "t",
    nodes: [
      { id: "r", label: "R", type: "root", color: "gold", path: "/", summary: "s", trust_level: "user_verified", privacy_level: "private", children: ["missing"] },
      { id: "x", label: "X", type: "t", color: "chartreuse", path: "/x", summary: "s", trust_level: "user_verified", privacy_level: "private" },
    ],
  };
  const v = validateContextMap(bad);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some(e => /child "missing"/.test(e)));
  assert.ok(v.errors.some(e => /bad color/.test(e)));
});

test("validation catches parent/child mismatch", () => {
  const bad = {
    version: "0.1.0", root_id: "r", title: "t",
    nodes: [
      { id: "r", label: "R", type: "root", color: "gold", path: "/", summary: "s", trust_level: "user_verified", privacy_level: "private", children: ["a"] },
      { id: "a", label: "A", type: "t", color: "blue", path: "/a", summary: "s", trust_level: "user_verified", privacy_level: "private", parent_id: "someone_else" },
    ],
  };
  assert.equal(validateContextMap(bad).ok, false);
});
