# Shared external measurements: LDO-CORE-2026-09-29

These definitions apply to both formal task cards. The implementation must be
checked natively with the pinned models; offline algebra is not that evidence.
Do not inherit the old fixed-OTA threshold or case-count definitions.

## DC: port signs, cost and absolute voltage

All four DUT ports have zero-volt meters. Load and decap return to external node
`0`, not the DUT side of Vground. Thus the regulator ground-current measurement
does not include delivered load current.

`Iin=i(Vpin)`, `Iref=i(Vrefmeter)` enter VIN/VREF;
`Iout=i(Voutmeter)`, `Ignd=i(Vground)` leave VOUT/VSS.
Check `Iin+Iref-Iout-Ignd` against an absolute 1 nA tolerance. A failed residual is invalid measurement,
not a favorable low-current result. Save signed
currents, voltages and OP status. The DC overhead is
`max(Iin-Iout,0)+max(Iref,0)`, with a separate `abs(Iref)<=1 uA` gate. Reference
sourcing is charged, and sinking is already reflected in Iin-Iout. This is not
no-load IQ. Apply the minimum-load cap only at the minimum load, and the general
cap at all DC loads. Missing currents or invalid OP cannot become zero overhead.
Dissipation is `VIN*Iin+VREF*Iref-VOUT*Iout`, using VSS-relative voltages. Keep it
as characterization; input power contains useful load power. No dynamic-energy
score and no DC-overhead interpretation of capacitor charging during transients.

Measure error from each card's fixed target, not a candidate's own output:
SKY130 DC/recovery band is 1.176-1.224 V, envelope 1.104-1.296 V;
ADM45 DC/recovery band is 0.784-0.816 V, envelope 0.736-0.864 V.
Final verification evaluates independent DC solutions at every required load
and VIN condition. A transient tail is not a DC solution. Exploration may request
a single transient without separate DC cases: recovery uses the fixed target,
and the transient deck records its own operating point and initial hold. Such a
request does not establish DC compliance at every load.
Line/load regulation and actual signed currents remain available for diagnosis.

## Prescribed loads and windows

| Profile | Levels | Time definition |
|---|---|---|
| light_heavy | card minimum -> maximum -> minimum | 1 us pre-hold, 100 ns edges, 2 us high/low plateaus |
| mid_heavy | card middle -> maximum -> middle | same |
| burst | minimum <-> maximum, 8 pulses | 100 ns edges, 200 ns high/low plateaus, 1 us extra final tail |

SKY130 levels are 50 uA/0.5 mA/2 mA; ADM45 levels 25 uA/0.25 mA/1 mA.
PWL loads are explicit electrical stimuli, not data from an RTL block. Reference
and VIN are fixed in load tests. The regulator stays enabled; start from its DC
solution without `.ic`/`uic`. The 1 us pre-hold must also satisfy the DC voltage
band; do not hide pre-existing oscillation by starting the score at the edge.

Recovery starts at each isolated edge START, not its end. Interpolate the last
entry into the target +/-2% band which stays in the band until the next edge
or record end. Require <=500 ns. Record extrema and absolute target-relative
errors during the whole transition/window. A flat but wrong voltage fails.
A complete trace ending outside the band has null recovery and an observation-
time lower bound; a bound exceeding the limit is MISS, not missing measurement.
Short/nonfinite/unordered/insufficiently sampled records are invalid evidence.

For bursts score the absolute envelope through **all** pulses, then recovery
only after the final falling edge. Do not apply a 500 ns per-edge settling
requirement to a 200 ns plateau. Total burst duration is 6.8 us, including its
extra tail. Record peak-to-peak output as characterization, not a new stability
score. Isolated profiles are 5.2 us. Positive and negative excursions both count.

Maximum timestep and requested output step are 0.5 ns. Check stored sample gaps
against 0.5 ns with relative slack 1e-9, using actual timestamps rather than
assuming the requested output grid was delivered. Qualify convergence and compare
representative extremes with a finer grid before release. This is finite-window,
sampled evidence, not proof against every internal or unobserved oscillation.

## Line and PSRR: mandatory characterization, not scoring

Line: use each card's VIN minimum -> maximum -> minimum, 200 ns edges, maximum
load, reference fixed. Report the same target-relative windows. PSRR: valid
nominal OP at minimum and maximum load; VIN AC=1, reference/load AC=0.
`PSRR=20*log10(abs(VIN_ac/VOUT_ac))`. Save actual phasors at 1 kHz and 1 MHz and
the intervening sweep. This is supply-to-output rejection, not the OTA signal-
normalized ratio. Zero/underflow/nonfinite transfer is unresolved/invalid, not
infinite PASS. A non-regulating or oscillating state cannot provide a qualified
PSRR result merely because an AC command ran.

## Models and accounting

The host selects the pinned SKY130 continuous `.lib` section or ADM45 generated
physical instances. ADM45 slow/fast uses process-only generation with the card's
fixed profile, seed and sample. Temperature is passed to the generator and bench;
the saved process values stay fixed across temperature, supply and load.

Each deck uses one native invocation, including its OP and subsequent
AC/tran commands. Standalone exploration transients cost one case each, including their operating
point and waveform. Separate DC requests cost one case per load point or three
for the complete DC set. The full nominal request costs six cases.
The formal plan is 18 public groups x 6 cases, 3 independent groups x 6 cases,
and 3 characterization cases = 129 native invocations. Each six-case group has
three DC destination OP cases plus light_heavy, mid_heavy and burst transients.
Initial OPs inside transient processes do not replace final verification DC cases.
The complete matrix is generated by the shared task planner.
Shared results can be reused only when the existing controller proves identity;
no cross-group count reduction is part of this specification. Keep every failed
or interrupted invocation; no free retries and no early stop on electrical MISS.
Independent evaluation uses the captured standard grid for every required case.
Numerical precision comparisons use a separately authorized developer allocation.
A standard-grid PASS is not a per-submission convergence proof.

Method sources (not support for our unmeasured numerical thresholds):
- https://ngspice.sourceforge.io/ngspice-control-language-tutorial.html
- https://www.analog.com/en/resources/analog-dialogue/articles/understand-ldo-concepts.html
- ADM45 VTG units, multiplicity and synthetic stress semantics are specified in the task card.

## Verdict and observation completeness

Apply DC accuracy, current limits and KCL only to valid native OP records.
For each full transient, require the complete initial hold to be within the
absolute +/-2% band, and the post-edge envelope to stay within +/-8%. Isolated
profiles must recover by 500 ns from each edge start. Bursts apply recovery only
after the final falling edge. These are independent requirements: recovery does
not excuse a peak outside the envelope. Do not round values before inclusive
limit checks. A null recovery on a complete waveform carries its lower bound;
truncated, nonfinite, nonmonotone or overly sparse waveforms are invalid evidence.

Public and independent electrical cases must all have valid passing results for
an electrical PASS. Retain individual failing rows, observed waveforms and
execution status; do not turn incomplete execution into a completed electrical
MISS. Characterization is attempted and reported even when required metrics fail,
where simulation is possible; its unavailable results remain explicit.
