# Website task prompt

Replace the bracketed inputs, then provide the task below. Use `SOL_TASK_PROMPT.md` instead when importing a recorded design run.

```text
Work in ds54e/analog-trace-bench.

Task: [specific requested page or behavior change]
Inputs: [source material, evidence/run IDs, or relevant paths]
Acceptance: [observable behavior or expected output]

Use AGENTS.md and the repository state. Read only the relevant guidance: docs/DEVELOPMENT.md for site/tooling work, docs/TRACE_GUIDE.md for recorded-trace changes, and docs/PUBLISHING.md for release assets or deployment.

Preserve the accepted trace presentation and source payloads. Keep deployed files in site/, raw archives in Release assets/local evidence/, and repository-only documents/tools outside the deployed directory. Use relative internal links that work beneath the GitHub Pages project path.

Complete implementation and focused verification. Edit shared templates/assets or canonical run fragments, then rebuild with python3 tools/build_site.py; do not edit or commit generated HTML. Run the site checks, plus tooling tests when affected. Ask only for an essential unresolved input or decision, and continue independent work. Report the outcome, actual verification, and material gaps.

Commit authorized changes to main unless this task or repository rules require another branch. Do not create a pull request by default or rewrite history. Publication uses the manual Pages workflow; honor publication authorization already given in the session.
```
