# Public measurement contract: OTA-DRIVE-SKY130

These methods and selected spec.json limits are implementation requirements.
Native validation is not implied by this document or an offline test result.
No method refers to a DUT-internal node or device role. A follower window is not
independent ICMR or distortion-qualified output swing.

## DC, ports and operating point

Connect output to VINN externally, VINP to the input source, CL to external ground.
Meter all six DUT ports with zero-volt sources pointing INTO DUT. Save voltages,
signed currents, KCL residual and the sum of VSS-relative terminal powers.
An ideal output clamp must not create a false operating point. IREF is noiseless,
AC zero, constant in supply-ripple tests and enters IBIAS from VSS.

Sweep the card's input interval at 5 mV spacing, including both endpoints. Retain
all samples; take maximum absolute follower error and maximum signed-port power
only when every required sample is valid. Input loading and IBIAS compliance also
apply at every DC point. Save the independently solved output at all step endpoints.
Device diagnostics are optional; their absence is not a functional failure.
A native DC solution alone is not proof of temporal stability.

## External-loop return ratio

Keep DC feedback and the real CL. e is the inverting-input side and f the output
side. Probe V(e)-V(f) with a DC-zero voltage source; inject DC-zero current from
VSS to e. Run voltage injection (V=1, I=0) and current injection (V=0, I=1) in one
ngspice process. Normalize actual source phasors and use i_f=-I(Vprobe):

A=i_f/Iinj and C=V(e,VSS)/Iinj in the current run;
B=i_f/Vinj and D=V(e,VSS)/Vinj in the voltage run.

L = [2(AD-BC)-A+D] / [2(BC-AD)+A-D+1].

Use the 1+L sign convention, not an automatically sign-flipped curve. Preserve
both raw paths and identical frequency grids/DC/model realization. Numerical
denominator cancellation uses the prescribed relative guard 1e-10; unresolved
values cannot become infinite gain or a passing margin. Record the ratio of
absolute denominator to the sum of its term magnitudes.

Sweep 10 Hz-1 GHz at 50 points/decade for SKY130. All samples finite,
frequencies increasing, endpoint relative error <=1e-7 and log10 spacing
<=0.020001. Low-frequency gain is 20 log10(abs(L)) at 10 Hz, not an invented DC
limit. Reuse all-crossing extraction: interpolate linearly in log frequency,
select the first positive-to-negative 0 dB crossing, unwrap phase from the first
principal phase with adjacent changes within +/-180 degrees. Report each unity
crossing's frequency, unwrapped phase and gain direction, plus touches/boundaries.
Record whether any later sample exceeds 0 dB + 1e-6 dB after the selected crossing.
These diagnostics have no PASS/MISS verdict. Do not
convert the crossing phase into a phase margin or report a gain-margin scalar.
Only the 10 Hz gain and first descending crossing frequency are scored here.
A missing selected crossing cannot pass the bandwidth requirement. Invalid or incomplete
AC data remains a measurement failure.

This two-port measurement is an external-loop metric. It does not certify every
internal feedback mode of an arbitrary circuit. Time-domain requirements remain
separate; global internal-mode certification is not a new acceptance gate.
Method basis: Tian et al., Fig. 7 and eqs. 21-23/30,
https://kenkundert.com/docs/cd2001-01.pdf .

## CMRR: bounded DC balance, then two AC paths

Fix average input to the card's VCM and target VOUT=VCM. Set
VINP=VCM+VD0/2 and VINN=VCM-VD0/2 without output clamp or AC servo.
Try VD0=0 first. Success means abs(VOUT-VCM)<=10 uV at a valid OP. Otherwise
try endpoints -10 mV and +10 mV. Accept an endpoint meeting tolerance or require
a negative/positive residual bracket in that order. Bisect at most 32 times,
retaining each VD0, VOUT and status. There are at most 35 explicit OP commands.
Failure to bracket/converge is NO_VALID_BALANCED_OP / BALANCE_UNRESOLVED, not
proof of topology infeasibility. No adaptive range expansion or silent bias fix.

At the successful unclamped OP keep VD0 fixed. Differential AC is +0.5/-0.5 V
(unit difference); common AC is +1/+1 V (unit common mode). Other sources are AC
zero. At exactly 1 kHz, report 20 log10(abs(Ad/Acm)), the input phasors and both
paths. Zero/underflow/nonfinite ratios or a missing valid OP are invalid evidence,
not automatic infinite rejection.

Perform the bounded control loop and both AC paths in ONE native process and log
explicit OP count and implicit AC operating-point work. Timeout stops that case;
no unlimited loop or free process retries. The offline callback is an algorithm
oracle, not permission to count 35 separate processes as one. The official ngspice
control tutorial documents alter/op/loop flows and multiple analyses in one run:
https://ngspice.sourceforge.io/ngspice-control-language-tutorial.html .

## Transients

Use card-specific small/large levels in both directions: hold initial input for
100 ns, edge duration 1 ns, stop at 2.1 us. Maximum step is 25 ps. Require complete finite increasing time data with actual gaps within that
maximum (relative slack 1e-9). A transient tail is not an independent DC target.

Settling is final interpolated entry that remains within 1% of INPUT step amplitude
about the independently solved destination DC OUTPUT, measured from edge start.
DC tracking is a separate required check. Wrong static levels therefore cannot
pass by tail normalization. Complete unsettled data yields null settling and an
observation-time lower bound; a bound beyond the limit is MISS. Short or missing
waveforms are invalid, not fast settling. Small-step overshoot is excursion beyond
target divided by absolute independent DC output transition. Large-step slew uses
the first ordered direction-correct 20/80% crossings after the edge ends. Retain
recrossings and characterize large-step overshoot; don't add a new waveform score.

## Noise, PSRR and verdicts

Noise uses the real follower at VCM and the same-circuit signal transfer. Save
input-referred ASD, integrate its squared PSD in linear frequency with trapezoids
and boundary interpolation, then square root: 10 Hz-10 MHz at 50 points/decade.
Keep 10/100/1000 Hz lower-cutoff integrals as diagnostics.

PSRR uses two AC paths at the same follower OP: VDD=1/input=0 then VDD=0/input=1.
IREF and VCM do not follow supply ripple. Save phasors and calculate
20 log10(abs(Hsignal/Hsupply)) at 1 kHz and 1 MHz, not an LDO supply/output-only
formula. Invalid/zero transfers do not become favorable zero noise/infinite PSRR.

All required standard cases must produce valid passing metrics on one DUT.
Inclusive limits are compared without rounding. Keep failed metrics and unknowns;
partial execution is not a completed PASS or a substituted last-good design.
Independent evaluation uses the captured standard grid for every required case.
Numerical precision comparisons use a separately authorized developer allocation.
A standard-grid PASS is not a per-submission convergence proof.
