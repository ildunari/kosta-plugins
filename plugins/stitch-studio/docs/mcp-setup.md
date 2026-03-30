# Stitch MCP Setup

## Quick Start

```bash
npm install -g @_davideast/stitch-mcp
npx @_davideast/stitch-mcp init
npx @_davideast/stitch-mcp doctor
```

The `init` command walks you through OAuth authentication with Google. The
`doctor` command verifies all 7 configuration checks pass.

## Authentication Options

### OAuth (recommended)

Run `npx @_davideast/stitch-mcp init` for guided setup. This handles gcloud
credentials and OAuth token management automatically.

### API Key

Set the `STITCH_API_KEY` environment variable. Simpler but less secure.

### System gcloud

If you already have gcloud configured, set `STITCH_USE_SYSTEM_GCLOUD=1` to use
your existing credentials instead of the bundled gcloud.

## Plugin Configuration

This plugin includes `.mcp.json` at the root which auto-configures the Stitch
MCP server when installed as a Claude Code plugin:

```json
{
  "mcpServers": {
    "stitch": {
      "command": "npx",
      "args": ["@_davideast/stitch-mcp", "proxy"]
    }
  }
}
```

## Manual Claude Code Configuration

If not using the plugin's auto-config, add to your project or user MCP settings:

```bash
claude mcp add stitch -- npx @_davideast/stitch-mcp proxy
```

## Verifying Connection

After setup, verify the MCP tools are available:

```
/mcp
```

You should see `stitch` listed with tools like `get_screen_code`,
`get_screen_image`, and `build_site`.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Permission denied (401/403) | Run `npx @_davideast/stitch-mcp doctor` |
| OAuth tokens expired | Run `npx @_davideast/stitch-mcp init` again |
| Tools not showing in `/mcp` | Check `npx @_davideast/stitch-mcp proxy` runs without errors |
| Generation timeout | Stitch can take 30-60 seconds. Retry once, then simplify prompt. |

## Without MCP

All stitch-studio skills work without MCP. Generate screens at
[stitch.withgoogle.com](https://stitch.withgoogle.com), then paste screenshots
or HTML code into Claude Code. The skills detect MCP availability and switch to
manual mode automatically.
