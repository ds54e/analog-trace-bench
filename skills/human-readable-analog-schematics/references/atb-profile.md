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

## Internal wiring and the owner-selected reference

The owner selected [OTA-FIXED / Sol 6 / Run 1](../../../site/schematics/ota-fixed-sky130-sol-6-r1/schematic.svg)
as a good composition on 2026-10-13. Its actual native image was inspected from
the published `c1b1aa66` artifacts. The common VDD rail is above and VSS below.
XM1/XM2 form a symmetric pair under XM3/XM4, with XMtl centered underneath.
Adjacent XMbn visibly connects to both XMtl and output sink XM8 through one
continuous bias network. The XM7/XM8 output stage is distinct on the right.
The n1 wire reaches XM7.G directly, with a short Cc–Rz branch to VOUT; Cc is 4p
and Rz is 2.2k. The na/n1/ntl names annotate existing wires.

- Wire internal signals and bias controls continuously, including auxiliary bias
  generators and every receiving gate. Repeated names must not skip an internal
  connection. Preserve external ports and agreed VIN/VDD/VSS supply symbols.
- Place related bias blocks near their consumers. Correct placement before
  substituting a long wire for a label jump. Keep local diode closures visible.
- Keep LDO sensing, feedback and compensation paths short and meaningful. Try
  aligning the sensing tap with its receiver and compare input/load orientation
  before committing to an outside return. A perimeter route needs a visible
  circuit-specific obstacle or clarity benefit; it is not mandatory.
- Compare recognizable groups, useful whitespace and both native dimensions at
  the same displayed width. Do not shrink one dimension at the expense of the
  other or of text readability.
- Reuse these relationships only for actual matching topology. The example's
  PMOS-driven output does not authorize changing a current-subtracting OTA,
  a cascoded branch, or an LDO's actual reference and sensing networks.

This preference supersedes earlier acceptance of auxiliary internal name-only
links or unnecessarily extended feedback returns. Earlier image reviews are
historical observations, not evidence that all current drawings meet this rule.

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
