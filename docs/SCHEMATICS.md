# Submitted circuit drawings

All 121 OTA runs and 98 LDO runs show their submitted circuit immediately below
the Run selector and before Run & evaluation. Submitted SPICE stays in the
original Final submission article:

| Coverage | Runs |
|---|---|
| OTA-DRIVE / FIXED / FREE / PRECISION | 24 each |
| OTA-WIDE | 25 |
| LDO-ALWAYS-ON / CORE | 24 each |
| LDO-LOW-VOLTAGE / QUIET | 25 each |

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
| `tools/schematics/ota-layouts.mjs` | Match the two-stage motif and identify differential branches/current paths for the family-specific layouts. |
| `tools/schematics/ota-connected-layouts.mjs`, `ota-case-refinements.mjs` | Place DRIVE, PRECISION and WIDE stages, mirrors, complementary pairs, parallel branches and input networks. |
| `tools/schematics/orthogonal-router.mjs` | Route continuous signal trees with reserved symbols, labels and terminal escapes; retain local auxiliary bias connections. |
| `tools/schematics/ota-free-layouts.mjs` | Reviewed per-submission FREE recipes for degeneration, cascodes, folded branches and the level-shifted PMOS input case; keep principal paths continuous. |
| `tools/schematics/ota-composition.mjs` | Contract unused strips and place intact auxiliary current paths near their consumers while preserving signal corridors. |
| `tools/schematics/layout-spacing.mjs` | Contract placement intervals while reserving full references and terminal escapes; keep symbol and text sizes unchanged. |
| `tools/schematics/ota-stage-placement.mjs` | Align source-matched complementary inputs and loaded mirror transfer stages; attach remote signal shunts and feed-forward parts beside their nodes. |
| `tools/schematics/ota-review-labels.mjs` | Keep reviewed passive annotation offsets separate from electrical values and device placement. |
| `tools/schematics/ldo-layouts.mjs`, `ldo-case-refinements.mjs` | Derive LDO input branches, gate drivers, pass stages, sensing and compensation from each submission, with explicit refinements for complex topologies. |
| `tools/schematics/human-reference-layouts.mjs` | Core/Astra Run 1 LDO, Precision/Sonnet 5.5 Run 2 OTA, four guarded NMOS-output converter-core OTA variants and two complementary-input OTA cases. Anchor source-matched motifs and author their critical routes explicitly. |
| `tools/schematics/ldo-direct-pass-motifs.mjs` | Reviewed seven-MOS direct-pass LDO families with VIN-fed diode bias, a plain divider and optional VOUT–FB capacitor; frozen-source and complete ordered-pin guards limit reuse. |
| `tools/schematics/ota-passive-variants.mjs` | Four ordinary eight-MOS two-stage sources with a local IBIAS–VSS, mirror-node–VSS or VDD–IBIAS capacitor; reuse the existing matched core and retain each capacitor's actual endpoints. |
| `tools/schematics.py` | Validate source-bound artifacts and render the image-only figure with accessible alt text. |
| `tools/build_traces.py`, `tools/templates/trace.html` | Bind the figure to its run, before the summary tables; preserve the final SPICE article. |
| `site/assets/trace.css` | Use 60% figure width and a 408 px minimum capped at the available width; preserve image aspect ratio and scroll below 408 px. |
| `site/schematics/index.json` | Bind source and artifact hashes; the verified SVG hash versions each page image URL. |

Grouped fallback drawings have a manifest-specific image minimum at 80% of their
native viewBox width, inside the same 60% figure. Horizontal scrolling preserves
reading size without shrinking native text. The white image surface remains consistent across page themes. Page scaling does
not modify native geometry, text sizes or parameters. Native SVG export uses a
20-unit margin; the pinned editor's default uses 40 units.

The first diagram loads eagerly. Run links select a complete run panel, so the
diagram follows the chosen run. VSS ports use a horizontal orientation like OTA
VDD; native projects and exports retain the VSS interface identity.
Every diagram opens its same hash-versioned SVG when clicked, including simple
two-stage circuits and the original pilots. The link adds no visible caption.

After publication, reload affected pages and check both layout and the image URL's
SVG hash. A completed deployment does not prove that a browser has loaded the
latest drawing; cached images were observed during these refinements.

