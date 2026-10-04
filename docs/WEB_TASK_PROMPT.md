# Website task prompt

Select GPT-6.1 Sol in the working interface, then provide the task below. Use `SOL_TASK_PROMPT.md` instead when importing a recorded design run.

```text
Work in ds54e/analog-trace-bench-public.

Task: [specific requested page or behavior change]
Inputs: [source material, evidence/run IDs, or relevant paths]
Acceptance: [observable behavior or expected output]

Use AGENTS.md and the repository state. Read only the relevant guidance: docs/DEVELOPMENT.md for site/tooling work, docs/TRACE_GUIDE.md for recorded-trace changes, and docs/PUBLISHING.md for release assets or deployment.

Preserve the accepted trace presentation and source payloads. Keep deployed files in site/, raw archives in Release assets/local evidence/, and repository-only documents/tools outside the deployed directory. Use relative internal links that work beneath the GitHub Pages project path.

Complete implementation and focused verification. Regenerate the index when its inputs change; run the site checks, plus tooling tests when affected. Ask only for an essential unresolved input or decision, and continue independent work. Report the outcome, actual verification, and material gaps.

Commit authorized changes to main unless this task or repository rules require another branch. Do not create a pull request by default or rewrite history. Do not deploy until publication is explicitly requested.
```
