# ATB presentation and source contract

Apply this profile to ATB submitted-circuit drawings. These are confirmed user
preferences and current pilot constraints, not general analog-drawing standards.

## Visible presentation

- Place the diagram in Final submission above the unchanged submitted SPICE.
- Show only compact `SVG` and `Project` links below it.
- Keep circuit descriptions, body/unit/crossing notes, verification prose and
  device tables out of the visible trace. Keep their data in supporting artifacts
  and repository documentation. Preserve useful image alt text for accessibility.
- Keep text and symbol sizes readable. Reduce empty gaps, wire length and detours
  through placement and routing rather than smaller text or horizontal scaling.
- Use a white SVG surface in either page theme. Retain the focusable horizontal
  scroll region on narrow layouts rather than shrinking labels to fit.

## Display values and exact parameters

Show passive values to about two significant digits using short SI prefixes.
Round the numeric display before selecting the prefix. Do not pad trailing zeros
just to advertise a precision level.

| Exact source value | Diagram text |
|---|---|
| `92590.0` | `93k` |
| `101200.0` | `100k` |
| `150000.0` | `150k` |
| `2000000.0` | `2M` |
| `1.5e-12` | `1.5p` |
| `2.5e-12` | `2.5p` |

`M` means mega in diagram text only. SPICE treats `M` as milli; retain numeric
notation or `meg` in parameters and exports. Preserve W/L, nf and m separately.
Compare reopened annotations with the expected rounded display, and compare
source/export parameters exactly. Rounded labels are never the comparison input.

The pinned runtime uses literal native value annotations. They survive reopening
but do not update themselves after GUI parameter edits. Refresh their text from
saved parameters when editing a copy; the pilot generator reconstructs frozen
submissions and is not a general GUI-edit round-trip tool.

## Pilot constraints

| Pilot | Preserve when refining |
|---|---|
| OTA-FIXED / Opus 5.5 / Run 1 | Keep XMbn horizontally mirrored, its D–G tie local, and the shared gate to XMtl continuous. Keep Cc–Rz between n1 and vout. |
| LDO-CORE / Sonnet 5.5 / Run 1 | Keep R1/R2 on the column directly beneath XMP's drain, with CFF beside R1. Show the FB return and distinguish the NB drain trunk from the local XMB D–G tie. Preserve G–C1–NZ–RZ–VIN. |

These constraints do not prescribe fixed coordinates or require every future
OTA/LDO to share the same topology. Confirm device roles from each source.

## Integration

Read `docs/SCHEMATICS.md` in the target repository for artifact paths, the pinned
runtime and build commands. Preserve submitted SPICE, canonical trace fragments,
evaluation files and recorded results. Keep source/export verification and native
projects even though their details are no longer printed below the diagram.
