# ATB presentation and source contract

Apply this profile to ATB submitted-circuit drawings. These are confirmed user
preferences and current pilot constraints, not general analog-drawing standards.

## Page presentation

- Place the diagram immediately below the Run selector and before Run & evaluation,
  inside the selected run's panel. Keep SPICE in its original Final submission article.
- Omit captions, SVG/Project links, circuit descriptions, body/unit/crossing notes,
  verification prose and device tables below the diagram. Retain useful image alt
  text, native projects and supporting verification artifacts.
- Use 60% page figure width with preserved aspect ratio and a white drawing
  surface in either theme. Keep narrow-screen scrolling. Repository CSS minimums
  and image-cache handling belong to `docs/SCHEMATICS.md`.
- Treat page size as a presentation preference. Keep native text, symbols and
  geometry unchanged when adjusting that size. Solve native drawing density
  through placement and routing before choosing the web display scale.
- Draw VSS as a horizontal port, as used for OTA VDD; keep supply labels
  beside their actual port and preserve their named external terminals.

## Diagram labels and exact parameters

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
Compare reopened annotations with the expected rounded display, and source/export
parameters exactly. Rounded labels are never the electrical comparison input.
See [Native workflow](analog-canvas-workflow.md) for literal-annotation behavior
and refreshing labels after GUI parameter edits.

## Current pilot geometry

### OTA-FIXED / Opus 5.5 / Run 1

- Keep XMbn horizontally mirrored, its D–G tie local, and its shared gate to XMtl
  continuous. Keep the output sink gate on the lower shared bias trunk.
- Keep Cc–Rz between n1 and vout. Align both names and values above their branch.

### LDO-CORE / Sonnet 5.5 / Run 1

- Keep R1/R2 directly beneath XMP's drain, with CFF to R1's left. Preserve CFF
  across R1 only (VOUT–FB), with vertical connections to the upper and lower trunks.
- Run RB horizontally above the input pair, from XMP's drain to the NB drain
  trunk. Keep the FB return distinct from NB and preserve XMB's local D–G tie.
- Preserve the submitted G–C1–NZ–RZ–VIN compensation branch.

Keep these relationships without prescribing coordinates or imposing this layout
on every OTA/LDO. Confirm roles from each source. Crossings without dots remain
unconnected. NFET bodies use VSS/vss and PFET bodies VIN/vdd through saved cell
bulk defaults; verify all D/G/S/B pins even when body wires are omitted.

## Repository integration

Read `docs/SCHEMATICS.md` for paths, pinned runtime, regeneration and publication.
Preserve submitted SPICE, canonical traces, evaluation files and recorded results.
Keep source/export comparisons and editable projects even though their details
are not printed below the diagram. [Gallery evidence](gallery-evidence.md)
separates gallery comparisons from observations of the ATB drawings.
