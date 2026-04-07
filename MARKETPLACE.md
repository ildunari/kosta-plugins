# Marketplace Authoring Guide

How `kosta-plugins` is structured, the official `marketplace.json` schema, and the issues we found and fixed in this repo.

Source of truth: <https://code.claude.com/docs/en/plugin-marketplaces>

---

## 1. Repo layout

A Claude Code plugin marketplace is a Git repo whose root contains a `.claude-plugin/marketplace.json` catalog and one plugin directory per entry.

```
kosta-plugins/
├── .claude-plugin/
│   └── marketplace.json        # marketplace catalog (one per repo)
├── plugins/
│   ├── stitch-studio/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json     # plugin manifest (one per plugin)
│   │   ├── skills/             # SKILL.md files with YAML frontmatter
│   │   ├── agents/             # *.md agents with YAML frontmatter
│   │   ├── commands/           # *.md slash commands with YAML frontmatter
│   │   ├── hooks/hooks.json    # optional hooks config
│   │   └── .mcp.json           # optional MCP server config
│   └── ...
└── README.md
```

Rules:

- Exactly one `.claude-plugin/marketplace.json` at the repo root.
- Each plugin lives under `plugins/<name>/` with its own `.claude-plugin/plugin.json`.
- Plugin component files (skills, agents, commands) must have valid YAML frontmatter — a single bad file blocks loading of that plugin.
- Plugins are copied to `~/.claude/plugins/cache/...` on install. Use `${CLAUDE_PLUGIN_ROOT}` inside hooks/MCP configs to reference plugin-local files. Never use `../` to escape the plugin directory.

## 2. `marketplace.json` schema

### Required (top-level)

| Field     | Type   | Notes                                                                  |
| --------- | ------ | ---------------------------------------------------------------------- |
| `name`    | string | kebab-case marketplace ID, public-facing                               |
| `owner`   | object | `{ name (required), email? }`                                          |
| `plugins` | array  | List of plugin entries                                                 |

### Optional (top-level)

`metadata.description`, `metadata.version`, `metadata.pluginRoot` — **all version/description fields go inside `metadata`, not at the top level.**

> **Reserved names** (cannot be used): `claude-code-marketplace`, `claude-code-plugins`, `claude-plugins-official`, `anthropic-marketplace`, `anthropic-plugins`, `agent-skills`, `knowledge-work-plugins`, `life-sciences`. Names that impersonate official marketplaces are also blocked.

### Plugin entry

Required: `name`, `source`. Everything else is optional.

Optional plugin fields: `description`, `version`, `author`, `homepage`, `repository`, `license`, `keywords`, `category`, `tags`, `strict`, plus component overrides (`commands`, `agents`, `hooks`, `mcpServers`, `lspServers`).

### Source types

| Source        | Form                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------- |
| Relative path | `"source": "./plugins/foo"` — must start with `./`, no `..`, only works for git-based marketplaces |
| GitHub        | `{ "source": "github", "repo": "owner/repo", "ref"?, "sha"? }`                                |
| Git URL       | `{ "source": "url", "url": "https://...", "ref"?, "sha"? }`                                   |
| Git subdir    | `{ "source": "git-subdir", "url": "...", "path": "...", "ref"?, "sha"? }`                     |
| npm           | `{ "source": "npm", "package": "...", "version"?, "registry"? }`                              |

### Canonical example

```json
{
  "name": "my-plugins",
  "owner": { "name": "Your Name", "email": "you@example.com" },
  "metadata": {
    "description": "Short marketplace blurb",
    "version": "1.0.0"
  },
  "plugins": [
    {
      "name": "my-plugin",
      "source": "./plugins/my-plugin",
      "description": "...",
      "version": "1.0.0",
      "license": "MIT",
      "category": "development",
      "tags": ["foo", "bar"]
    }
  ]
}
```

## 3. End-to-end workflow

