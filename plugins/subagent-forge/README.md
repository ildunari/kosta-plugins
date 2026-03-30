# subagent-forge plugin

`subagent-forge` is a compact Claude Code plugin for research-heavy work. It lets the **main thread orchestrate and synthesize**, and focused subagents absorb the search, mapping, verification, and critique work.

## Included agents

- `subagent-forge:product-tool-scout` — High-signal product and tool ranking
- `subagent-forge:forum-sentiment-hunter` — Real user signal from forums and discussions
- `subagent-forge:github-repo-auditor` — Repository health and maintenance assessment
- `subagent-forge:academic-literature-scout` — Academic and scientific evidence discovery
- `subagent-forge:directory-repo-mapper` — Ecosystem clustering and landscape mapping
- `subagent-forge:freshness-checker` — Version, release, and docs freshness verification
- `subagent-forge:qa-critique-analyst` — Adversarial critique of plans and findings
- `subagent-forge:source-verifier` — Primary-source claim verification

## Included skills

- `subagent-forge:task-packet-builder` — Build tight task packets for subagents
- `subagent-forge:research-report-contract` — Standard quick/normal/deep/adversarial formats
- `subagent-forge:source-triage` — Rank sources by credibility and freshness
- `subagent-forge:rank-and-prune` — Cut duplicates and low-signal options
- `subagent-forge:lessons-ledger` — Save project-local lessons and source lists
- `subagent-forge:research-brief` — Turn vague asks into execution-ready briefs
- `subagent-forge:spreadsheet-polish` — Design decision-grade comparison sheets

## Recommended usage

1. Enable the plugin.
2. Optionally switch to **Subagent Forge** via `/config`.
3. Ask the main thread to orchestrate the work.
4. Delegate research, mapping, freshness checks, and critique to subagents.
5. Keep final synthesis in the main thread.
6. Run `subagent-forge:lessons-ledger` to save compact learnings to the current project.

## Safety model

- Most plugin agents are read-heavy (Read, Grep, Glob, WebSearch, WebFetch).
- They do not get Edit/Write tool access.
- Bash mutations are guarded by the plugin hook.
