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
  Keep source degeneration resistors with their input branches and expose their
  common tail. Two input-controlled devices tied to a supply are not thereby a
  differential pair.
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
  Treat a requested web display scale separately from native placement and text
  sizes; review readability again at that display size.
- Keep supply rails within the branches they serve. Do not draw a huge enclosing
  rail solely to reach remote auxiliary circuits.
- Compare the complete before/after drawings at the same displayed width, then
  inspect both native dimensions. A shorter sheet can become harder to read if
  the extra width shrinks every label in the page. Preserve useful whitespace
  and group boundaries instead of optimizing width, height or area alone.
- Before narrowing a functional group, challenge unused output stubs, the lead
  space around passives and the gap to the receiving stage. A shorter intergroup
  connection can recover page-size text without disturbing a recognizable motif.
  Review width and height together; describe the actual reading-size result
  rather than applying a universal canvas cutoff.
- Place auxiliary bias paths near the branches they control. Move a complete
  reference or divider as a functional group; use vacant space beside a short
  stage when that keeps the relationship clear. A mandatory bottom row can leave
  isolated islands and large empty corridors. Keep signal and feedback corridors
  open when comparing candidate positions.
- Reserve the actual wire corridors between distant endpoints. A rectangle
  spanning a diagonal connection can exclude a large empty region and force
  unrelated bias circuits into bottom islands. Inspect candidate pockets against
  actual routed wires after placement.
- A maximal series-chain detector can split a load mirror at a shared drain.
  Recover the source-matched mirror relationship before classifying the detached
  device as a stage or bias block. Put output-sensing devices beside their actual
  output and feedback nodes.
- Size paired branch spacing from the names that face the interior. Place long
  names and fixed terminal escapes before contracting gaps. Center-only spacing
  can leave a passive terminal starting inside a neighboring reference label.
- Reserve separate body, text and terminal-escape regions when choosing nearby
  passive slots. A single broad rectangle can reject usable corners and recreate
  the whitespace it was meant to remove. Include the local rail label of each
  supply-connected passive in that placement budget.
- Compare complementary input blocks by their actual gate-net identities.
  Reflecting a complete source-matched block can align shared inputs and remove
  a crossover ladder; preserve each device's pin identities and local current path.
- For suitable LDOs, compare a compact error-amplifier-to-pass-stage arrangement
  with sensing directly below the output. Preserve any real intermediate buffer.
  ATB's exact R1/R2/CFF placement belongs to its profile, not a universal rule.
  Identify the actual pass device, its gate driver and the sensed node from the
  source first. An input translator, output-dependent bias branch or compensation
  return to VIN must retain its own role and endpoints.

## Expose compensation and feedback

- Show where a compensation branch connects and which stages it spans. Compare
  a nearby horizontal or vertical RC branch rather than banning either direction.
- Preserve RC order, intermediate nodes and endpoints. Do not convert a branch
  into familiar Miller compensation when its source connects elsewhere.
- Make the main feedback loop traceable. Try matching the sensing tap height to
  the receiving gate; do not require every return to use the bottom page edge.
- For a parallel passive, compare either side of the branch it bypasses. Prefer
  the side with direct taps to its actual endpoints and adequate label clearance;
  do not make "inside" or "outside" a universal placement rule.
- Prefer continuous wires for internal signals and bias, including local mirrors,
  generators, receiving gates, compensation and feedback. Names identify a wire;
  they should not substitute for its connection. Follow the display profile for
  external-port and supply-symbol exceptions; verify their native scope. For ATB,
  the owner explicitly requires internal wiring, including auxiliary bias.
- In a folded circuit, show both the input drain tap and its receiving folded
  branch. In a cascoded mirror, show the actual drain that controls the shared
  gates, including any intervening cascode. Detached labels on each stage can
  preserve connectivity while concealing the circuit's operation.
- Put external ports at the branches they serve. Include the auxiliary bias
  port when moving its reference branch; retaining a remote old port can leave
  a long empty perimeter after the devices themselves are grouped correctly. A separate row of short,
  name-connected port stubs can look like an unfinished drawing. Compare a
  lower auxiliary-bias row when side-by-side bias branches make the main circuit
  excessively wide; keep both its current path and links to receiving gates
  physically continuous, without sending a control around an avoidable detour.

## Make labels belong to their objects

- Put MOS names beside their bodies, with matched distance/height for paired
  devices. Put passive names and values in a close two-line pair on the same side.
  For adjacent passives in one branch, align these pairs on the same side when
  clearance permits, so the labels read as a group.
- Put port names near their ports and internal labels near the wire they identify.
  Choose a clear text location before spreading devices apart. Preserve all node
  names in the native data without printing every internal name.
- Check the complete displayed value against neighboring names and wires. Symbol
  clearance alone misses text collisions. Native renderer offsets are starting
  points for one tool version, not layout constants.
  Check long reference names too; a compact layout that fits `XM1` may crowd
  `XINN` or `RCOMP`. Use the native font metrics when available, including
  alignment and subscripts. Check the target renderer's font fallback: its glyphs
  can be wider than native estimated metrics, so reserve a small tested allowance
  without shrinking text. A name-aligned label can cross an adjacent capacitor
  lead even when its own gate stub is clear. Check these at reading size; native
  electrical diagnostics do not establish text clearance. If every label candidate
  conflicts, revise the local placement instead of silently accepting the first
  candidate. Inspect near-collinear wire ends and crossings beside junctions at
  the actual page scale; a legal crossing can still suggest a false connection.
- Preserve exact parameters, models and body connections. If ordinary body ties
  are hidden, record their convention in supporting data. Draw nonstandard body
  ties explicitly and include all four pins in electrical comparison.

## Review

Trace current paths and the main loop at normal reading size; inspect junctions,
crossings, values and label ownership close up. Apply routing simplification.
Treat user-identified ambiguity as a reason to revisit placement even when the
netlist matches. Keep labels-only changes within their accepted geometry.
