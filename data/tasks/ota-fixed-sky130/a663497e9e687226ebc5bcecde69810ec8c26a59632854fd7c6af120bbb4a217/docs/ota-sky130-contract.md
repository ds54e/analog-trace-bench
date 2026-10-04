# OTA-FIXED-SKY130: electrical and measurement contract

OTA-FIXED-SKY130 is the current fixed-topology transistor sizing, bias, and compensation task.

All analyses use the pinned SKY130 combined/continuous model family. The calibrated absolute follower-error limit is **5 mV**; see [release evidence](../reports/ota-sky130/README.md). The registered task packet, specification JSON, initial design, bounds, testbench, evaluation matrix, and source hashes define the executable experiment. A participant's results cannot change the scoring rules for its registered campaign. Machine filenames and IDs are retained for exact hash matching.

## Circuit and public domain

Optimize the documented 14 variables of a two-stage, single-ended OTA. The input devices and load are symmetric, `nf=1`, and `IREF=10 µA`. `Cc` is 0.1–5 pF, `Rz` is 0–50 kΩ, width is at most 100 µm, length is at least 0.15 µm, and total Σ(W×L) is at most 2,000 µm². Every device must remain in the frozen OTA-FIXED-SKY130 W/L domain in `bounds.json`. The evaluator uses native ngspice and SKY130 1.8 V normal-VT NFET/PFET models. Topology changes are outside the task.

The specified load interval is continuous from 2 to 5 pF. Public exploration uses 2 and 5 pF. The nine process, supply, and temperature conditions are:

| ID | Corner | VDD | Temperature |
|---|---|---:|---:|
| N | TT | 1.80 V | 27 °C |
| SLC | SS | 1.62 V | −40 °C |
| SLH | SS | 1.62 V | 125 °C |
| SHC | SS | 1.98 V | −40 °C |
| SHH | SS | 1.98 V | 125 °C |
| FLC | FF | 1.62 V | −40 °C |
| FLH | FF | 1.62 V | 125 °C |
| FHC | FF | 1.98 V | −40 °C |
| FHH | FF | 1.98 V | 125 °C |

| Scored requirement | Limit |
|---|---:|
| Low-frequency loop gain | ≥60 dB |
| Unity-gain frequency | ≥15 MHz |
| Phase margin | ≥60° |
| Power | ≤600 µW |
| Maximum DC tracking error | ≤2 mV |
| Small-step overshoot | ≤10% |
| Large-step 20–80% slew | ≥10 V/µs |
| Small-step settling | Within 1% by 100 ns |
| Large-step settling | Within 1% by 200 ns |
| Input-referred integrated noise, 10 Hz–10 MHz | ≤100 µV RMS |
| PSRR+ at 1 kHz / 1 MHz | ≥60 dB / ≥24 dB |
| Open-loop CMRR at 1 kHz | ≥50 dB |
| Deterministic robustness pass fraction | ≥27/30 within the frozen absolute follower-error limit |

Gain margin and statistical quiescent power are characterization metrics. The absolute follower-error limit is **5 mV**, selected before independent statistical verification. Functional limits are checked under the continuous models.

## Testbench and measurements

The follower connects `vout` to `vin_n`, with `vin_p` as the non-inverting input. VSS is 0 V and VCM is 0.9 V. An ideal source injects 10 µA from ground into `ibias`, with AC magnitude zero. Participants cannot edit the PDK, loads, sources, testbench, or evaluator. Solver settings are `reltol=1e-4`, `abstol=1e-13`, `vntol=1e-9`, and `chgtol=1e-16`.

**Operating point and DC.** At each load, evaluate input levels 0.75, 0.8, 0.9, 1.0, and 1.05 V. Power is the net power entering the DUT from VDD, bias, input, and feedback ports, not VDD alone. Score the maximum over the complete DC sweep only when every required point is valid. Device operating points at the five input levels are extracted from that same sweep; they incur no extra launches. Sweep the follower from 0.75 to 1.05 V on a 5 mV grid and take the largest absolute input/output difference. Keep per-load results distinct from load-independent aggregates.

