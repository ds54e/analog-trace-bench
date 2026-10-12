# Submitted circuit drawings

Two Final submission sections include native transistor-level diagrams above the
unchanged submitted SPICE:

| Pilot | Artifact directory under `site/schematics/` |
|---|---|
| OTA-FIXED / Opus 5.5 / Run 1 | `ota-fixed-sky130-opus-5-5-r1/` |
| LDO-CORE / Sonnet 5.5 / Run 1 | `ldo-core-sky130-sonnet-5-5-r1/` |

Drawings are derived documentation. Submission bytes, canonical trace fragments,
evaluation files and recorded results remain authoritative. Drawing generation
does not run a new circuit simulation.

## Instruction map

Use [human-readable-analog-schematics](../skills/human-readable-analog-schematics/SKILL.md)
for the drawing workflow. Read only its applicable references. The
[ATB profile](../skills/human-readable-analog-schematics/references/atb-profile.md)
owns presentation preferences and pilot-specific constraints;
[gallery evidence](../skills/human-readable-analog-schematics/references/gallery-evidence.md)
records comparison URLs, observations and limits. This document owns repository
setup, artifact paths, verification and site integration. See
[Skills](../skills/README.md) for discovery and current OpenAI authoring guidance.

## Page integration

The [ATB profile](../skills/human-readable-analog-schematics/references/atb-profile.md)
owns visible content, display-value policy and current pilot geometry. Keep those
preferences there instead of duplicating them in this repository guide.

| Implementation | Responsibility |
|---|---|
| `tools/schematics/generate.mjs` | Reconstruct native geometry and labels; save, reopen, render and compare. |
| `tools/schematics.py` | Validate source-bound artifacts and insert the image-only figure with accessible alt text. |
| `site/assets/trace.css` | Use 60% figure width and a 408 px minimum capped at the available width; preserve image aspect ratio and scroll below 408 px. |
| `site/schematics/index.json` | Bind source and artifact hashes; the verified SVG hash versions each page image URL. |

The white image surface remains consistent across page themes. Page scaling does
not modify native geometry, text sizes or parameters. Native SVG export uses a
20-unit margin; the pinned editor's default uses 40 units.

After publication, reload affected pages and check both layout and the image URL's
SVG hash. A completed deployment does not prove that a browser has loaded the
latest drawing; cached images were observed during these refinements.

## Artifacts

Each pilot directory contains:

| File | Purpose |
|---|---|
| `schematic.svg` | Native render of the saved and reopened project. |
| `project.icproj.json` | Editable project for Analog Canvas project import. |
| `submitted.spice` | Exact decoded bytes of the frozen final submission. |
| `exported.spice` | Checked structural export from the reopened project. |
| `verification.json` | Comparisons, export/display settings, route/body checks and diagnostics. |

The checked-in recipe reconstructs the two frozen submissions, not later GUI
edits or arbitrary netlists. See the skill's
[Native workflow](../skills/human-readable-analog-schematics/references/analog-canvas-workflow.md)
for literal labels, saved cell defaults and pinned export behavior.

## Regenerate native drawings

Use this section when changing native geometry or annotations. For CSS, captions
or links, build/check the site and inspect page rendering without regenerating
accepted drawings. For documentation-only changes, validate links and build/check
integration without changing site or native artifacts.

Normal site builds need only Python. Native drawing regeneration uses Node 24+
and pnpm 11.16+, with Analog Canvas 0.9.2 pinned to
`37bccd4012764dce53b34927fa606c6f430296a2`. Keep the dependency checkout in the
ignored cache, not a separate project or worktree:

```sh
git clone https://github.com/cascode-ai/analog-canvas.git .cache/analog-canvas
git -C .cache/analog-canvas checkout --detach 37bccd4012764dce53b34927fa606c6f430296a2
cd .cache/analog-canvas
pnpm install --frozen-lockfile --ignore-scripts --store-dir /tmp/atb-pnpm-store --config.cache-dir=/tmp/atb-pnpm-cache
cd ../..
node tools/schematics/generate.mjs
python3 tools/build_site.py
python3 tools/check_site.py
python3 -m unittest discover -s tests -v
```

Skip clone/checkout when the cache already has that revision. Pass a different
native checkout path as the generator's first argument if needed. Generation
rewrites only the two pilot artifact directories and drawing index. The bridge
exposes pinned native APIs; no PDK installation or gallery login is required for
local generation. Live gallery comparison requires separate browser access.

## Separate verification gates

After saving/reopening, generation checks authored visible routes and bulk
defaults, orthogonal geometry, expected rounded label strings, native unrouted
connections and diagnostics. It exports and compares exact ordered external
ports, D/G/S/B or passive pin order, models, values, W/L, nf and m. The saved
reports for both pilots record a match, zero unrouted connections and zero
native diagnostics.
When reproducing an unchanged recipe, compare regenerated artifact hashes with
the saved set; matching source/export contracts alone do not prove reproducibility.

Review native renders at fit and reading sizes independently. Inspect actual
page rendering when available, including narrow layouts. Record the browser
coverage actually performed; source/CSS checks do not establish a mobile browser
review, and diagnostics do not establish readability or user acceptance.

The pinned ordinary export changes port order for each pilot while preserving
topology and parameters. `verification.json` records this difference separately.
The supplied checked export uses `{format: 'spice', groundPin: 'global'}` and
matches the submitted interface order for these two cases. Do not assume that
ordinary GUI export or this setting always preserves other interfaces.

## Site integration and additional runs

`site/schematics/index.json` binds each drawing to its submitted SHA-256 and
artifact hashes. `tools/schematics.py` checks hashes, exact structural contracts
and verification reports, then inserts the diagram during `build_traces.py`.
It does not edit `content/traces/`. Stale sources, changed artifacts, mismatched
exports and unknown runs fail the build. Portable exports
copy the same artifacts.

For an additional run, read its actual circuit, author/review the native project,
retain source/export/check artifacts and register the verified drawing. Extend
the recipe only when reproducible generation is required. The independent parser
accepts one subcircuit, the reviewed SKY130 four-terminal X calls and numeric R/C
values/parameters. Add deliberate support before using hierarchy, expressions
or other devices; unsupported constructs must not silently pass.

For instructions-only maintenance, check references and build the site without
regenerating accepted drawings. Follow [Publishing](PUBLISHING.md) when publication
is part of the user's authorized task; changing a skill does not grant that action.
