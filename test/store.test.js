// Tests run against the compiled library (npm run build first). Plain ESM + node:test — no deps.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AurumRecall, parseFrontmatter, extractLinks } from "../dist/index.js";

function freshStoreFromExamples() {
  const dir = mkdtempSync(join(tmpdir(), "aurum-recall-"));
  cpSync(new URL("../examples/memory/", import.meta.url), dir, { recursive: true });
  return dir;
}

test("frontmatter round-trips the subset", () => {
  const fm = parseFrontmatter(
    "---\nname: x\ndescription: a hook\nmetadata:\n  type: project\n---\n\nbody here [[y]]\n",
  );
  assert.equal(fm.name, "x");
  assert.equal(fm.description, "a hook");
  assert.equal(fm.type, "project");
  assert.match(fm.body, /body here/);
  assert.deepEqual(extractLinks(fm.body), ["y"]);
});

test("index() reads the working set", () => {
  const dir = freshStoreFromExamples();
  try {
    const store = new AurumRecall(dir);
    const idx = store.index();
    assert.equal(idx.length, 4);
    assert.ok(idx.find((e) => e.name === "feedback_no_auto_deploys"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("read() loads + annotates a memory", () => {
  const dir = freshStoreFromExamples();
  try {
    const store = new AurumRecall(dir);
    const m = store.read("feedback_no_auto_deploys");
    assert.ok(m);
    assert.equal(m.type, "feedback");
    assert.deepEqual(m.links, ["project_launch_q3"]);
    assert.equal(typeof m.stale, "boolean");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("remember() creates a file + index line, and rejects duplicates", () => {
  const dir = freshStoreFromExamples();
  try {
    const store = new AurumRecall(dir);
    store.remember({
      name: "project_new_thing",
      description: "a new tracked project",
      type: "project",
      body: "Do the new thing. Relates to [[project_launch_q3]].",
    });
    assert.ok(store.read("project_new_thing"));
    assert.ok(store.index().find((e) => e.name === "project_new_thing"));
    assert.throws(() =>
      store.remember({ name: "project_new_thing", description: "dup", type: "project", body: "x" }),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("update() edits in place and refreshes the index line; forget() removes both", () => {
  const dir = freshStoreFromExamples();
  try {
    const store = new AurumRecall(dir);
    store.update("project_launch_q3", { description: "beta slipped to 2026-10-01" });
    assert.match(store.read("project_launch_q3").description, /2026-10-01/);
    assert.match(store.index().find((e) => e.name === "project_launch_q3").hook, /2026-10-01/);

    store.forget("project_launch_q3");
    assert.equal(store.read("project_launch_q3"), null);
    assert.equal(store.index().find((e) => e.name === "project_launch_q3"), undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("link() adds a graph edge without duplicating", () => {
  const dir = freshStoreFromExamples();
  try {
    const store = new AurumRecall(dir);
    store.link("user_who_i_am", "reference_billing_dashboard");
    assert.ok(store.read("user_who_i_am").links.includes("reference_billing_dashboard"));
    store.link("user_who_i_am", "reference_billing_dashboard"); // no-op
    const count = store.read("user_who_i_am").links.filter((l) => l === "reference_billing_dashboard").length;
    assert.equal(count, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