1. Author plugins under `plugins/<name>/` with valid `.claude-plugin/plugin.json` and component files.
2. List each plugin in `.claude-plugin/marketplace.json` with a relative `source`.
3. Validate locally: `claude plugin validate .` (or `/plugin validate .` inside Claude Code).
4. Push to GitHub.
5. Users install with:
   ```
   /plugin marketplace add ildunari/kosta-plugins
   /plugin install <plugin-name>@kosta-plugins
   ```
6. After updates, users refresh with `/plugin marketplace update kosta-plugins` (this does a `git pull` of the marketplace repo).

## 4. Issues found in this repo (2026-04-07) and fixes

### Issue 1 (root cause) — invalid top-level schema introduced by Copilot PR #1

`9fbd34c Merge pull request #1 from ildunari/copilot/fix-plugin-discovery-issues` rewrote `.claude-plugin/marketplace.json` to use **`"version"` and `"description"` at the top level**, and added a fake `$schema` URL. This violates the official schema, which requires those fields under `metadata`. Symptoms: marketplace fails to add cleanly and/or only a partial set of plugins resolves.

**Fix:** restored canonical structure with `metadata.description` + `metadata.version`, removed the bogus `$schema` field, bumped `metadata.version` to `1.0.4` to invalidate caches, and put the per-plugin `license` and `tags` fields back.

### Issue 2 — stray nested `marketplace.json` inside a plugin

`plugins/stitch-studio/.claude-plugin/marketplace.json` existed alongside `plugin.json`. This was leftover from when `stitch-studio` was its own marketplace before being inlined (commit `5ba1806`). A plugin folder must contain `plugin.json`, not `marketplace.json` — having both is malformed and risks confusing the loader.

**Fix:** deleted the stray file.

### Issue 3 — `.DS_Store` files committed/floating in the repo

`.DS_Store` and `plugins/.DS_Store` were untracked and could end up committed via Syncthing churn. Not directly fatal for plugin loading but messy and noisy.

**Fix:** removed them and added a `.gitignore` ignoring `.DS_Store` recursively.

### Issue 4 — minor schema drift in plugin manifests (not breaking, worth knowing)

- `stitch-studio/plugin.json` declares `author.url`, which is not in the documented author schema (`name` required, `email` optional). It is silently ignored today but may warn in future validators.
- Several `plugin.json` files omit `license` even though the marketplace entry sets one. This is fine — the marketplace entry wins for marketplace listing, but for consistency the plugin manifest should match.

These were left as-is to keep this PR scoped to the loading bug. Worth a follow-up sweep.

## 5. After-fix verification checklist

On a machine where the marketplace is already added:

```
/plugin marketplace update kosta-plugins
/plugin marketplace list
/plugin           # browse — should show all 5 plugins
```

On a fresh machine:

```
claude plugin marketplace add ildunari/kosta-plugins
claude plugin validate .
```

Expected plugins: `stitch-studio`, `subagent-forge`, `ios-craft`, `productivity-forge`, `coding-forge`.

## 6. Common pitfalls (from the official troubleshooting docs)

- **Top-level `version`/`description` instead of `metadata.version`/`metadata.description`** — what bit us here.
- **Relative paths with URL-based marketplaces** — relative `source` paths only work when users add the marketplace via Git. If you serve `marketplace.json` over HTTP directly, switch plugins to `github`/`url`/`npm` sources.
- **Bad YAML frontmatter in any skill/agent/command** — blocks the entire plugin from loading. Run `claude plugin validate .` before committing.
- **Malformed `hooks/hooks.json`** — same blast radius. The whole plugin fails to load.
- **`..` in a relative `source`** — rejected. Plugins must live under the marketplace root.
- **Duplicate plugin names across entries** — rejected.
- **Reserved marketplace names** — see list above.
- **Stale local cache** — `/plugin marketplace update <name>` does a `git pull`. If the previous version was cached with broken schema, an update should now succeed; otherwise `remove` and re-`add` (note: `remove` also uninstalls the plugins).
