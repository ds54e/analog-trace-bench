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

Review a simple member, each passive endpoint variant and a long-reference or
unusual-polarity member at native and actual page sizes. Inspect all changed
drawings after generation. Keep the unchanged accepted examples as controls.
Use source guards for deliberately scoped family recipes; a changed or extra
device should fail the guard, not silently disappear into a familiar picture.

Electrical comparison, source preservation and reproducibility remain separate
gates. Native bounds describe a result; they do not establish visual acceptance.
Technical review is not owner acceptance or publication authorization.
