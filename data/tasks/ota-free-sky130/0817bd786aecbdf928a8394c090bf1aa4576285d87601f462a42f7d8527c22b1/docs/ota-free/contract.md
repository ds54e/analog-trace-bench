# Formal design contract: OTA-FREE-2026-09-29

The selected [SKY130 card](../../specs/ota-free-sky130.json) or [ADM45 card](../../specs/ota-free-adm45.json) is the numerical source of truth.
A finalized requirement is not a claim that an unmeasured circuit meets it.

## Design boundary

One entry subcircuit `DUT VINP VINN VOUT VDD VSS IBIAS`, continuous-time,
differential input and single-ended output. VINP is non-inverting. The bench
supplies load, unity feedback, power and ideal noiseless IREF (VSS to IBIAS).
No EN, compensation or topology-specific bias-voltage pins. Internal topology,
connectivity, bias conversion, compensation and sizing are participant decisions.
No completed amplifier, initial sizing, topology selection menu or reference
measurement is supplied. No symmetry or saturation-by-device-role requirement.

| Requirement | SKY130 | ADM45 |
|---|---:|---:|
| VDD / temperature range | 1.62-1.98 V / -40 to 125 C | 0.9-1.1 V / -20 to 85 C |
| VCM / IREF | 0.9 V / 10 uA | 0.5 V / 2 uA |
| Load interval | 2-5 pF | 1-2 pF |
| Low-frequency return ratio | >=60 dB | >=75 dB |
| First descending unity crossing | >=15 MHz | >=6 MHz |
| Signed-port DC power | <=600 uW | <=35 uW |
| Follower error / input range | <=2 mV / 0.75-1.05 V | <=2 mV / 0.35-0.65 V |
| Small/large step settling | <=100/200 ns | <=100/200 ns |
| Small-step overshoot | <=10% | <=10% |
| Large-step slew, both directions | >=10 V/us | >=4 V/us |
| Integrated input noise, 10 Hz-10 MHz | <=100 uV RMS | <=200 uV RMS |
| PSRR at 1 kHz / 1 MHz | >=60/24 dB | >=60/18 dB |
| Balanced open-loop CMRR, 1 kHz | >=50 dB | >=50 dB |
| Total MOS W*L / explicit capacitance | <=2,000 um2 / <=5 pF | <=80 um2 / <=10 pF |

All required checks apply to the same frozen DUT. No weighted score compensates
for a failed requirement. External-loop crossing phases and recrossing are
unscored diagnostics; no scalar phase or gain margin is reported. Required gain
and bandwidth are not a stability certificate. Settling and overshoot are
evaluated directly in the prescribed transient conditions.
Device/domain limits are task constraints, not claims of foundry reliability or
layout area. Both temperature ranges intentionally retain the corresponding fixed
OTA domain. Cross-technology or fixed/free equal difficulty is not established.

## Hardware and resources

Allow approved NFET/PFET wrappers and positive ideal R/C, constant parameters
and local subcircuits in one file. No internal ideal/controlled sources, clocked
controllers, model overrides, simulator commands, unapproved devices or includes.
NFET bodies use VSS; PFET bodies use VDD. Admit only the selected model family.
Count every physical copy in W*L and element count, all explicit capacitors in
Csum; parasitics stay as implemented by the pinned models. The public devices.md file defines the admitted grammar.
SKY130 must satisfy the shared per-polarity continuous model domain, not legacy
M1/M2 role bounds. ADM45 per-unit W is 90 nm-16 um and L is 50 nm-1 um.

Each input's DC current magnitude is <=1 uA over the follower sweep. IBIAS must
remain between VSS and VDD. These are simple input/reference contracts, not
additional supply pins. Power includes every terminal once with current positive
INTO DUT: sum((Vport-VSS)*Iport). Retain current signs; input/bias/feedback power
is never omitted. Absolute 1 nA KCL residual is an extraction-validity check.

## Capture, execution and qualification

The host captures exact UTF-8 netlist bytes, validates and measures that snapshot,
then freezes one final DUT across conditions. Do not re-read mutable files after
validation, choose a different final circuit per condition, or replace an invalid
submission with an operator/last-good design. Architecture labels are descriptive,
not scores. Existing source revisions and ordinary explanations are sufficient.

The public packet contains only seven curated brief/spec/device/method/client
files plus a host manifest. No initial DUT or reference circuit. Reuse current
sandbox/authentication and disable Web-search tools. No new network filtering,
credential isolation, topology classifier, security audit or execution framework.

Exploration: no case limit, 5,400 seconds. Final verification: 210 standard
cases under the operator plan. Numerical precision checks use a separate developer allocation. Failures and
interruptions count; a parser rejection is not a fictitious native launch.
Report MISS, invalid data, unsubmitted, interrupted and incomplete separately.
Native qualification must establish the implemented method and feasible witness
before admission. Changes require a new identity and retained native reasons.
