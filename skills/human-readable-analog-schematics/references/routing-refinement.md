# Routing refinement

Prioritize correct, clear connectivity, recognizable circuit structure, then
unnecessary bends, length and empty gaps. Use gallery examples as visual evidence,
not proof of their electrical correctness.

## Match parts and taps before bending wires

- Align a sending-node tap with the receiving gate, including independent stages
  at different heights. Align an intervening R/C with the endpoints where useful.
- Use a shared trunk with short branches for multi-terminal nets, including
  internal bias. Trace from its generator through the trunk to every receiving
  gate without a name-only jump. Do not route each terminal separately toward an
  arbitrary center or duplicate one net's wire.
- Source declaration order need not choose the routing tree's root. Compare a
  local diode/drain root for a shared stage node before reaching remote taps.
  Retain the output-node order when it provides clearer passive and sensing trees.
- Keep shared complementary-input trunks distinct. One required perpendicular
  crossing is preferable to a long pair of tightly spaced parallel staircases.
- Attach supply shunts and direct input-to-output feed-forward parts near their
  actual nodes before accepting a bottom inventory row and a long return path.
- Check that a common gate trunk does not penetrate a symbol or touch a foreign
  terminal. Reconsider mirroring, device height or trunk position first.
- Move conflicting text before adding detours. Include full passive display strings
  when checking adjacent MOS names; widen only the locally competing interval.
  Inspect italic overhangs and displayed subscripts at their actual anchors.
  Recheck text against visible wires after automatic label-overlap recovery;
  clearing a label-to-label collision can move the text onto another conductor.
- If a rail meets an existing terminal exactly, end the native route there rather
  than adding a coincident junction and a zero-length connecting segment.

## Junctions and crossings

For the ATB profile, split a same-net four-way join into two nearby T-junctions.
Use only enough separation to make the dots distinct; do not enlarge the whole
component spacing. Maintain the divider's common vertical axis and offset its
CFF/FB taps locally. Do not transform a foreign-net crossing into a T-connection.

A new branch can form a four-way join inside an existing mandatory terminal
escape, even when moving its remote bias generator does not change that join.
For a source-specific recipe, the existing router's net-clearance zones can
protect the offending interior cell while leaving both the actual endpoint and
escaped search seed accessible. Check the resulting T-junctions and physical
continuity on the reopened project. Do not remove a pin, invent a junction or
weaken the four-way check to make a candidate pass.

A plain crossing beside a local diode-closure dot can still look like part of
that closure at page size. Compare a crossing in the open middle of the trunk,
or an outside return, while checking the actual receiving gate and symbol body.
Keep the crossing away from a junction by visual judgment; do not turn one
reviewed separation into a universal distance rule.

Reduce unconnected crossings through placement. Use one consistent no-dot
crossing convention for those that remain. Consider a short diagonal only when
it explains a symmetric cross-coupling clearly and the target tool supports it.
Count real directional branches, not mere route segments: splitting a straight
line does not create a bend or a junction.

A local device move can also move a nearby automatically routed bias return.
Recheck the new wire and label positions in the reopened image: raising a tail
device may leave the control bus close to its source stub, with the supply label
appearing to name the bus. Compare actual new clearance and label ownership;
clearance from the previous route does not establish an improvement.

Keep every declared external port when acting on an image advisor's feedback.
A floating-looking supply port calls for clearer placement, labeling or a visible
connection to the same supply node. Preserve its named interface terminal and
the applicable profile's power-label exceptions, then recheck the boundary.

## Separate drain trunks from local D–G ties

Joining the same electrical node at different places changes how a circuit reads.
Keep the D–G return as a short local branch; connect other returns to the drain
trunk when that exposes their function.

In the ATB LDO, `RB VOUT NB` returns to the RS–XMB drain trunk, while
`XMB NB NB VSS VSS` has a separate local D–G tie. Preserve NB electrically.
Compare aligned taps/RB placement before routing a long return; do not turn the
pilot's current branch height into a general placement rule.

## Preserve shared-bus corridors while compacting bias

Check resolved pins and mandatory terminal escapes before moving a tail closer
to its input pair. Closer body centers can create an up-and-down source-bus jog
when the escaped endpoints no longer share a row. Align the actual escape seeds
and review the resulting shared bus; do not choose spacing from body centers alone.

Shortening a complete bias branch can put its current path across a mirror or
cascode-control bus. In the DRIVE refinement, that produced two large bottom
rectangles despite a smaller placement box. Restore a clear bus corridor, turn
a receiving gate inward where appropriate while retaining its resolved D/S axis,
and move the complete generating path before accepting the shorter branch pitch.
Move small junction safeguards with the actual relocated gate; an obsolete broad
reservation can block a newly placed pin or force an unnecessary detour.

Keep supply-label ownership visible at reading size. The native drawing helper's
`boundLabel` accepts an existing junction key, not a device-pin key. Retain that
same-net junction and compute the display offset from the intended source pin
when a remote automatic label floats away. Inspect actual glyphs against nearby
bus lines and references; correct binding alone does not prevent misattribution.

Record the owner's latest image criticism even after an earlier review accepted
the drawing. Ask for a whole-image verdict against the published image at the
same width, and retain any remaining detours or whitespace in the result. Local
delta acceptance, reduced dimensions and exact connectivity are separate facts.

Recheck a matched sibling with its own reference strings and actual display
values. The DRIVE Sonnet case retained longer bias names and parameter
expressions while reusing the reviewed current-path relationships; that still
required a new native image and a separate whole-image verdict. Image advisors
can misname a generator or a net. Use their observations to assess readability,
and verify any proposed electrical interpretation against the submitted source.

## Simplification pass

1. Trace main signal, compensation, feedback and shared bias end to end.
2. Challenge each bend, reversal and broad gap against an actual obstacle or
   reading need. Compare moving taps, labels, receivers and local groups. For an
   LDO, try a compact sensing-to-input path before an outside corridor. Do not
   extend the return merely to preserve a previous template.
3. Shorten or straighten routes without introducing symbol penetration, unclear
   joins or text crowding. Retain useful local D–G branches and shared-node shapes.
4. Render the actual native project at fit and reading sizes, then verify saved
   and reopened connectivity and values separately.

Require successful generation and matching native instance poses before reviewing
a new image. A previous native project can still pass the electrical comparison
after a layout generation fails. Mark retained images as stale in that case;
compare the current recipe's device coordinates with the reopened project before
submitting a fresh image review. Check that an advisor identifies the actual
changed device, and keep unresolved findings open when it discusses another one.

Do not accept a diagram solely because diagnostics, bend count or total wire
length look favorable. Explain a remaining detour by its specific constraint,
not a general prohibition on labels or crossings.
