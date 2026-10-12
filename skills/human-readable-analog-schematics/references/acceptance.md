# Skill acceptance cases

Use these cases when changing the skill. They specify expected behavior; they are
not a claim that every prompt has been run by an agent or tested for automatic
invocation. Keep electrical and visual outcomes independently assessable.

## Invocation and scope

| Representative request | Expected behavior |
|---|---|
| Redraw this OTA SPICE as an editable, readable schematic. | Apply the drawing/native workflow; inspect connectivity before placement. |
| Improve the LDO Final submission diagram in ATB. | Apply drawing rules and ATB profile; preserve the frozen submission. |
| Only shorten 92.59k and 101.2k in the accepted drawing. | Change native display annotations to 93k/100k; keep geometry and exact parameters. |
| Remove the links beneath Final submission and display the diagram at about 80%. | Change page presentation only; retain native artifacts and frozen submission bytes. |
| Consolidate the drawing skill and documentation. | Update instructions only; do not redraw accepted circuits or alter run evidence. |
| Run an OTA AC simulation, place a PCB, or make a decorative circuit image. | Do not implicitly select this drawing skill for the unrelated task. |

## Artifact checks

For a drawing change, use the applicable native regeneration and site commands
in `docs/SCHEMATICS.md`. Existing repository checks cover source binding, exact
ordered interfaces/pins/parameters, changed artifacts, unsupported syntax and
preservation of submitted bytes. Native generation checks reopened route
connectivity, bulk defaults, display strings, diagnostics and unrouted connections.

For display rounding, inspect saved/reopened labels separately from exact export
parameters. Include a prefix carry and SPICE `M`/`meg` distinction when changing
the formatter. For presentation, inspect each affected figure: no SVG/Project
links or caption should accompany the image; check the requested display scale
and narrow-view scrolling. Submitted SPICE remains immediately available.

For instructions-only changes, validate frontmatter, linked resources, metadata,
reference consistency and repository discovery. Build/check the site to catch
integration drift; do not regenerate accepted drawings merely to review prose.

## Visual review

Inspect native rendering at fit and reading sizes. Check recognizable groups,
vertical current paths, local D–G ties, shared gates, main loop, intersections and
actual label strings. Confirm the ATB pilot-specific constraints where applicable.
Record actual browser coverage and explicit gaps; do not use diagnostics or wire
length as a substitute for visual review.

## Independent skill review

When forward-testing a substantial revision, give another agent a realistic task,
the skill path and raw artifacts. Keep the request separate from the intended
answer or prior diagnosis. Scope review runs to read-only work where appropriate;
do not let a skill evaluation publish changes or overwrite accepted artifacts.
Distinguish manual review, a completed agent exercise and actual host-trigger
coverage in the reported results.
