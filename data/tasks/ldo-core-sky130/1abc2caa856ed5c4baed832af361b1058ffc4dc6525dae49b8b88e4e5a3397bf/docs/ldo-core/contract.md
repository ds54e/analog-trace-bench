# Core-supply LDO: formal electrical contract

The following targets define LDO-CORE-2026-09-29. They are requirements, not
claims of measured performance. Native qualification is required before execution.
One fixed circuit must cover its entire task's operating domain. No actual RTL,
standard-cell characterization, off-chip output capacitor or external clock is used.

## Electrical boundary and device families

`DUT VIN VOUT VSS VREF`: VIN is the supply, VOUT the regulated output, VSS return,
VREF the external low-current ideal reference. No IBIAS/EN/PGOOD/SENSE pins.
The author designs pass devices, amplifier/driver, bias, feedback and compensation.
The reference has no error, noise or supply ripple; its current is metered.
No complete circuit or reference result is supplied to a participant.

| Requirement | SKY130 | ADM45 |
|---|---:|---:|
| VIN nominal / interval | 1.6 V / 1.4-1.8 V | 1.0 V / 0.9-1.1 V |
| VOUT / VREF | 1.2 V / 0.6 V | 0.8 V / 0.4 V |
| Load levels | 50 uA, 0.5 mA, 2 mA | 25 uA, 0.25 mA, 1 mA |
| Load-side decap | 200-500 pF | 200-500 pF |
| Temperature | -20 to 85 C; nominal 27 C | -20 to 85 C; nominal 27 C |
| DC output error | +/-2% target | +/-2% target |
| Transient absolute envelope | +/-8% target | +/-8% target |
| Recovery | +/-2% target by 500 ns | +/-2% target by 500 ns |
| DC overhead: minimum-load point | <=50 uA | <=25 uA |
| DC overhead: all points | <=100 uA | <=50 uA |
| Absolute DC VREF current | <=1 uA | <=1 uA |
| Added explicit internal C | <=20 pF | <=10 pF |
| Sum of MOS W*L with multiplicity | <=5,000 um2 | <=200 um2 |

The light-load limit applies exactly at the card's minimum-load value at every
PVT, not across an unspecified current interval. All other DC points use the
all-points limit. This is loaded overhead, not no-load IQ. These two current
caps do not force an adaptive topology: fixed bias may also pass. No new metric
family or transient-energy score is introduced.

SKY130 uses the pinned `env/sky130.json` combined/continuous normal-VT 1.8 V
NFET/PFET family; its task uses tt/ss/ff. W/L are numeric micrometres under the
library's scale=1u convention. Admit geometries in the shared per-polarity domain of all pinned continuous
sections, with W<=100 um and L>=0.15 um. Reuse model-domain extraction and verify
parallel-copy semantics natively; the OTA's role names and 2,000 um2 total-area
limit do not apply to LDO.

ADM45 uses **VTG core** devices, not the IO25 family. `env/adm45.json` pins
`cc4eacd752347dc865359133d413baf1c9434693`. Per-unit documented W is 90 nm-16 um
and L 50 nm-1 um; dimensions are SI metres. Nominal wrappers are
`adm45_vtg_nmos/pmos`, with `mult` for identical copies. Generated physical
instances use JSON `units`. Do not turn a large pass device into a width outside
the per-unit range. Reuse the existing process-only slow/fast generator/replay,
keeping a realization fixed across VIN/load/temperature. It is synthetic stress,
not manufacturing corners or mismatch/yield evidence. No `.lib ss/ff` on its
nominal flat include. Do not update the dependency pin as a side effect.

## Permitted circuit and modelling scope

Free continuous-time analog topology using the approved MOS models and positive
linear R/C. Reuse the documented free-netlist subset for local hierarchy and
constant parameters. No ideal internal sources/amplifiers, clocked controller,
inductors, model overrides, analyses or external file dependencies. Do not create
a general SPICE engine. Bias and compensation are participant-authored.

Every explicit DUT capacitor counts toward the internal cap allowance, including
those tied to output/supply; load-side decap is supplied separately by the bench.
Ideal capacitor ESR is zero; no separate ESR sweep. Device parasitics remain as
implemented by each pinned model. Gate-area and capacitor budgets are separate
schematic proxies, not equal silicon area across technologies. Model diffusion
parasitic defaults and any generator scaling must be documented, not secretly
changed between participants. Foundry reliability or layout equivalence is not
claimed, particularly for synthetic ADM45.

## Conditions and scoring

Use three finite-edge load profiles: light/heavy, middle/heavy and eight pulses.
100 ns edges, 2 us isolated plateaus, 200 ns burst plateaus, 1 us initial hold
and 1 us added burst tail are common. Current is a prescribed sink to external
0, not a CMOS/RTL model. Keep that load law during droop; a collapsed output
fails rather than receiving an easier voltage-scaled load. No cold-start claim.

Public PVT is nominal plus slow/fast x VIN endpoints x temperature endpoints
(nine conditions), at 200/500 pF. All three DC levels and all three transient
profiles are required for every group. The operator-only verification-plan.json
fixes three independent interior groups, using the same edge/plateau/load law.
No faster hidden edge or new requirement is permitted. Total verification is
129 native invocations, including three characterization cases. Production
integration must reproduce that plan; extra/retried native work is not free.

DC precision, loaded overhead, the transient voltage envelope and absolute-target
recovery are scored. Line transient and PSRR are required characterization, not scoring conditions. Low-VIN DC
checks establish regulation at the stated headroom, not a measured dropout value.
No common PM requirement for the four-port internally fed-back DUT. Retain all
waveforms and distinguish MISS, invalid data, nonconvergence and missing work.
Freeze the submitted bytes; never substitute an operator or last-good circuit.

## Formal acceptance

All required checks must pass on the same frozen final DUT. Use inclusive limits,
without rounding before comparison. A weighted score cannot offset a failed
requirement. Invalid/missing results cannot pass. Report electrical MISS,
measurement invalidity, unsubmitted and incomplete execution separately.
Characterization errors remain visible without changing the electrical verdict.
Exploration has no case limit and lasts 5,400 seconds; all native launches, including failures, are recorded. Follow the existing controller for deadlines, capture, submit and stop.

The fixed scope does not include startup, noise scoring, PM, protection, DVFS or
RTL co-simulation. These are not hidden acceptance gates. Changes to the
specification require an explicit revision and retained reasons/evidence, not an
implementation-specific threshold or automatic relaxation after a failed run.

Standalone exploration load transients cost one native case each. DC points can
be requested separately; a complete nominal group costs six cases. The final
129-case matrix retains all required independent DC and transient checks.
