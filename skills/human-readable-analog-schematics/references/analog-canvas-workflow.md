# Native Analog Canvas verification

Verified for ATB's two pilots with Analog Canvas 0.9.2, commit
[`37bccd4012764dce53b34927fa606c6f430296a2`](https://github.com/cascode-ai/analog-canvas/tree/37bccd4012764dce53b34927fa606c6f430296a2),
on 2026-10-12. Recheck API names and export/display behavior when changing versions.
For ATB, read `docs/SCHEMATICS.md` for installation and regeneration. Outside ATB,
use the installed runtime's supported interfaces rather than assuming that the
pilot generator or bridge exists.

## Native data and geometry

Use the native SPICE importer, project protocol, symbol resolver, routes, renderer
and exporter. Query actual pin geometry after each mirror/rotation. Preserve cell
interfaces and bulk-default semantics; do not substitute global `0` for a DUT
`VSS` merely to get a ground icon.

Use `parseProject` and `serializeProject` at the file boundary. In the pinned
serialized format, instance value labels can live under each instance's `labels`,
while parsed objects expose them through document annotations. Inspect normalized
native objects rather than assuming the file JSON is the in-memory schema.

The repository's `native-bridge.ts` exposes the pinned APIs used by its recipe:
`importSpiceSources`, `parseProject`, `serializeProject`, symbol resolution,
`createDesignNetlistExport`, `compareNetlists`, annotation/endpoint resolution,
connectivity indexing, diagnostics and `renderDocumentSvg`.

## Display annotations

Prefer a native live-value formatter when the installed version supports the
requested display. In 0.9.2, authored value spelling is printed directly;
`formatOverride` cannot turn live `3meg` into `3M`. ATB therefore uses literal
native instance-value annotations anchored to the instance. Keep one value label,
not a bound label hidden underneath another annotation, and do not patch only SVG.

Generate labels from exact saved parameters using the chosen profile; check their
resolved strings after reopening. ATB uses approximately two significant digits
and display `M` for mega. See the ATB profile for examples and scope. Keep exact
parameters unchanged and compare those independently through the exported SPICE.
Literal labels survive save/reopen but need refreshing after GUI parameter edits.

These offsets match the current pilot recipe at the pinned revision. They are
local native drawing units, not pixels, circuit coordinates or general rules.
Adjust for symbol shape, rotation, actual fonts and text width.

| Annotation | Native starting offset / alignment |
|---|---|
| MOS name | `(20, 5)`, start; mirrored `(-20, 5)`, end |
| Vertical passive name / value | `(16, -4)` / `(16, 14)`, start |
| Horizontal passive name / value | `(0, -32)` / `(0, -14)`, middle |
| Input port name | `(0, -12)`, middle |
| Output port name | `(16, 5)`, start |

## Save, reopen and compare

1. Save the complete native project and reopen it through the protocol API.
2. Check authored route endpoints against their assigned nets; require each
   visible non-body terminal to be reachable within its net. Check bulk defaults
   separately. Check route geometry on these reopened objects as well.
3. Resolve reopened passive labels and compare them with expected formatted text.
4. Export SPICE and compare cell name, ordered external ports, references,
   ordered pins including B, models, values/expressions, W/L, nf and m. Do not
   allow a D/S swap or collapse m/nf into width. Reject unsupported syntax rather
   than silently treating it as equivalent.
5. Inspect native routing guidance and diagnostics. Render the reopened project
   and review the drawing independently; a logical comparison can pass with
   missing explanatory paths, and diagnostics do not catch every text collision.
6. Retain source, export, comparison and generation/version information. When
   reproducibility is requested, compare regenerated artifact hashes.

Use a SPICE-aware numeric parser: suffixes are case-insensitive and `M` is milli.
Preserve unsupported expressions until their comparison is deliberately supported.
A topology grade alone is insufficient; the pinned `compareNetlists` output also
checks interface order and parameters.

## Export-order limitation

Ordinary exports changed the interface order on both ATB pilots. Their topology
and parameters still matched; `verification.json` records the port-order difference.
The checked exports use `createDesignNetlistExport(project, {format: 'spice',
groundPin: 'global'})` and preserve the submitted interfaces for these two cases.
This setting is a verified case-specific workaround, not a universal guarantee.
Recompare both ordinary and checked exports after any runtime or interface change.

## Reporting

Separate electrical results, visual review, browser checks and historical benchmark
results. A matching export is not a new simulation. Do not claim a fresh gallery
visit, mobile-width browser review or user acceptance from stored notes, static
CSS checks or the author's visual assessment. Follow the ATB profile's image-only
page presentation; retain technical details in artifacts and documentation.
