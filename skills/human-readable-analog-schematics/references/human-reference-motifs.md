# Human reference motifs

## Public figures inspected, 2026-10-13

The following primary-source pages were downloaded locally, rendered and
inspected as actual images during the representative ATB redraw. They establish
visual relationships, not electrical equivalence with a submitted circuit. Link
to the sources; do not copy complete copyrighted figures into this repository.

| Source | Observed relationship | Application and limit |
|---|---|---|
| [Sam Palermo, TAMU, Simple OTA, slide 4](https://people.engr.tamu.edu/spalermo/ecen474/lecture13_ee474_folded_cascode_2stage_miller_ota.pdf#page=4) | Paired inputs share one row; their common source bar feeds a centered tail. Mirror gates face inward with a local diode closure. The reference branch is beside the tail. | Anchor the pair, mirror and tail as a motif. Retain source degeneration or an actual separate-source arrangement when present. |
| [Palermo, Two Stage Miller OTA, slide 16](https://people.engr.tamu.edu/spalermo/ecen474/lecture13_ee474_folded_cascode_2stage_miller_ota.pdf#page=16) | The receiving stage follows the first stage, and compensation visibly spans its input and output. Bias distribution has a recognizable shared role. | Match the receiving transistor and compensation endpoints first. The ATB Precision/Sonnet example drives an NMOS second stage; this figure drives a PMOS stage. Its series nulling resistor also needs local space. |
| [Behzad Razavi, The Low Dropout Regulator, Figure 11(b), PDF page 5](https://www.seas.ucla.edu/brweb/papers/Journals/BR_SSCM_2_2019.pdf#page=5) | A compact transistor error amplifier drives the adjacent upper pass element; the divider descends from output and its midpoint returns to an input. | Preserve this role hierarchy. ATB's supply-matching input networks and compensation remain explicit; do not add the figure's ideal source, load or missing buffer. |
| [Everett Rogers, TI, Basic PMOS LDO model, Figure 1](https://www.ti.com/lit/an/slyt194/slyt194.pdf#page=1) | The input/pass/output power path reads across the upper drawing, with output branches and the control loop below it. | Block-level grammar only; it does not establish transistor-level placement or justify adding output capacitance. |
| [Author-published SKY130 folded-cascode schematic](https://raw.githubusercontent.com/ridvanumaz/2AC_Folded-Cascode-OTA-with-SKY130-PDK/main/Results_schematics/cascode_schematic.png) | Input and folded-output columns retain matched transistor ranks; a separately identified bias circuit controls distinct rows. | Use for an actual cascode topology. The published project does not independently prove that every placement was manually authored. |

## Authenticated Gallery research by a separate worker

On the same date, the public-reference coordinator reported that its browser
worker authenticated with owner permission, selected **Human made**, and viewed
the following actual drawings. These are delegated visual observations. The
local executor did not receive or inspect those private screenshots, did not
transfer authentication, and did not bypass the earlier sign-in barrier.
The filter means “not marked AI-generated”; it is not proof of human authorship.

| Gallery example | Delegated observation | Limit |
|---|---|---|
| [OCL-LDO regulator — jjb2vms3c6](https://analog-canvas.tokenzhang.com/g/jjb2vms3c6) | First gain, second gain and output proceed left to right under shared supplies. Paired rows align; feedback returns along the lower outside corridor, while compensation stays near its owning nodes. | A different multistage topology, not a reason to add stages to ATB. |
| [5T-OTA — 9sc926amjy](https://analog-canvas.tokenzhang.com/g/9sc926amjy) | Pair, centered tail and upper mirror read as one motif; diode closure is local. Labels occupy open sides. Hollow ports differ from solid junction dots. | Five devices do not describe the larger current-subtracting OTA's additional branches. |
| [Basic Structure of Two-Stage OTA — aztzpg4vhj](https://analog-canvas.tokenzhang.com/g/aztzpg4vhj) | Bias sits left, the pair/tail center, and later branches right. Equal roles share heights; a few meaningful internal labels expose the handoffs. | Copy role relationships only after checking actual gate/drain nets. |
| [Folded-cascode OTA — 4m95qzfnyy](https://analog-canvas.tokenzhang.com/g/4m95qzfnyy) | Bias, input and stacked output regions are distinct; named bias buses occupy separate heights and corresponding cascodes align. | Requires actual cascode receivers, which the selected ATB Precision/Sonnet source lacks. |
| [5T-LDO — sahr77a4gy](https://analog-canvas.tokenzhang.com/g/sahr77a4gy) | A rotated pass device serves the upper power path; its control circuit is below with a short gate return. | Rotation should explain the circuit role. It is not a global styling variation. |

## Two source-specific ATB comparisons

These are local representatives developed from published `4ce4d788`. The first
drafts were saved at `a04028a`; the subsequent reading-size correction is described
below. Technical review does not establish owner acceptance.
Their editable recipes are in
[human-reference-layouts.mjs](../../../tools/schematics/human-reference-layouts.mjs).

### Core / Astra / Run 1 LDO

The [drawing](../../../site/schematics/ldo-core-sky130-astra-r1/schematic.svg)
uses two input/load columns, their actual source midpoint and a centered XNTAIL.
XNBIAS sits on the tail gate row, with RBIAS directly above its local diode.
The reference network is a two-section parallel ladder:

- VIN to REF: RREF1, in parallel with RREFAC then CREFAC through RAC.
- REF to VREF: RREF2, in parallel with CREF.

REF visibly feeds XNREF. CREF is not grounded. The pass gate/output branch is
GATE–CCOMP–CM–RCOMP–VOUT. CFF bypasses RFB1; RFB3 independently injects VIN into
FB. XPPASS remains one instance with its exact multiplicity. The published
`c1b1aa66` lower FB return enclosed the reference ladder. The current local
correction returns above that ladder, through an open amplifier corridor.

Image review rejected the first wider draft's approximately 20% loss of displayed
text size and the adjacent CREFAC/FB words. The next draft tightened space between
intact motifs, moved FB onto its sensing trunk and preserved label sizes. This
is a visual comparison gate, not permission to compress every circuit uniformly.

The follow-up compared actual 624-pixel SVG views. It shortened the unused VOUT
and sensing-injection stubs, moved the complete bias branch nearer the tail and
trimmed surplus leads in the lower reference ladder and outer return. Native
size changed from 1091×848 to 981×758, versus the original 971×776. Displayed
text is about 1% smaller than the original, rather than 11%. Actual image review
confirmed the recovered label readability without reducing native font sizes.

A tools-disabled Opus review on the owner's existing Max/Standard route accepted
the grouping but found that the first shortened feedback rise still looked like
part of the bias diode. Astra checked the actual pin and symbol coordinates and
moved that rise onto the receiving input gate's axis, with a plain crossing in
the open bias-trunk span. Fresh native and page-width pixels showed a separate
feedback return with no symbol or label contact. This observation supports the
routing rule about crossing association; the measured separation is not a
universal spacing requirement.

The owner-directed Opus correction removes the lower perimeter. Its FB path
crosses the REF riser and the open tail stem, away from pins and shared-source
dots. The bias/tail group moves together; the source bar and complete reference
ladder retain their source roles. The AC column moves inward to clear the full
RREFAC/CREFAC strings and CFF text. Actual native, 624-pixel and desktop/narrow
images were checked separately from all 219 electrical contracts. The FB return
is 880 instead of 1,240 units; total routed FB length is 1,300 instead of 1,660.
Native width is unchanged and height is almost unchanged. These describe this
source-specific result, not a universal spacing or wire-length acceptance rule.

### Precision / Sonnet 5.5 / Run 2 OTA

The [drawing](../../../site/schematics/ota-precision-sky130-sonnet-5-5-r2/schematic.svg)
retains the actual current-subtracting branches rather than adding a cascode:
FA joins XMPA.D, XM1.D, XMNA.D/G and XMNB.G; V1 joins XMPB.D, XM2.D, XMNB.D,
XM6.G and the compensation branch. The two receiving branches flank the input
pair. XMNA's diode closure stays local and the shared mirror gates use a distinct
lower corridor. One plain crossing of the tail stem remains away from its source
junction. V1 feeds NMOS XM6; XM7 remains controlled by VBP. The series branch is
V1–RZ–NZ–CC–VOUT. The published `c1b1aa66` revision used named remote auxiliary
bias controls, which the owner subsequently rejected. The local correction joins
VBP from the converter to all three receiving gates through one physical tree
and connects converter IBIAS to the reference/tail gate trunk. The converter
sink is mirrored while keeping its D/S column; its gate faces the receiving
trunk. One VBP annotation remains on that wire. The IBIAS port taps the lower
trunk, with its circle separated from the junction dot. Both bias nets now
participate in the reopened-project physical-continuity check. This is a
source-specific correction, not a new topology or a catalog-wide completion.

The follow-up left these input, subtracting and bias motifs intact. It shortened
the V1-to-XM6 intergroup connection, series-compensation span and output stub.
Native size changed from 1237×565 to 1127×565, versus the original 1142×576.
Displayed text is about 1.4% larger than the original, rather than 7.7% smaller.
Astra and the tools-disabled Opus advisor inspected actual page-width images and
found no necessary remaining OTA geometry correction. Small compensation values
still benefit from the existing full-size SVG access.

## Subsequent owner correction

On 2026-10-13 the owner rejected skipped internal connections and unnecessarily
long LDO wiring, and selected OTA-FIXED / Sol 6 / Run 1 as the visual reference.
Follow the [current ATB profile](atb-profile.md#internal-wiring-and-the-owner-selected-reference):
continuous internal signal and bias wires, functional grouping, useful whitespace,
compact meaningful paths and balanced width/height. This supersedes the earlier
visual dispositions above. It does not change the frozen electrical contracts
or imply that the still-unmodified LDOs and remaining OTA drawings already
meet the new preference.

Four later converter-core OTA cases use nearby bias branches with continuous
IBIAS and converted PMOS-bias wires. Mirroring the converter sink makes its gate
face the reference/tail trunk while retaining its D/S column. A staggered upper
converter/output row clears long references without enlarging all stage gaps.
The NMOS-driven output, actual RC order and optional gain-node shunts distinguish
these sources from the owner-selected PMOS-output reference. In PRECISION/Luna 6
Run 3, the gain-to-VDD resistor descends to a local VDD symbol; this permitted
supply exception is an explicit layout choice, not a transferable internal-wire
shortcut. Individual native, fitted and actual desktop/narrow images support
these observations; the remaining drawings still need their own source review.

## Transferable rule and acceptance boundary

Recognize and anchor motifs before routing between them. Preserve corresponding
device ranks, shared-source midpoints, short diode closures and the actual
receiving gate. Group a filter, divider or series RC by its owning endpoints.
Use whitespace to separate functions, rather than assign equal gaps to parts.
An outer feedback corridor is useful when it leaves the core motifs readable;
it is not mandatory for every LDO. Keep electrical equivalence as a separate gate.

Inspect before/after native and intended page views. Confirm label ownership,
complete current paths, plain crossings and readable displayed text. Reject a
draft when a functional improvement introduces a new text/wire ambiguity or an
unacceptable reading-size loss. Area and bend statistics may describe the result;
they cannot establish acceptance. Generalize only a source-matched relationship
that survived this visual review, not a comment, device count or geometric score.

The [topology-family reuse](topology-family-reuse.md) inventory separates named
MOS motifs from complete passive graphs. It records why ordinary OTA shunts and
simple direct-pass LDOs can reuse their own verified motifs, while translated
references, extra transistor stages and this unique current-subtracting OTA
remain separate source-specific layouts.
