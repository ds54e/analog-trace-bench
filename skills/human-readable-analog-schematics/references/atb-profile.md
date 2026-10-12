# ATB presentation and source contract

Apply this profile to ATB submitted-circuit drawings. These are confirmed user
preferences and current pilot constraints, not general analog-drawing standards.

## Visible presentation

- Place the diagram in Final submission above the unchanged submitted SPICE.
- Show the diagram without `SVG` or `Project` links below it; retain both artifacts.
- Keep circuit descriptions, body/unit/crossing notes, verification prose and
  device tables out of the visible trace. Keep their data in supporting artifacts
  and repository documentation. Preserve useful image alt text for accessibility.
- Preserve native text sizes and solve drawing density through placement and
  routing. The requested page display is about 80% of the former full-width view;
  apply uniform scaling to the page image, not changes to native drawing geometry.
- Use a white SVG surface in either page theme. Keep the page figure at 80% width
  with a minimum of 544 px, capped at the available width. Retain the focusable
  horizontal scroll region when the 544 px image exceeds a narrow viewport.

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
| LDO-CORE / Sonnet 5.5 / Run 1 | Keep R1/R2 on the column directly beneath XMP's drain, with CFF to R1's left and vertical connections to VOUT and FB. Run the RB branch horizontally above the input pair, from XMP's drain to the NB drain trunk. Show the FB return and distinguish NB from the local XMB D–G tie. Preserve G–C1–NZ–RZ–VIN. |

These constraints do not prescribe fixed coordinates or require every future
OTA/LDO to share the same topology. Confirm device roles from each source.

## Integration

Read `docs/SCHEMATICS.md` in the target repository for artifact paths, the pinned
runtime and build commands. Preserve submitted SPICE, canonical trace fragments,
evaluation files and recorded results. Keep source/export verification and native
projects even though their details are no longer printed below the diagram.
