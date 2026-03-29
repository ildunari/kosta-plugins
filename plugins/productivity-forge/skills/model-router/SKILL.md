---
name: model-router
description: >
  Route sub-agent tasks to the appropriate Claude model. Opus for verification
  and review, Sonnet for research and drafting. Use when dispatching sub-agents
  to ensure cost-effective model selection without sacrificing quality where it matters.
---

# Model Router

Route each sub-agent task to the Claude model best suited for its cognitive demands. The goal is cost-effective model selection: use the strongest model where accuracy is non-negotiable (verification, review, complex reasoning), and use the faster model where fluency and throughput matter more than deep analysis (research, drafting, extraction).

## Routing Table

| Task Type | Model | Rationale |
|-----------|-------|-----------|
| **Source verification** | Opus | Cross-referencing values across files, resolving discrepancies, and catching subtle errors requires deep analytical reasoning. A missed value here propagates through the entire document. |
| **Derived calculation verification** | Opus | Independent recomputation of fold-changes, ratios, and percentages. Math errors compound, so this needs the most capable model. |
| **Domain review** (accuracy, compliance) | Opus | Assessing whether claims are supported by evidence, whether domain conventions are followed, and whether compliance requirements are met. Requires domain knowledge and careful judgment. |
| **Citation integrity check** | Opus | Verifying that each citation supports the claim it's attached to after restructuring. Requires understanding the semantic relationship between claim and source. |
| **Integrity Gate checks** | Opus | Final verification pass. The gate is the last line of defense -- it must catch what earlier steps missed. |
| **Research and exploration** | Sonnet | Broad document reading, inventory building, extraction of structure and content. Speed and coverage matter more than deep analysis. |
| **Drafting** | Sonnet | Prose generation with verified values and citation maps. The values are already verified; the drafting agent's job is fluent writing, not fact-checking. |
| **Language review** (tone, naturalness) | Sonnet | AI-telltale detection, tone consistency, style evaluation. Pattern recognition and stylistic judgment, not deep reasoning. |
| **Structure planning** | Sonnet | Outlining section movements, content consolidation maps. Organizational work that benefits from speed. |
| **Stale value scanning** | Sonnet | Searching documents for deprecated values. Pattern matching, not analytical reasoning. |
| **Format and style checks** | Sonnet | Heading hierarchy, word counts, formatting compliance. Mechanical checks that don't require deep understanding. |

## When to Override

The routing table provides defaults. Override when:

### User Preference

The user explicitly requests a specific model for a task: "Use Opus for drafting this section -- the tone is critical." Always respect explicit model requests.

### Cost Constraints

When the user has budget constraints or the session involves many sub-agent dispatches:
- Downgrade Opus tasks to Sonnet for Tier 1 (exploratory) verification -- spot-checking 3-5 values doesn't need the strongest model.
- Batch multiple Sonnet tasks into fewer dispatches to reduce overhead.
- For very large documents with 50+ claims, consider running initial verification with Sonnet and escalating only flagged claims to Opus.

### Speed Requirements

When the user needs results quickly:
- Use Sonnet for all tasks except the Integrity Gate (which should always use Opus or be performed by the orchestrator directly).
- Skip parallel review dispatches and have the orchestrator do inline review.

### Complexity Escalation

When a Sonnet agent returns uncertain or conflicting results:
- Re-dispatch the same task to Opus with the Sonnet output as additional context.
- This "escalate on uncertainty" pattern catches the cases where the lighter model's limitations matter.

### Small Context Tasks

When the task is small enough that the orchestrator can handle it inline (a single paragraph edit, one value lookup), skip the sub-agent dispatch entirely. The overhead of creating a sub-agent prompt, dispatching, and parsing results isn't justified for trivial tasks.

## Model Capabilities Relevant to Document Work

### Opus

- Strongest analytical reasoning -- catches subtle logical errors, inconsistent claims, and unsupported conclusions
- Best at cross-referencing multiple files and holding complex relationships in working memory
- Most reliable for mathematical verification (though still verify independently)
- Better at understanding domain conventions and compliance requirements
- Higher cost, slower response time
- Context window: the orchestrator typically runs on Opus with a large context (up to 1M tokens)

### Sonnet

- Fast, fluent prose generation that matches existing document tone
- Strong pattern matching for structural analysis and extraction
- Good at detecting AI-telltale patterns in text (parallel structures, excessive hedging)
- Efficient for broad research across large documents
- Lower cost, faster response time
- Context window: 200K tokens, sufficient for focused single-task packets

## Dispatch Annotation

When dispatching a sub-agent, annotate the intended model in the prompt contract:

```
[Model: Opus]
Task: Verify all quantitative claims in Aim 1 against source data.
...
```

```
[Model: Sonnet]
Task: Draft the revised Background section using verified values from the Claim Ledger.
...
```

If the runtime environment doesn't support model routing (e.g., all sub-agents run on the same model as the orchestrator), the annotation is informational -- it documents the intended cognitive tier for the task, which helps the orchestrator calibrate expectations for the output quality.

## Cost-Effectiveness Guidelines

For a typical document editing session with the agentic loop:

| Phase | Typical Dispatches | Model Mix |
|-------|-------------------|-----------|
| Research | 1-2 explore agents | Sonnet |
| Source Verify | 1 verification agent | Opus |
| Structure Plan | 0-1 (usually inline) | Sonnet or inline |
| Draft | 1-3 drafting agents | Sonnet |
| Apply Gate | 0 (inline) | Orchestrator |
| Integrity Gate | 1 verification agent | Opus |
| Dual Review | 2 review agents | Opus (domain) + Sonnet (language) |
| Fix | 0 (inline) | Orchestrator |

This gives a typical ratio of approximately 60% Sonnet dispatches, 40% Opus dispatches by count, with the Opus dispatches concentrated at the verification and review checkpoints where accuracy matters most.
