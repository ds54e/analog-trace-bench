# Placement, density and labels

Use these visual judgments with the actual circuit. They are supported by the
recorded gallery comparisons, not a formal readability metric or circuit standard.
Use the ATB profile for its presentation preferences.

## Place recognizable functions

- Identify pairs, mirrors, cascodes, gain/output stages, bias, compensation and
  sensing/feedback from connectivity. Place related devices close together and
  leave separation where distinct functions need it; do not hide weak placement
  behind block frames or headings.
- Align corresponding differential branches, their loads and common nodes.
  Keep common-source and common-gate trunks short and local D–G ties visible.
- Start with higher potential above lower potential and vertical series current
  paths for ordinary single-supply circuits. Let connectivity decide exceptions.
- Start single-ended stage progression left to right. Favor local symmetry and
  loop structure for folded, differential or cross-coupled circuits. Do not fix
  input polarity to one side or align unrelated stages merely by transistor type.
- Resolve actual D/G/S/B geometry after rotation or mirroring. Do not exchange
  electrical pins to make a picture symmetric.

## Keep only useful space

- Judge each gap against actual text bounds, routing clearance or a functional
  separation. Do not reserve uniform label padding where no label needs it.
- Use actual symbols and rendered strings as the density scale. Move groups or
  labels before accepting a long route. Preserve text sizes; split a large drawing
  into useful views when one view cannot stay legible.
- Keep supply rails within the branches they serve. Do not draw a huge enclosing
  rail solely to reach remote auxiliary circuits.
- For suitable LDOs, compare a compact error-amplifier-to-pass-stage arrangement
  with sensing directly below the output. Preserve any real intermediate buffer.
  ATB's exact R1/R2/CFF placement belongs to its profile, not a universal rule.

## Expose compensation and feedback

- Show where a compensation branch connects and which stages it spans. Compare
  a nearby horizontal or vertical RC branch rather than banning either direction.
- Preserve RC order, intermediate nodes and endpoints. Do not convert a branch
  into familiar Miller compensation when its source connects elsewhere.
- Make the main feedback loop traceable. Try matching the sensing tap height to
  the receiving gate; do not require every return to use the bottom page edge.
- Prefer continuous wires for local mirrors, the principal signal path,
  compensation and the main loop. Name-based connections can reduce remote
  supply/bias wiring; verify names, case handling and scope with the native tool.

## Make labels belong to their objects

- Put MOS names beside their bodies, with matched distance/height for paired
  devices. Put passive names and values in a close two-line pair on the same side.
- Put port names near their ports and internal labels near the wire they identify.
  Choose a clear text location before spreading devices apart. Preserve all node
  names in the native data without printing every internal name.
- Check the complete displayed value against neighboring names and wires. Symbol
  clearance alone misses text collisions. Native renderer offsets are starting
  points for one tool version, not layout constants.
- Preserve exact parameters, models and body connections. If ordinary body ties
  are hidden, record their convention in supporting data. Draw nonstandard body
  ties explicitly and include all four pins in electrical comparison.

## Review

Trace current paths and the main loop at normal reading size; inspect junctions,
crossings, values and label ownership close up. Apply routing simplification.
Treat user-identified ambiguity as a reason to revisit placement even when the
netlist matches. Keep labels-only changes within their accepted geometry.
