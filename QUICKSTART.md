# Give your agent memory in 5 minutes

Aurum Recall ships an **MCP server**. Point any MCP-speaking agent (Claude Desktop, Claude Code, …)
at it and your agent can remember across sessions — in plain Markdown files you own and can read.

## 1. Build it

```bash
git clone <repo> aurum-recall && cd aurum-recall
npm install && npm run build
```

(Once published: `npm i -g aurum-recall` and skip the clone — the binary is `aurum-recall-mcp`.)

## 2. Pick where memory lives

A memory store is just a folder. Make one (or reuse an existing `memory/` dir):

```bash
mkdir -p ~/my-agent-memory
```

The server reads the folder from `AURUM_RECALL_DIR` (or the first CLI arg). Point it at the bundled
`examples/memory/` first if you just want to see it work.

## 3a. Claude Desktop

Add to `claude_desktop_config.json`
(macOS: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`):

```json
{
  "mcpServers": {
    "aurum-recall": {
      "command": "node",
      "args": ["/absolute/path/to/aurum-recall/dist/mcp.js"],
      "env": { "AURUM_RECALL_DIR": "/absolute/path/to/my-agent-memory" }
    }
  }
}
```

Restart Claude Desktop. The 🔌 menu shows **aurum-recall** with its tools.

## 3b. Claude Code

```bash
claude mcp add aurum-recall \
  --env AURUM_RECALL_DIR=/absolute/path/to/my-agent-memory \
  -- node /absolute/path/to/aurum-recall/dist/mcp.js
```

## 4. Use it

The agent now has these tools:

| tool | what it does |
|---|---|
| `memory_index` | load the working set (one line per memory) — call at task start |
| `memory_search` | substring-filter the index (cheap, no embeddings) |
| `memory_recall` | load the full text of specific memories (with age + trust flag) |
| `memory_remember` | save a new fact (typed: user / feedback / project / reference) |
| `memory_update` | edit an existing memory in place |
| `memory_forget` | delete a wrong/obsolete memory |
| `memory_link` | add a `[[link]]` edge between two memories |

Try: *"Check your memory, then remember that I prefer TypeScript and deploy only on my say-so."*
The agent calls `memory_index`, then `memory_remember` — and there are now real Markdown files in
your folder you can open, edit, and commit to git.

## What just happened

No database, no vendor lock-in, no embeddings. Your agent's memory is a folder of typed Markdown
files with an always-loaded index and trust that decays with age. Open `MEMORY.md` to see the
working set; open any `*.md` to read a fact. It's yours.

See [`SPEC.md`](./SPEC.md) for the format and [`BUILD_PLAN.md`](./BUILD_PLAN.md) for what's next
(a ranker for large stores, and the spectral/fractal visual lens over the memory graph).