**Loop response.** Insert a series source in feedback with DC zero and AC magnitude one. Use `L = −(1 + 1/V(vin_n))`. The verification band is 10 Hz–1 GHz with 20 points per decade. All samples must be finite, frequencies strictly increasing, endpoints within relative error `1e-7`, and adjacent log10 frequency spacing at most `0.050001`. Missing values, non-finite values, or inadequate coverage are `INVALID_DATA`.

Interpolate linearly in log10 frequency and save every unity crossing, touch, and boundary event. The first valid positive-to-negative gain crossing sets UGF. Unwrap phase from the lowest-frequency principal phase, limiting each adjacent change to ±180°. Phase margin is `180° + unwrapped phase` at the selected UGF. Save phase and margin at every crossing. The stored field `phase_margin_deg_worst` contains the selected crossing's margin; its selection metadata makes that meaning explicit.

After the selected UGF, any saved gain sample above `0 dB + 1e-6 dB` fails `no_0db_recross`. Do not infer an unseen curve shape between samples. No valid UGF or non-finite PM cannot pass. Save all odd-180° phase crossings and calculate GM as negative loop gain there. Complete in-band data with no phase crossing receives `NO_PHASE_CROSSING_IN_BAND`, distinct from missing data. A phase crossing is never required merely to create a GM number.

**Transient response.** Evaluate both directions of the small step 0.8↔1.0 V and large step 0.75↔1.05 V. Hold the initial level for 100 ns, use a 1 ns edge, and observe through 2.1 µs with a maximum 25 ps output step. Measure settling from the edge start. The band is 1% of the input step and is centered on that PVT/load's independently solved destination DC output. Record the interpolated final entry that stays within the band until the end. Score DC tracking separately; a transient tail sample does not replace the DC solution. If a complete waveform stays outside the band, settling is null with the observation time saved as a lower bound; a bound past the limit is a MISS. Overshoot remains measurable even if settling fails.

Overshoot is the largest excursion past target divided by the absolute independent DC output transition. Only small-step overshoot is scored; large-step overshoot is retained as characterization. Large-step slew uses the first ordered, direction-correct 20% and 80% crossings after the edge ends. Retain later recrossings. Missing, non-finite, short, or target-less waveforms are measurement failures, not convenient electrical values.

**Noise.** Save output noise ASD referred to the input using the same circuit's input gain. Integrate its squared PSD by the trapezoid rule in frequency, interpolating band boundaries, then take the square root. The native sweep is 10 Hz–10 MHz at 50 points per decade. Keep PSD points and the integrals from 10, 100, and 1,000 Hz. The lower cutoff by itself does not establish the 1/f contribution.

**PSRR+.** In the same DC follower, measure `Hsupply` with VDD AC=1 and input AC=0, and `Hsignal` with VDD AC=0 and input AC=1. Both AC sweeps run in one ngspice process. VCM=0.9 V and IREF=10 µA do not follow supply ripple. Input-referred PSRR+ is `20 log10(|Hsignal/Hsupply|)`. Read 1 kHz and 1 MHz directly and save intermediate sweep data. Do not convert a zero transfer to an automatic infinite PASS. Score at N, SLH, and FHC with 2 and 5 pF loads.

**CMRR.** Use the natural open-loop DC operating point with both inputs fixed at **0.9 V**, independent of VDD. Differential excitation is Vin+ AC=0.5∠0° and Vin− AC=0.5∠180°, giving Vdiff=1 V. Common excitation is AC=1∠0° on both inputs, giving Vcm=1 V. Compute Ad=Vout/Vdiff, Acm=Vout/Vcm, and CMRR=20 log10(abs(Ad/Acm)) at exactly 1 kHz. Each native case bundles both AC sweeps and the DC operating point. Retain both raw AC paths, input phasors and OP data. Zero transfers, invalid OP and nonfinite values are measurement failures. Score N, SLH and FHC at 2 and 5 pF. The native 24-case calibration and independent amplitude-normalization check support 50 dB.