## Artifacts

Each `site/schematics/<run-id>/` directory contains:

| File | Purpose |
|---|---|
| `schematic.svg` | Native render of the saved and reopened project. |
| `project.icproj.json` | Editable project for Analog Canvas project import. |
| `submitted.spice` | Exact decoded bytes of the frozen final submission. |
| `exported.spice` | Checked structural export from the reopened project. |
| `verification.json` | Comparisons, export/display settings, route/body checks and diagnostics. |

The recipe reads the catalog's OTA and LDO submissions individually and retains the two
reviewed pilot layouts. It does not reproduce later GUI edits or accept arbitrary
netlists. It reuses the two-stage layout only after matching actual ordered-pin
connections, including RC order. Larger circuits retain vertical stacks and
paired inputs; source degeneration resistors stay with their pair. Remote groups
currently use object-bound native net labels, not SVG-only text. That records
existing native connectivity; it is not permission to skip internal wiring in
new corrections. See the skill's
[Native workflow](../skills/human-readable-analog-schematics/references/analog-canvas-workflow.md)
for literal labels, saved cell defaults and pinned export behavior.

OTA-FREE has 13 source-matched two-stage drawings and 11 case-reviewed recipes.
The latter replace the initial grouped fallback: the signal path, load mirror,
tail and compensation use continuous native wires. Auxiliary bias branches sit near their consumers, beside or below the main
circuit. Existing revisions use bound labels for some remote controls and
supplies; the owner now requires the internal control links to be physically wired.
The reviewed FREE figures show the complete drawing within the 60% frame and
open the native SVG when clicked, without a caption or link text. Their native
artifacts retain full text and symbol sizes. Coordinates belong to the recipes.
The FREE recipes preserve each D/S column when turning mirror gates inward,
align the next-stage gate with its driving tap, and keep series passives on
their branch axis. The level-shifted PMOS case places a follower beside each
input and uses a local boost-gate trunk. Review these routes at reading size;
fewer bends do not by themselves establish clear crossings or label ownership.

OTA-DRIVE, OTA-PRECISION and OTA-WIDE retain their 12 matching two-stage
layouts and replace all 61 grouped fallbacks with connected stage drawings.
Folded branches flank their input pair; complementary pairs share vertically
aligned input routes where their topology permits. Mirror gates face one another
without changing the drain/source axes. Compensation is beside its actual output
stage; input filters, parallel tails and unusual sensing branches have explicit
case refinements. Auxiliary bias branches are placed near their consumers in
available space. Complete local current paths move together. Compare width and
height as well as the full image at its actual page width; smaller area alone is
not acceptance.

The orthogonal router reserves native symbol bodies, full reference/value text,
port bodies and terminal escapes. It builds shared trees, penalizes bends and
crossings, permits only plain foreign-net crossings, and removes unused escape
spurs. Earlier recipes permit bound labels for supplies and auxiliary bias
controls. New corrections retain the supply/port exceptions but must physically
join internal signals and bias controls, with names only annotating their wires.
The reopened-project check separately verifies each recorded
`continuous_signal_nets` net using only physical routes, before applying native
name-based connections. The site tests independently trace those routes, local
diodes and every external port in the saved JSON. These checks supplement visual
review; they do not establish readability by themselves.

The two human-reference comparisons deliberately bypass generic placement and
routing for their own complete drawings. They reuse the same native importer,
renderer, exact values, body defaults and electrical checks. The LDO shows its
actual VIN–REF–VREF ladder and separate sensing injection; the OTA retains its
current-subtracting mirror branches without inventing a cascode receiver. See
[Human reference motifs](../skills/human-readable-analog-schematics/references/human-reference-motifs.md)
for the inspected public sources, separately attributed Gallery observations,
specific electrical limits and before/after visual review gate. This limited
comparison is not a catalog-wide layout generalization. Its follow-up resolves
the earlier reading-size loss by shortening unused leads and intergroup gaps,
with unchanged native text and intact motifs. A separate
[topology-family inventory](../skills/human-readable-analog-schematics/references/topology-family-reuse.md)
limits the earlier wider reuse to 12 simple direct-pass LDOs and four ordinary
two-stage OTA passive variants. That checkpoint left 201 drawings with their
existing recipes and geometry, including both original pilots. Complete graph matching found no
other clone of either source-specific representative; larger or differently
connected passive/transistor networks remain separate cases.

