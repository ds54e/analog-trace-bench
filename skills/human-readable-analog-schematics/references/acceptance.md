# Skill acceptance cases

Use these cases when changing the skill. They specify expected behavior; they are
not a claim that every prompt has been run by an agent or tested for automatic
invocation. Keep electrical and visual outcomes independently assessable.

## Invocation and scope

| Representative request | Expected behavior |
|---|---|
| Redraw this OTA SPICE as an editable, readable schematic. | Apply the drawing/native workflow; inspect connectivity before placement. |
| Add drawings to every OTA run. | Enumerate catalog coverage; derive each layout from its own submission, verify every saved export, and review all rendered runs. |
| Improve all OTA compositions and add diagrams to every LDO run. | Inventory actual final submissions, preserve accepted simple motifs, review both canvas dimensions, place related bias groups nearby, and derive each LDO's pass/driver/sensing/feedback layout from its own source. |
| Improve the LDO submitted-circuit diagram in ATB. | Apply drawing rules and ATB profile; preserve the frozen submission. |
| Only shorten 92.59k and 101.2k in the accepted drawing. | Change native display annotations to 93k/100k; keep geometry and exact parameters. |
| Align the accepted OTA's Cc and Rz labels. | Edit native label anchors; preserve placement, wiring, values and interface. |
| Move LDO RB above the input pair or CFF inside R1. | Refine native geometry from actual endpoints; save/reopen and compare exact source, then review the render. |
| Move the diagram beneath Run selectors, retain final SPICE and display it at 60%. | Change page presentation only; keep SVG, native project, recipe and SPICE unchanged. |
| Draw VSS horizontally like VDD. | Change the native port presentation and label position; preserve the named interface and exact source contract. |
| Some OTA-FREE drawings look unfinished. | Review every affected run; replace fragmented principal paths with case-matched continuous wiring, while checking exact source fidelity separately. |
| These schematics look unnatural; use human-drawn examples from the internet and Gallery. | Inspect actual accessible reference figures and current target images. Match motifs to ordered source pins, prepare a few representative before/after drawings, judge branch ownership and intended reading size, and preserve exact contracts before generalizing. Distinguish personally inspected pixels from delegated Gallery evidence and obtain authorized access rather than bypassing sign-in. |
| Consolidate the drawing skill and documentation. | Update instructions only; do not redraw accepted circuits or alter run evidence. |
| Run an OTA AC simulation, place a PCB, or make a decorative circuit image. | Do not implicitly select this drawing skill for the unrelated task. |

## Artifact checks

For a drawing change, use the applicable native regeneration and site commands
in `docs/SCHEMATICS.md`. Existing repository checks cover source binding, exact
ordered interfaces/pins/parameters, changed artifacts, unsupported syntax and
preservation of submitted bytes. Native generation checks reopened route
connectivity, bulk defaults, display strings, diagnostics and unrouted connections.
Coverage checks enumerate every catalog OTA and LDO run. Constant tests check
definitions, bounded arithmetic and exact values; unsupported expressions still
fail. Source-open diagnostic tests must reject a changed endpoint, run, net or
warning, and must not authorize additional missing routes.

For display rounding, inspect saved/reopened labels separately from exact export
parameters. Include a prefix carry and SPICE `M`/`meg` distinction when changing
the formatter. For presentation, inspect each affected figure: no SVG/Project
links or caption should accompany the image; check the requested display scale
and that the current SVG hash appears in its image URL. Confirm preserved native
artifact hashes. Check narrow-view scrolling separately when browser coverage is
available. Submitted SPICE retains its original Final submission position.

For instructions-only changes, validate frontmatter, linked resources, metadata,
reference consistency and repository discovery. Build/check the site to catch
integration drift; do not regenerate accepted drawings merely to review prose.

## Visual review

Inspect native rendering at fit and reading sizes. Check recognizable groups,
vertical current paths, local D–G ties, shared gates, main loop, intersections and
actual label strings. Confirm the ATB pilot-specific constraints where applicable.
Record actual browser coverage and explicit gaps; do not use diagnostics or wire
length as a substitute for visual review.
For a reference-led comparison, preserve recognizable motifs while adjusting
space between groups. Judge a centered source/tail handoff, local mirror closure,
actual receiving stage and passive endpoint ownership. Keep a wider draft's loss
of displayed text size explicit; technical visual readiness is not owner acceptance.

Reject a generic grouped fallback when its principal signal stages, load mirror,
folded current handoff or compensation must be reconstructed from repeated names.
Check the full circuit at the actual page size as well as enlarged details;
an enlarged fragment cannot establish that the complete drawing is readable.

## Independent skill review

When forward-testing a substantial revision, give another agent a realistic task,
the skill path and raw artifacts. Keep the request separate from the intended
answer or prior diagnosis. Scope review runs to read-only work where appropriate;
do not let a skill evaluation publish changes or overwrite accepted artifacts.
Distinguish manual review, a completed agent exercise and actual host-trigger
coverage in the reported results.