**Statistical follower error.** The scored deck places `.option seed` before `.lib ".../combined/continuous/sky130.lib.spice" mc`, then explicitly sets `.param MC_MM_SWITCH=1`. Use a unity-gain follower, VDD=1.80 V, 27 °C, CL=2 pF, Vin+=0.9 V and IREF=10 µA. For every sample retain convergence/status, Vout, signed `follower_error_v=Vout−0.9`, its absolute value and signed-port quiescent power. This is **closed-loop follower offset/error**, not an exact intrinsic Vos measurement. Both `MC_PR_SWITCH=1` and `MC_MM_SWITCH=1` are measured in the native deck. Following Analog Design Bench, the unmodified native model defines this deterministic test. Its process expressions are re-evaluated per reference by the pinned ngspice; a common-die global random shift has **not** been validated. The score is a fixed-seed native-model robustness test, with no silicon-yield interpretation.

Participants may explore only the four diagnostic seeds **52001–52004**. Each records one native case within the 90-minute exploration window; there is no exploration case limit. CMRR exploration is available normally. Independent verification occurs only after the submitted DUT is frozen; results are withheld from the participant.

## Independent signoff

This section and evaluator modules are excluded from participant packets.

The central planner `tools/atb_ota_plan.py` computes these exact native launch counts from the same case planner used by execution:

| Stage | Native cases | Scored rows |
|---|---:|---:|
| Published PVT9 × two loads, plus PSRR/CMRR at N/SLH/FHC × two loads | 138 | 288 |
| Hidden interpolation at 3, 3.5, 4 pF; N/SLH/FHC | 72 | 153 |
| Independent native process-switch + mismatch | 30 | 1 aggregate, with all 30 sample results retained |
| Total | **240** | **442** |

Each PVT/load nominal group costs seven cases: one DC sweep including power and device OP, one loop, four transient and one noise case. Published coverage adds six PSRR and six CMRR cases. Each hidden PVT/load group adds one PSRR case. No additional CMRR is scored at hidden loads.

Seed sets are disjoint and cannot be filtered by outcome: calibration **51001–51010**, public diagnostics **52001–52004**, independent signoff **53001–53030**. Signoff attempts exactly all 30 seeds. An invalid/nonconvergent sample fails; at least 27 valid samples must meet the frozen absolute error limit. The score is called **deterministic robustness pass fraction**, without a production-yield or confidence-interval interpretation. Missing attempts make execution incomplete rather than a PASS.

The absolute follower-error limit is 5 mV. Its native calibration evidence is
recorded in [calibration samples](../reports/ota-sky130/model/calibration-samples.json)
and the [threshold record](../reports/ota-sky130/model/threshold-freeze.json).

Independent evaluation uses the captured standard grid for every required case.
Numerical precision comparisons use a separately authorized developer allocation.
A standard-grid PASS is not a per-submission convergence proof.
See the [numerical accuracy policy](numerical-accuracy.md).

## Execution and evidence

Exploration has no case limit and a 90-minute design deadline. Reserve 240 independent cases per submitted DUT. Every failed or interrupted process counts; no free retries. Campaign registration, billing routes, repeats and overall capacity require separate owner authorization. Documentation and qualification work do not authorize participant runs.

The controller freezes the submission before independent execution. Statistical records retain seed, library section, mismatch switch, PVT/load, revision, DUT/deck hashes, complete model closure identity, ngspice command/version, convergence, measured values, timestamps, accounting and raw artifact paths/hashes. CMRR retains both excitation paths. Reports distinguish electrical MISS, INVALID, NOT_MEASURED, incomplete, interrupted and not started.

Each registered attempt captures its task packet, specification, evaluator and
model identities. The [qualification records](../reports/ota-sky130/README.md)
document the native evaluator checks. Execution and submission timing follow the
[shared operator policy](atb-operator.md).
