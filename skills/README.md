# Reusable drawing skills

[human-readable-analog-schematics](human-readable-analog-schematics/SKILL.md)
provides placement, routing, labels and saved-project verification for readable
transistor-level analog diagrams. The core skill routes to relevant references;
the ATB presentation profile and gallery observations are separate from general
rules. Native runtime setup and site integration live in
[Submitted circuit drawings](../docs/SCHEMATICS.md).

## Repository discovery and personal use

The canonical files remain under `skills/human-readable-analog-schematics/`.
A tracked symlink at `.agents/skills/human-readable-analog-schematics` exposes the
same directory to Codex's repository skill discovery without a second copy.
Invoke `$human-readable-analog-schematics`, or ask another agent to read its
canonical `SKILL.md`. If the checkout did not preserve symlinks, use the explicit
path or recreate the link; do not silently fork a second maintained skill.

For personal Codex use outside this repository, copy the complete directory to
`~/.agents/skills/`:

```sh
mkdir -p ~/.agents/skills
cp -R skills/human-readable-analog-schematics ~/.agents/skills/
```

PowerShell:

```powershell
$skillDirectory = Join-Path $env:USERPROFILE '.agents/skills'
New-Item -ItemType Directory -Force -Path $skillDirectory | Out-Null
Copy-Item -Recurse -LiteralPath 'skills/human-readable-analog-schematics' -Destination $skillDirectory
```

Review an existing same-name skill before replacement. Use the destination host's
supported path when it differs. Do not imply that this repository update installs
a separate personal ChatGPT skill or plugin.

## Authoring guidance

Checked against OpenAI's current [Build skills](https://learn.chatgpt.com/docs/build-skills)
guide on 2026-10-12: keep a clear task boundary, put invocation cues early in the
description, load detailed references only as needed, define inputs/outputs and
prefer instructions unless tooling must be deterministic. The current guide
specifies `.agents/skills` for repository and personal Codex discovery and supports
symlinked skill folders.

Use focused success criteria and representative requests, following
[Testing Agent Skills Systematically with Evals](https://developers.openai.com/blog/eval-skills).
The [acceptance cases](human-readable-analog-schematics/references/acceptance.md)
separate artifact checks, visual review and invocation coverage. Keep circuit
preferences attributed to ATB's user profile; OpenAI's guidance concerns skill
structure and evaluation, not analog-circuit correctness.

This is an instruction skill, not a bundled Analog Canvas runtime or universal
layout algorithm. Keep deterministic generation in `tools/schematics/`, preserve
recorded evidence, and follow the user's existing publication authorization.
