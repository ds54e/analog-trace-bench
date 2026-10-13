---
name: human-readable-analog-schematics
description: "Redraw or review readable transistor-level OTA, op-amp, LDO, current-mirror and bias schematics while preserving exact SPICE connectivity and editable native projects. Use for analog schematic placement, wiring, labels and saved-project verification. Exclude PCB layout, simulation-only work and decorative illustrations."
---

# Human-readable analog schematics

Make function and current paths recognizable from placement and wiring. Treat
electrical fidelity and visual readability as separate acceptance gates.

## Inputs and scope

Use the authoritative SPICE, DUT boundary, existing native project when available,
and the requested change. Obtain missing essential source data before drawing;
infer routine presentation choices from the current repository and user profile.
Choose the smallest scope that satisfies the request:

| Change | Edit | Preserve |
|---|---|---|
| Placement or wiring | Native project and reproducible recipe | Exact electrical contract and recorded evidence |
| Diagram label position or spelling | Native annotations and recipe | Other geometry and exact parameters |
| Page position, size, caption or links | Page renderer or CSS | SVG, native project, recipe and SPICE |
| Skill or documentation | Instructions and references | Accepted drawing and site artifacts |

## Read the applicable references

| Task | Reference |
|---|---|
| Placement, density or labels | [Drawing rules](references/drawing-rules.md) |
| Wiring or placement refinement | [Routing refinement](references/routing-refinement.md) |
| Analog Canvas import, save, render or export | [Native workflow](references/analog-canvas-workflow.md) |
| Select or compare a visual motif | [Gallery evidence](references/gallery-evidence.md) |
| Human-drawn reference comparison and representative corrections | [Human reference motifs](references/human-reference-motifs.md) |
| Apply a reviewed motif to a topology family | [Topology family reuse](references/topology-family-reuse.md) |
| ATB submitted-circuit presentation | [ATB profile](references/atb-profile.md) |
| Review or update this skill | [Acceptance cases](references/acceptance.md) |

Read only the references relevant to the requested change. When live gallery
comparison is requested, inspect actual examples in the browser and record URLs,
dates, observations and limits; request sign-in when required. Existing notes
are useful context, not evidence of a new visit.

## Workflow

For native drawing changes:

1. **Freeze the electrical contract.** Record ordered external ports, device
   references, ordered pins including body, models, values or expressions,
   W/L, nf and m. Keep exact source parameters and submitted bytes authoritative.
2. **Place by connectivity.** Identify pairs, mirrors, stacks, stages, bias,
   compensation and feedback. Group related parts, preserve local symmetry and
   expose the main current paths. Match sending taps to receiving pins. Reuse a
   motif only after matching connections; equal device counts or names are insufficient.
   For a reference-led redraw, inspect actual primary-source figure pixels and
   identify the matching motif before placing individual parts. Anchor its source
   midpoint, local diode closure, receiving gate and owning passive endpoints.
   Circuit comments such as “folded” are hypotheses, not placement instructions.
3. **Route and simplify.** Keep local D–G ties, shared gates and the main loop
   traceable. Challenge unnecessary gaps and bends; move parts or labels before
   adding detours. Avoid symbol penetration and ambiguous intersections.
4. **Apply the display profile.** Keep readable text sizes and clear label owners.
   Format native display annotations separately from exact device parameters.
   Keep native drawing density separate from the requested page display size.
   Use the ATB profile only for ATB; do not export its rounding into SPICE.
5. **Save, reopen and verify.** Render and export from the reopened native project.
   Compare the frozen electrical contract, authored visible routes, body defaults
   and expected display strings. Retain reproducible generation when requested.
6. **Review the rendered result.** Inspect fit view and reading size, including
   actual value strings, current paths, feedback, crossings and label clearance.
   Check the target page when applicable. Report unavailable browser checks.
   Reject a fallback that leaves the principal stages, load mirror or compensation
   connected only by names. A component inventory is not a finished schematic.
   Compare before and after at the same intended page width. Judge whether a
   reader can recognize the circuit motifs and trace their relationships before
   considering area, length or bends. If the redraw substantially shrinks the
   displayed labels, revise spacing between intact groups or explicitly retain it
   as a comparison draft. Do not declare that trade-off solved by a matching netlist.
   Develop a few source-specific examples first; generalize only relationships
   that survived actual image review, retaining their topology limits.
   Inventory eligible source graphs before wider application. A matching MOS core
   does not imply matching bias, reference, compensation or sensing passives.
   Keep accepted examples and unmatched graphs unchanged; review representatives
   of each passive variant, input polarity and long-reference outlier.

For page-only changes, use the repository's site build and validation, then inspect
the published page at the requested size. Check that the current SVG is loaded;
do not regenerate native artifacts or claim a fresh save/reopen comparison.
For instructions-only changes, validate the skill, references and site integration.

## Completion and delivery

Require separate evidence for applicable electrical comparison and visual review.
A matching netlist or zero diagnostics alone does not establish readable geometry. Retain
an inspectable native SVG, editable project and supporting source/export/check
artifacts. Report actual checks and material differences briefly; do not imply
that drawing verification reran a historical simulation.

Follow repository integration and publication instructions already authorized by
the user. This skill does not itself authorize publication or edits to recorded
benchmark evidence. Keep ATB's visible presentation minimal as specified in its
profile. Keep circuit coordinates in recipes and tool-version findings in
references; promote only observed, transferable judgments into drawing rules.
