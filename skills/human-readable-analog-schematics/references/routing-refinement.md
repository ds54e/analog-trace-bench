# Routing refinement

Prioritize correct, clear connectivity, recognizable circuit structure, then
unnecessary bends, length and empty gaps. Use gallery examples as visual evidence,
not proof of their electrical correctness.

## Match parts and taps before bending wires

- Align a sending-node tap with the receiving gate, including independent stages
  at different heights. Align an intervening R/C with the endpoints where useful.
- Use a shared trunk with short branches for multi-terminal nets. Do not route
  each terminal separately toward an arbitrary center or duplicate one net's wire.
- Check that a common gate trunk does not penetrate a symbol or touch a foreign
  terminal. Reconsider mirroring, device height or trunk position first.
- Move conflicting text before adding detours. Include full passive display strings
  when checking adjacent MOS names; widen only the locally competing interval.
- If a rail meets an existing terminal exactly, end the native route there rather
  than adding a coincident junction and a zero-length connecting segment.

## Junctions and crossings

For the ATB profile, split a same-net four-way join into two nearby T-junctions.
Use only enough separation to make the dots distinct; do not enlarge the whole
component spacing. Maintain the divider's common vertical axis and offset its
CFF/FB taps locally. Do not transform a foreign-net crossing into a T-connection.

Reduce unconnected crossings through placement. Use one consistent no-dot
crossing convention for those that remain. Consider a short diagonal only when
it explains a symmetric cross-coupling clearly and the target tool supports it.
Count real directional branches, not mere route segments: splitting a straight
line does not create a bend or a junction.

## Separate drain trunks from local D–G ties

Joining the same electrical node at different places changes how a circuit reads.
Keep the D–G return as a short local branch; connect other returns to the drain
trunk when that exposes their function.

In the ATB LDO, `RB VOUT NB` returns to the RS–XMB drain trunk, while
`XMB NB NB VSS VSS` has a separate local D–G tie. Preserve NB electrically.
Compare aligned taps/RB placement before routing a long return; do not turn the
pilot's current branch height into a general placement rule.

## Simplification pass

1. Trace main signal, compensation, feedback and shared bias end to end.
2. Challenge each bend, reversal and broad gap against an actual obstacle or
   reading need. Compare moving taps, labels, receivers and local groups.
3. Shorten or straighten routes without introducing symbol penetration, unclear
   joins or text crowding. Retain useful local D–G branches and shared-node shapes.
4. Render the actual native project at fit and reading sizes, then verify saved
   and reopened connectivity and values separately.

Do not accept a diagram solely because diagnostics, bend count or total wire
length look favorable. Explain a remaining detour by its specific constraint,
not a general prohibition on labels or crossings.
