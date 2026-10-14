# Topology family reuse

The 2026-10-13 ATB inventory individually checked all 219 final submissions,
their 3,563 devices and ordered terminals. Neither human-reference representative
has another complete graph match once every passive is included. Reuse a named
subnetwork only after matching its actual pin relationships and endpoint roles.

## Eligibility before placement

Anchor external inputs, output and supplies. Match ordered MOS D/G/S/B pins,
model types, shared-source and diode relationships, then identify the actual
driver. Separately classify every passive by ordered endpoints and role. Keep
each source's exact values, dimensions, multiplicities and expressions.

The ATB census found 32 direct-pass seven-MOS LDO cores, spread across 21 complete
passive graph families. The accepted Core/Sonnet pilot and the source-specific
Core/Astra ladder remain separate recipes. Extra transistor stages, reference
translators, output-dependent bias and other passive variants are separate cases;
they cannot inherit a plain bias-and-divider drawing by device count.

The current-subtracting Precision/Sonnet OTA is unique. Its FA/V1 branches are
not a cascode motif and cannot be cloned into ordinary two-stage OTAs. The
ordinary eight-MOS PMOS-output family has 48 existing source-matched recipes,
one retained pilot and four circuits with an extra capacitor. The extra
capacitor belongs respectively to IBIAS–VSS, the load-diode node–VSS or
VDD–IBIAS. These endpoint differences require separate placement and routes.

The implemented family scope is deliberately narrower than the MOS census:

| Family | Runs | Source-specific passive roles |
|---|---:|---|
| Direct-pass LDO | 8 | VIN-fed resistor/diode bias and VOUT–FB–VSS divider |
| Direct-pass LDO with feed-forward capacitor | 4 | Same complete core plus the capacitor across the upper divider resistor |
| Ordinary two-stage OTA with bias shunt | 2 | IBIAS–VSS capacitor beside the local diode reference |
| Ordinary two-stage OTA with mirror shunt | 1 | Diode-load node–VSS capacitor beside the load mirror |
| Ordinary two-stage OTA with supply/bias capacitor | 1 | VDD–IBIAS capacitor beside the local reference branch |

Frozen source hashes and complete pin-role guards in
[the LDO recipe](../../../tools/schematics/ldo-direct-pass-motifs.mjs) and
[the OTA extension](../../../tools/schematics/ota-passive-variants.mjs) identify
the exact admitted runs. Two additional LDOs with a gate-to-output capacitor
were identified but deferred for a separate compensation review. The remaining
seven-MOS passive families retain their previous layouts. Later owner-directed
wire-first corrections add these separately guarded ten-MOS converter-core cases
in [human-reference-layouts.mjs](../../../tools/schematics/human-reference-layouts.mjs):

| Exact source | Passive roles |
|---|---|
| OTA-FREE / Haiku / Run 3 | Gain–C1–NZ–RZ–VOUT |
| OTA-PRECISION / Luna 6 / Run 1 | Gain–CCOMP–NCOMP–RCOMP–VOUT, with reversed source pin order |
| OTA-FREE / Luna 6 / Run 3 | Gain–RZ–NC–CC–VOUT and a gain-to-VSS resistor |
| OTA-PRECISION / Luna 6 / Run 3 | Gain–RZ–NZ–CC–VOUT and gain-to-VDD/VSS resistors |

Their common ten-MOS core has a differential NMOS pair, PMOS mirror loads,
NMOS-driven output and PMOS diode/NMOS sink bias converter. It is neither the
ordinary PMOS-output eight-MOS core nor the unique current-subtracting OTA.
The extension checks the whole ordered reference/kind/pin list, including every
passive and MOS body, for each exact run. Extra, missing or foreign-pin devices
fail. The layout API supplies no model or parameter strings; unchanged native
import and independent frozen-source contracts preserve those exact properties.
Do not describe these pin guards as raw-source hash or value validation.

