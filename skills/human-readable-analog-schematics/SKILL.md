---
name: human-readable-analog-schematics
description: "Create, redraw, or review readable transistor-level analog schematics while preserving SPICE topology and values. Use for OTA/op-amp/LDO/current-mirror/bias circuits and Analog Canvas MCP/headless drawing. Not for PCB layout, simulation-only work, or decorative circuit illustrations."
---

# Human-readable analog schematics

Make circuit function recognizable from placement and wiring. Electrical fidelity and visual readability are separate acceptance gates; zero diagnostics proves neither on its own.

## References

- Read [drawing rules](references/drawing-rules.md) for placement, density and the user's label/value preferences.
- For placement or wiring changes, apply [routing refinement](references/routing-refinement.md), including the mandatory simplification pass.
- Use [gallery evidence](references/gallery-evidence.md) to choose a comparable visual motif. Copy relationships, never topology or omitted values.
- For Analog Canvas/SPICE work, read [native verification workflow](references/analog-canvas-workflow.md), including version-specific export and M-display limitations.

## Workflow

1. **Freeze the source contract.** Record source/version, DUT boundary, ordered external ports, device references, ordered pins including body, models, values/expressions, W/L, nf and m. Preserve uncertain constructs; do not invent circuit functions or add testbench devices.
2. **Identify functional groups.** Find pairs, mirrors, stacks, gain/output stages, bias, compensation and sensing/feedback. Establish the reading path from connectivity before placing symbols.
3. **Place for short connections.** Preserve local symmetry and vertical current paths. Align receiving pins with sending-node taps; move parts before accepting doglegs. Compact each functional group using actual text/wire bounds, especially in LDOs. Do not reserve uniform padding where nothing needs it.
4. **Route explanatory paths visibly.** Keep local mirrors, compensation and the main feedback loop traceable. Use short shared trunks and minimal T-junction offsets. Distinguish the drain trunk from its local D–G tie even when both are one electrical node. The routing reference defines these conventions and exceptions.
5. **Apply the label profile.** Put MOS names beside their bodies, passive names/values in a close aligned pair, port names at ports and internal labels above their own wire. For ATB, display passive values to about two significant digits and mega as `M`; preserve exact SPICE parameters, including safe `meg` spelling. Preserve full device data and body-tie conventions in the project and supporting artifacts.
6. **Simplify and inspect.** Challenge every unnecessary bend and empty gap before reviewing native renders at fit view and reading size. Include the actual passive value strings when checking neighboring MOS names; symbol bounds alone miss text collisions. Do not shrink text to make the circuit compact. Reconsider placement when the user finds a path confusing, even if it is electrically equivalent.
7. **Verify from the saved project.** Reopen and export; compare ordered pins, models, all parameters and external port order against the source. Check authored visible route connectivity, body defaults and displayed values on that reopened data as well. Retain reproducible generation when requested and state whether simulation was actually run.

## Deliver

For drawing work, provide inspectable SVG and editable native project, original/generated netlists, comparison results and necessary device details. Explain the dominant signal/feedback path and any label-based discontinuities or remaining ambiguities. Distinguish author visual review, user acceptance and historical benchmark results.

For ATB Final submission, show the drawing with only compact SVG/Project links.
Keep circuit descriptions, body/unit/crossing notes, verification prose and
device tables in supporting artifacts or documentation; do not append them to
the visible trace. Retain electrical validation regardless of presentation.

For a rules-only request, update the rules without redrawing accepted circuits. Preserve the user's existing scope, branch and publication constraints; applying this skill does not grant permission to publish.
