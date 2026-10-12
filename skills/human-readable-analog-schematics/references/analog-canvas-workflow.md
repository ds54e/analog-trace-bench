# Analog Canvas / SPICE conversion workflow

These implementation findings were checked against `cascode-ai/analog-canvas` commit `37bccd4012764dce53b34927fa606c6f430296a2` (package 0.9.2), on 2026-10-11. Inspect the current version before relying on API names or defaults. Source: https://github.com/cascode-ai/analog-canvas/tree/37bccd4012764dce53b34927fa606c6f430296a2

## Place and draw

- Use the native import/project/symbol/render/export path. MCP local mode and the typed headless host can manipulate the same project representation. An SVG drawn independently does not prove that the saved project contains its visible electrical connections.
- Imported automatic placement can be a component shelf, not a readable schematic. Establish a functional placement plan before routing.
- At the recorded revision, a source bridge exposed `importSpiceSources`, `createLocalEditor`, `workspaceSvg`, `createDesignNetlistExport`, `parseProject`, and `serializeProject`. Use official available entry points where possible; avoid assuming the gallery requires publishing to produce a local drawing.
- Query native symbol geometry to resolve pins, rotations and mirrors; do not infer electrical pins from the pictured left/right/up/down orientation.
- Treat device memberships, visible wire routes, native labels and connectivity evidence consistently. Do not leave imported hidden connectivity as the sole reason a visibly disconnected diagram passes comparison. Verify each visible net component or explicit name-based connection.
- Preserve cell interfaces and body/default-net semantics. Never change a DUT's `VSS` to global SPICE `0` solely to obtain a ground-shaped icon.
- Render the actual final native project. Check fit view and detailed view for line/label clearance, readable labels, grouping and recognizable motifs. Automated visual diagnostics catch only a subset of these problems.

## Export and compare

### Mega display and native label formatting

For this user, render mega values as `M` while retaining `meg` in SPICE parameters. Never substitute `M` into a SPICE value: SPICE suffixes are case-insensitive and `M` denotes milli. Prefer a live, native value binding with an SI display formatter if the actual installed version supports it.

At the pinned 0.9.2 revision, `instance-value.ts` prints the authored parameter spelling. The bound-value `formatOverride` in `annotation-text.ts` is accepted only when its flattened text equals the live value, so it cannot change `3meg` to `3M`. The verified ATB workaround is a native instance-value annotation with literal display content anchored to the resistor instance; do not attach both a binding and literal content. Generate that text from the saved raw parameter, leave parameters/export unchanged, and check resolved display text against the parameter and exported SPICE after reopening. Do not patch only the SVG or hide a conflicting bound label underneath it.

These generated literal labels do not automatically follow later GUI resistance edits. State that regeneration is required after editing such values; retain live bindings for other values. Reinspect this limitation when upgrading Analog Canvas. Keep label positions in the native project so reopen/render reproduces the actual final image.

### Electrical comparison

- Record cell name and ordered external ports. For each selected device compare reference, model/subcircuit, ordered pins, numeric/expression parameters, W/L, m and nf. Treat unsupported devices and syntax as unsupported, not silently passing.
- A MOS D/S swap is not automatically acceptable; include body pins. Preserve X subcircuit calls as X calls when that is the source model representation. Do not invent MOS model cards.
- Compare numeric values with a parser aware of SPICE suffixes and units; do not use general floating-point string stripping. Preserve expressions or use an explicit supported canonicalization.
- At the recorded revision, default `workspaceNetlist(project)` used an export configuration that reordered power ports for the ATB DUTs. `createDesignNetlistExport(project, {format:'spice', groundPin:'global'})` preserved the original explicit interfaces in those two cases. This is an observed case-specific workaround, not a universal export setting; recompare each final export and ordinary GUI export.
- Native `compareNetlists` checked interface order and parameter differences. A lenient topology grade alone was insufficient: `gradeNetlists` could accept D/S interchange and did not establish parameter equality. Inspect current behavior rather than treating either API as an all-purpose equivalence proof.
- Export from the saved and reopened final project. Keep source, generated output, machine comparison report and unresolved differences together. If reproducibility is requested, pin code/dependencies, retain the layout recipe and compare regeneration hashes; separate timestamps/random IDs from deterministic artifacts.
- Run the authored-route graph and body-default checks on the reopened project too. A pre-save route graph plus a post-save logical netlist comparison does not establish that serialization retained the visible paths. The ATB recipe now derives `visible_wiring` from reopened route endpoints and rejects nonorthogonal or wrong-net routes there.
- A matching netlist is not a new simulation result. Report recorded benchmark scores as historical metadata and state whether PDK/model cards, simulator/version and run conditions were available and used.

## Evidence from the ATB prototype

ATB source commit: `9071d3cfef6340ad0f703a1e11bbf0ab44a00ef5` at https://github.com/ds54e/analog-trace-bench/tree/9071d3cfef6340ad0f703a1e11bbf0ab44a00ef5

The local OTA-FIXED / LDO-ALWAYS-ON examples (Opus 5.5 run 1) and OTA-FREE / LDO-CORE examples (Sonnet 5.5 run 1) passed ordered-pin/value/interface comparison, native reopen checks and deterministic regeneration. Visual refinements preserved these electrical contracts. Earlier electrically matching layouts still required changes to spacing, labels and bias routing; keep visual review independent of electrical verification. These are circuit-specific drawing recipes, not a universal automatic layout algorithm.

No upstream branch change or publishing is required for this workflow. Work in isolated local output directories when preserving a benchmark repository is part of the task.