WIDE/Haiku Runs 2 and 3 additionally share a complete seventeen-device graph:
fifteen MOS devices, then a gain–capacitor–resistor–VOUT branch. Both complementary
input pairs have their own mirror load and rail-side tail; their driven branches
join the same gain node. That node drives a PMOS output, with an IBIAS-controlled
NMOS sink. A PMOS diode/NMOS sink converter controls the PMOS tail. Match all
ordered pins and the complete expected reference/kind list separately for each
run before using the scoped complementary recipe in the same extension.
Their dimensions and multiplicities differ materially and remain source-derived.

PRECISION/Astra Run 1 and PRECISION/Sonnet 5.5 Run 1 share a complete
eighteen-MOS folded-cascode graph with three passives: a supply resistor before
the PMOS cascode-reference source, a resistor below the NMOS cascode-reference
source and a VOUT-to-VSS shunt capacitor. Their PB/PC/NC equivalents each retain
their whole generating current path. They are not Miller two-stage circuits.
The two exact sources have separate whole ordered reference/kind/pin guards;
their values, W/L and multiplicities remain source-derived. Horizontal reflection
keeps Sonnet's output on the right while preserving each resolved MOS pin axis
and passive pin order. Recheck annotations and routing for the new source: its
longer bias name did not fit inside the same diode closure, and its generator
reference needed a local branch shift to clear the output column. Complete graph
eligibility does not establish identical label clearance or routing trees.

DRIVE/Opus 5.5 Runs 1 and 3 and DRIVE/Sonnet 5.5 Run 3 share a complete
twenty-MOS, two-resistor current-mirror graph: NMOS input pair, own PMOS diode
loads and outer mirrors, PMOS cascodes, a wide-swing NMOS sink mirror, and three
complete bias paths, two containing resistor offsets. Each exact source retains
its own whole ordered reference/kind/D/G/S/B and resistor-endpoint guard. Keep
their differing resistor values, W/L, nf/m and Sonnet's `lm`/`lc` expressions
source-derived; a topology match does not authorize copying parameters.

A sibling's source declaration order can differ from the reviewed representative.
Use an explicitly matched role order for routing-tree construction when needed,
while preserving the source order and native electrical declarations. Recheck
the actual target names and rendered values: longer references can change the
router's text reservations even when every device position is retained.

## Reading-size lessons from actual images

For the Core/Astra representative, shortening unused output/injection stubs and
the lower reference leads recovered text size while retaining the pair, tail,
load mirror, parallel reference ladder and sensing network. The final feedback
rise meets the actual input gate and crosses the bias trunk in its open span,
away from the local diode dot. Native symbol clearance and page-size association
were checked separately. The values and reference labels retained their owners.

For Precision/Sonnet, shortening the V1-to-XM6 gap and output stub preserved the
current-subtracting core and local RZ–CC branch. The receiving stage remained
distinct. Neither correction required reducing native text or compressing the
input-pair motif.

The four converter-core corrections face the converter sink's gate toward its
reference/tail trunk and route converted PMOS bias to the actual output receiver.
Staggering the upper converter and output row clears long references without
widening the whole canvas. The RC order and gain shunts remain source-specific.
Both native and fitted images were reviewed individually, then actual desktop
and narrow pages were checked with the unchanged representatives as controls.

For the WIDE/Haiku pair, putting the PMOS-input group above the NMOS-input group
places each tail beside its rail and corresponding bias receiver. Each pair,
tail and mirror remains recognizable; one gain riser joins both complete groups.
The converter diode faces the upper tail, while its sink and the IBIAS reference
face the lower tail's bias trunk. Local load-mirror supply bars avoid routing one
input block's supply through the other block. These are supply exceptions only;
all internal controls remain physically wired. Review the entire converter
current path and both plain crossings, not just the smaller height.

Review a simple member, each passive endpoint variant and a long-reference or
unusual-polarity member at native and actual page sizes. Inspect all changed
drawings after generation. Keep the unchanged accepted examples as controls.
Use source guards for deliberately scoped family recipes; a changed or extra
device should fail the guard, not silently disappear into a familiar picture.

Electrical comparison, source preservation and reproducibility remain separate
gates. Native bounds describe a result; they do not establish visual acceptance.
Technical review is not owner acceptance or publication authorization.