Like the reviewed FREE figures, these 61 figures show the whole drawing in the
60% frame and open the same hash-versioned native SVG on click. Use that view for
reading dense circuits at native text size. The 12 already matched drawings and
both accepted pilots keep their existing geometry.

The 97 added LDO drawings preserve all non-supply nets as continuous physical
routes. They identify the submitted pass device, its driving stages and actual
sensing network; they do not assume every regulator has the pilot's topology.
Input translators, regulated bias loops, folded current paths, compensation and
parallel pass instances remain explicit. The retained LDO pilot keeps its accepted
geometry, including its original VIN orientation; the added LDOs use horizontal
VIN and VSS ports.

The added LDO layouts reserve measured native reference widths with a tested
allowance for the browser's fallback font. Supply labels require a clear placement;
generation fails when none is available. Case-specific routing corridors separate
close feedback and bias paths without changing the source terminal positions.
These options supplement actual glyph and wire inspection at page size.

## Current owner correction scope

The owner selected OTA-FIXED / Sol 6 / Run 1 as the visual reference on
2026-10-13: symmetric pair/load/tail grouping, an adjacent bias reference with
continuous wires to its consumers, a distinct output stage and a short actual
compensation branch. Apply those principles to each submitted topology, without
changing it. The [ATB profile](../skills/human-readable-analog-schematics/references/atb-profile.md)
records internal wire-first routing and compact meaningful LDO feedback.

The physical-route inventory of published `c1b1aa66` found 67 OTA drawings with
non-supply nets split into name-connected components; LDO internal nets were
physically continuous. This is a coverage inventory, not a wire-length acceptance
metric. The Precision/Sonnet 5.5 Run 2 correction now physically joins both VBP and
IBIAS. Four converter-core and two complementary-input OTA corrections leave 60
other OTA drawings with such links. Its converter sink faces
its receiving bias trunk while retaining its D/S column. The actual current-
subtracting core, ordered compensation branch and other functional groups stay
intact. Both bias nets are included in the physical-continuity gate. The Core/Astra
Run 1 LDO now uses a shorter inner FB return above its actual reference ladder,
with separate crossings of REF and the tail stem. Its complete passive network
and exact source contract are preserved; other LDO routes await case review.
Submission bytes and
page presentation are preserved; earlier review acceptance does not imply
compliance with the owner's subsequent preference.

The four converter-core cases are FREE/Haiku Run 3, PRECISION/Luna 6 Run 1,
FREE/Luna 6 Run 3 and PRECISION/Luna 6 Run 3. They share a ten-MOS NMOS-input,
PMOS-load-mirror core and an NMOS-driven output with a converted PMOS bias.
Each complete ordered device/pin list is guarded separately, including its
actual series RC order and gain-node shunts. A mirrored converter gate faces
the receiving bias trunk; continuous IBIAS and converted-bias wires replace
the remote internal labels. Longer references are separated by staggering the
upper converter/output row, without reducing native text. The PRECISION Run 3
gain-to-VDD resistor uses a local supply symbol below it, an explicit supply
exception rather than an internal label jump. All four actual native, fitted,
desktop and narrow views were checked. The original importer preserves exact
models and values; the layout API's pin guards do not claim to validate values
it does not receive. Frozen-source electrical checks remain a separate gate.

WIDE/Haiku Runs 2 and 3 share a complete fifteen-MOS complementary-input graph
with a gain–capacitor–resistor–VOUT branch. Their separately guarded sources
retain their own dimensions, multiplicities, references and values. The PMOS
pair, upper tail and NMOS mirror form one complete group; the NMOS pair, lower
tail and PMOS mirror form the other. Both driven branches join the actual shared
gain riser. The upper converter diode is beside the PMOS tail; the lower
converter sink and IBIAS reference sit beside the NMOS tail. One continuous
converter current path and the lower bias trunk replace the former remote
controls. Local VDD/VSS load bars are permitted supply annotations, not internal
signal jumps. Actual native and fitted images show nearly unchanged width and
98 units less height, with unchanged native text. These two cases do not establish
a generic complementary-input layout or complete the remaining OTA review.

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
rewrites the 219 artifact directories and drawing index. For a single-run preview:

