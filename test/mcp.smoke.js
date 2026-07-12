// Smoke test the MCP server end-to-end via the SDK client (handles the JSON-RPC handshake).
// Run:  npm run build && node test/mcp.smoke.js
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [join(root, "dist", "mcp.js")],
  env: { ...process.env, AURUM_RECALL_DIR: join(root, "examples", "memory") },
});

const client = new Client({ name: "smoke", version: "0.0.0" });
await client.connect(transport);

const { tools } = await client.listTools();
const names = tools.map((t) => t.name).sort();
console.log("tools:", names.join(", "));
assert.ok(names.includes("memory_index"));
assert.ok(names.includes("memory_recall"));
assert.ok(names.includes("memory_remember"));

const idx = await client.callTool({ name: "memory_index", arguments: {} });
const entries = JSON.parse(idx.content[0].text);
console.log(`memory_index → ${entries.length} entries; first: ${entries[0].name}`);
assert.equal(entries.length, 4);

const recall = await client.callTool({
  name: "memory_recall",
  arguments: { names: ["feedback_no_auto_deploys"] },
});
const payload = JSON.parse(recall.content[0].text);
console.log(`memory_recall → type=${payload.memories[0].type}, links=${JSON.stringify(payload.memories[0].links)}`);
assert.equal(payload.memories[0].type, "feedback");

await client.close();
console.log("\n✅ MCP server smoke test passed");
