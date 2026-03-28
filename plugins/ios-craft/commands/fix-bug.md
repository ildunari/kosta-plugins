---
name: fix-bug
description: Structured bug investigation and fix workflow
---

Follow the bug-doctor debugging workflow to systematically find and fix the issue.

Start by gathering information:
- What did you expect to happen?
- What actually happened instead?
- Can you describe the steps to reproduce it?
- Did it ever work before? If so, what changed?
- Are there any crash logs, error messages, or console output?

Then work through the structured debugging process:

1. **Reproduce** — Try to trigger the bug in the simulator using XcodeBuildMCP. A bug you can reproduce is a bug you can fix.

2. **Hypothesize** — Based on symptoms, form 2-3 ranked hypotheses about the root cause. Explain each one in plain language.

3. **Verify** — Test each hypothesis. Read crash logs and stack traces. Add diagnostic logging if needed. Narrow down to the actual cause.

4. **Fix** — Apply the minimal fix that addresses the root cause, not just the symptom. Explain what was wrong and why the fix works.

5. **Regression test** — Write a test that reproduces the exact condition that caused the bug and verifies the fix handles it correctly.

6. **Verify** — Build the project, run all tests, and confirm the bug is fixed in the simulator.

Summarize what broke, why, how it was fixed, and what test now guards against it.