```sh
ATB_SCHEMATIC_RUN=ota-free-sky130-sonnet-5-5-r1 node tools/schematics/generate.mjs
```

This writes only that run's artifacts and leaves the index untouched; regenerate
the full set before building or publishing changed drawings. The bridge
exposes pinned native APIs; no PDK installation or gallery login is required for
local generation. Live gallery comparison requires separate browser access.

A trailing `*` selects a family for preview, for example
`ATB_SCHEMATIC_RUN='ldo-*'`. `ATB_SCHEMATIC_KEEP_GOING=1` collects preview failures
and still exits unsuccessfully if any occur; it never replaces the drawing index.
Serialize concurrent previews because the generator rebuilds a shared bridge
output directory. Neither preview mode relaxes electrical or routing checks.

## Separate verification gates

After saving/reopening, generation checks authored visible routes and bulk
defaults, orthogonal geometry, expected rounded label strings, native unrouted
connections and diagnostics. It exports and compares exact ordered external
ports, D/G/S/B or passive pin order, models, values, W/L, nf and m. All 219 drawings
must pass the exact source/export and saved-project electrical contracts.
The pinned ordinary export puts global power terminals first. Its comparison
therefore records one external port-order difference for each drawing, with
equal topology and no device, connection, model or parameter differences.
That ordinary export is not an interchangeable positional DUT interface. The
checked `exported.spice` uses `groundPin: "global"`, preserves the submitted
terminal order and is the file used by the exact electrical contract gate.
Two sources use expressions the pinned native comparator cannot resolve:
`ota-drive-sky130-sonnet-5-5-r3` uses numeric `.param` constants, and
`ldo-low-voltage-sky130-astra-r1` uses literal resistor arithmetic. Their native
comparisons are retained as inconclusive, while separate literal-value native
comparisons and independent exact ordered-pin checks pass. Definitions and
original expressions stay in the source, project and export. The parser accepts declared
numeric constants referenced as `{name}` and bounded literal arithmetic using
`+`, `-`, `*`, `/` and parentheses. Arithmetic uses exact rational comparison;
display rounding and the separate literal native comparison do not replace the
source expressions. Names inside arithmetic, calls, powers, excessive expression
size/magnitude and unresolved expressions fail. Omitted SKY130 `nf` and `m`
compare against defaults of one.
When reproducing an unchanged recipe, compare regenerated artifact hashes with
the saved set; matching source/export contracts alone do not prove reproducibility.

The sole source-open terminal is `XM5.D` on `S1` in
`ldo-low-voltage-sky130-deepseek-r2`. Its visible stub and complete native
`ERC_UNCONNECTED_PIN` warning are retained. The source-bound exception checks
the exact run, net, endpoint and diagnostic; it does not permit missing routes
elsewhere or repair the submitted circuit. Every other native diagnostic remains
a failure. Tests also derive each LDO's required continuous nets from source and
check physical route components for foreign-net endpoints independently of the
native logical netlist.

Review native renders at fit and reading sizes independently. Inspect actual
page rendering when available, including narrow layouts. Record the browser
coverage actually performed; source/CSS checks do not establish a mobile browser
review, and diagnostics do not establish readability or user acceptance.

The pinned ordinary export changes port order for each pilot while preserving
topology and parameters. `verification.json` records this difference separately.
The supplied checked export uses `{format: 'spice', groundPin: 'global'}` and
matches the submitted interface order for these two cases. Do not assume that
ordinary GUI export or this setting always preserves other interfaces. All current
OTA and LDO checked exports are verified individually; ordinary-export results remain
in each report.

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
accepts one subcircuit, the reviewed SKY130 four-terminal X calls, numeric R/C
values/parameters and the bounded constants above. Add deliberate support before using hierarchy, other expressions
or other devices; unsupported constructs must not silently pass.

For instructions-only maintenance, check references and build the site without
regenerating accepted drawings. Follow [Publishing](PUBLISHING.md) when publication
is part of the user's authorized task; changing a skill does not grant that action.
