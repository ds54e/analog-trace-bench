# Gallery evidence

Use these examples to compare placement, routing and label ownership. Gallery
appearance does not establish electrical correctness, source values or authorship.
Reuse visual relationships only after checking the target circuit. URLs can require
sign-in. Observations have the dates below; do not present stored notes as a fresh visit.

## Native editor comparison, 2026-10-12

Signed in to the community gallery and opened these four existing examples in
the browser's native editor. These are recorded visual observations, not electrical
qualification of the gallery circuits. The `/g/` URLs below opened successfully
in that authenticated session; sign-in may be required. No circuit was published
or changed in the gallery.

| Opened example | Observed placement, wiring and labels | Applied judgment / limit |
|---|---|---|
| [current mirror — 56a67nmqbb](https://analog-canvas.tokenzhang.com/g/56a67nmqbb) | Inward-facing gates share a horizontal trunk; the diode-connected drain joins it through a short local branch. M1/M2 names sit outside the pair, while current arrows sit on the drain branches. | Keep OTA XMbn mirrored, its D–G tie local and its gate connection to XMtl continuous. Do not import the example's arrows or dimensions into the submitted circuit. |
| [Two-stage op amp with single-ended output — x5jaqe94t7](https://analog-canvas.tokenzhang.com/g/x5jaqe94t7) | Intermediate drain taps meet M5/M6 gates at their respective heights. The lower common-gate trunk is separated from the input stage. MOS names follow each body, and inputs remain near their gates. | Favor pin-to-trunk alignment over a uniform device row. In ATB, shifting the independent output sink aligns its gate with the existing bias route and removes a return bend. This example has a different load/bias topology and no matching ATB compensation branch. |
| [LDO regulator's core structure — pes3mh8swm](https://analog-canvas.tokenzhang.com/g/pes3mh8swm) | Error amplifier, buffer and output stage proceed left to right. The output divider is directly below the pass drain, with nearby parallel output branches. Vfb is a labeled discontinuity. | Retain the output/divider relationship and close neighboring parts. ATB has no separate buffer; show its actual direct gate drive and continuous FB return. |
| [LDO regulator — 8qatzztvzk](https://analog-canvas.tokenzhang.com/g/8qatzztvzk) | The output divider shares the pass-drain column. Its midpoint returns along a dedicated lower corridor to the input side; the signal path uses a different height. The return has sparse labeling and crosses other branches. | Separate the visible feedback corridor from the NB return without sending either to a distant page edge. Keep ATB's FB/NB labels and no-dot crossing convention; do not treat the example's apparent input opening as verified connectivity. |

The ATB native renders were reviewed independently at reading size after these
comparisons. An initially tighter XM4/C1 interval caused the MOS name and
capacitor value to compete; local separation resolved it without smaller text.
Moving the OTA sink also required checking its source endpoint: a coincident
source/junction created a zero-length route, and a different candidate bias
height touched the tail source. The final recipe uses an actual source endpoint
and avoids foreign-terminal contact. These are verified tool/layout findings;
the circuit coordinates remain only in the pilot recipe.

## ATB native render observations, 2026-10-12

These are observations of the target drawings after gallery comparison and user
refinement, not additional gallery visits. Their exact parameters and interfaces
were checked from saved/reopened native projects against the submitted SPICE.

| Target artifact | Observed useful judgment | Scope |
|---|---|---|
| [OTA pilot SVG](https://ds54e.github.io/analog-trace-bench/schematics/ota-fixed-sky130-opus-5-5-r1/schematic.svg) | Cc/Rz names and values on one side read as one compensation branch; the mirrored XMbn keeps a short local D–G tie and continuous shared gates. | Preserve these OTA relationships; label-side alignment is conditional on clearance. |
| [LDO pilot SVG](https://ds54e.github.io/analog-trace-bench/schematics/ldo-core-sky130-sonnet-5-5-r1/schematic.svg) | The upper RB return eliminates its former right-hand foldback. CFF left of R1 connects vertically to existing VOUT/FB trunks, leaving a continuous lower FB return. | Compare real taps and both sides of a parallel branch; this does not establish a universal upper bias route or inside-capacitor rule. |

The page's 60% figure width is a separate user preference. It changes neither the
native drawing nor exact values. An old image remained cached after a successful
deployment; hash-versioned image URLs made the updated SVG visible on reload.

## Earlier SVG preview observations, 2026-10-11

The earlier review used the gallery's `ai=0` filter: 13 examples from its first
60 returned entries, followed by eight additional examples and two revisits.
The filter selects the saved AI-generated flag, not independently verified
human authorship. These are retained visual observations, not new browser checks.
Displayed author names below came from the gallery, not verification of original
circuit authorship.

| Example | Displayed author | Observation / useful judgment | Limit |
|---|---|---|---|
| [Continuous-Time Comparator with Preamplifier](https://analog-canvas.tokenzhang.com/api/gallery/8nm6fak8ez/preview.svg) | Magic Li | Corresponding differential devices align by row; later-stage switches are separated. | Central VCM/resistor labels are crowded; copy symmetry, not text density. |
| [Self Bias Circuit](https://analog-canvas.tokenzhang.com/api/gallery/zp3r9haqg7/preview.svg) | Zengchun Chen | Shared M1/M2/M5 gates, a short D–G return and distinct bias outputs are visible. | Preserve the self-bias loop rather than forcing a single left-to-right chain. |
| [Miller Compensation with Voltage Buffer](https://analog-canvas.tokenzhang.com/api/gallery/fy4qb94fzy/preview.svg) | Zengchun Chen | Input/output stages progress horizontally; the upper Cc branch visibly reaches the buffer. | Different compensation topology; do not copy its endpoints into ATB. |
| [Miller Compensation with Current Buffer](https://analog-canvas.tokenzhang.com/api/gallery/a2nn9n6pbn/preview.svg) | Zengchun Chen | Main signal and upper Cc branch are separated; local supplies avoid an enclosing rail. | Conceptual values/models are omitted; retain exact target data elsewhere. |
| [OTA including passives for frequency compensation](https://analog-canvas.tokenzhang.com/api/gallery/xd4knhb9f5/preview.svg) | Magic Li | Stages progress left to right; passive/gm colors supplement the black circuit. | Color frames and routes crowd some regions; color cannot establish connectivity. |
| [Two Stage OTA with Flying Cap CMFB](https://analog-canvas.tokenzhang.com/api/gallery/cwmesegne8/preview.svg) | Zengchun Chen | Main OTA, upper-right CMFB and lower-right bias retain local symmetry and separation. | Block links use labels; a main-loop explanation still needs traceable connections. |
| [Telescopic OTA with CMFB and Bias](https://analog-canvas.tokenzhang.com/api/gallery/cbmzkzbr8x/preview.svg) | Zengchun Chen | Vertical symmetric OTA stacks, CMFB and bias have distinct local groups. | Wide overview; do not shrink text to fit or copy overlapping frames. |
| [Folded-cascode gain stage, bias and second stage](https://analog-canvas.tokenzhang.com/api/gallery/dsf2ff78pp/preview.svg) | Magic Li | Bias, input/gain and output progress across the page; local device rows align. | Many cross-group routes remain; small ATB circuits can be more compact. |
| [LDO regulator's core structure](https://analog-canvas.tokenzhang.com/api/gallery/pes3mh8swm/preview.svg) | Magic Li | Error amplifier, buffer and output have clear order; divider below output and M13 at its sending tap. | Vfb is label-discontinuous; do not hide ATB's main feedback for that reason. |
| [LDO regulator](https://analog-canvas.tokenzhang.com/api/gallery/8qatzztvzk/preview.svg) | Magic Li | Divider midpoint uses a lower return corridor distinct from the principal signal path. | Input opening and crossings do not prove electrical continuity. |
| [low-dropout regulator](https://analog-canvas.tokenzhang.com/api/gallery/g6b58gnemm/preview.svg) | Magic Li | Symmetric amplifier, upper compensation and output regions are separated; long routes use the perimeter. | Repeated C4/VOUT labels; appearance is not identifier or connectivity validation. |
| [LDO](https://analog-canvas.tokenzhang.com/api/gallery/66fgy9aetr/preview.svg) | Magic Li | Local vertical branches and device rows align. | Many devices and Vout labels make a wide overview; consider detail views. |
| [Bias structure](https://analog-canvas.tokenzhang.com/api/gallery/ck79hnz2xw/preview.svg) | Magic Li | Roles are separated locally; gate trunks and vertical branches align. | Frames do not fully describe connectivity; source review remains necessary. |
| [current mirror](https://analog-canvas.tokenzhang.com/api/gallery/56a67nmqbb/preview.svg) | — | Inward-facing gates share one trunk; D–G has a short local return. | Keep that explanatory D–G branch rather than deleting every bend. |
| [5T-OTA](https://analog-canvas.tokenzhang.com/api/gallery/9sc926amjy/preview.svg) | — | Simple load-gate and source trunks, with a central tail branch. | Few devices and no auxiliary bias; do not extrapolate unchanged to a large circuit. |
| [Five Transistor OTA Active Load](https://analog-canvas.tokenzhang.com/api/gallery/vqdg9y347r/preview.svg) | — | Branch pairing and the central T-tap are clear. | The local diode return is intentional. |
| [Simple implementation of a two-stage op amp](https://analog-canvas.tokenzhang.com/api/gallery/6qg2h7weje/preview.svg) | — | X/Y taps align directly with receiving second-stage gates. | Independent PMOS stages need not share the upper-load row. |
| [Two-stage op amp with single-ended output](https://analog-canvas.tokenzhang.com/api/gallery/x5jaqe94t7/preview.svg) | — | Direct intermediate-node-to-M6 gate and a shared lower mirror trunk. | Different topology from ATB; copy placement relationships only. |
| [2stage miller amp wi bias](https://analog-canvas.tokenzhang.com/api/gallery/vys6p4zc7s/preview.svg) | — | Horizontal compensation RC and common distributed bias trunks. | Dense symbol/trunk regions; avoid passing a gate wire through a body. |
| [Basic Structure of Two-Stage OTA](https://analog-canvas.tokenzhang.com/api/gallery/aztzpg4vhj/preview.svg) | — | Two intermediate taps meet receivers at different heights without doglegs. | Crossings remain and need a consistent convention. |
| [Current Mirror](https://analog-canvas.tokenzhang.com/api/gallery/r3s2w9jkm3/preview.svg) | — | Cascode vertical stacks align; remote bias uses labels. | A blanket ban on labels would add long cross-group routes. |

The two LDO rows consolidate their same-day revisits. A dash means no displayed
author was retained in those additional notes. The stored filter interpretation
comes from the [pinned gallery implementation](https://github.com/cascode-ai/analog-canvas/blob/37bccd4012764dce53b34927fa606c6f430296a2/worker/gallery-store-wall.ts#L206).
