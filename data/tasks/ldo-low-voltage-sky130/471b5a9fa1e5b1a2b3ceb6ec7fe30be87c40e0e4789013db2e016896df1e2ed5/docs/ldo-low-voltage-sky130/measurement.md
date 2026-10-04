# LDO-LOW-VOLTAGE-SKY130 measurement contract

Numerical stimuli and limits come from spec.json. Connect the same submitted
DUT to VIN, VOUT, VSS and ideal noiseless VREF. The load is a prescribed ideal
finite-slew current sink; the external capacitor is ideal and bench supplied.
No startup, protection, bandgap, yield or layout checks are implied.

## DC and load changes

Run DC at all three loads and light/heavy, middle/heavy and burst profiles.
Meter all DUT terminals. Input/reference currents enter DUT; output/ground
currents leave. Verify KCL within 1 nA. Overhead is
max(Iin-Iout,0)+max(Iref,0), including feedback and bias consumption.
Compare voltage against the fixed 1.0 V target, never the waveform tail.
Both isolated edge directions and the final falling burst edge have recovery
windows. Recovery is the final interpolated entry into the absolute required
band that remains there until the window ends. Retain overshoot, droop, initial
hold error, profile points and all signed currents.

Maximum sample gap is 5e-10 s. Every required window must be fully
covered with finite increasing data. Unsettled complete data retains null
recovery and an observation lower bound; it is MISS when that bound exceeds the
limit. Missing/truncated/invalid data is measurement failure. Unexecuted cases
are incomplete, never PASS. Inclusive limits are compared without rounding.

## Supply measurements

Line stimulus starts at minimum VIN, rises to maximum, and returns to minimum,
at the group's highest load, process, temperature and capacitance. The starting
VIN label does not add a different line trajectory. PSRR saves native VIN/VOUT
phasors at 1 kHz and 1 MHz and reports 20 log10(abs(VIN/VOUT)). Check the native
regulated OP; zero/nonfinite transfers cannot produce infinite rejection.

Line and light/heavy-load PSRR are unscored reference measurements. Final
verification is 108 public, 18 independent and three characterization cases.
Each nominal group has six cases. No noise score is imposed on this variant.

## Numerical precision

Independent evaluation uses the captured standard grid for every required case.
Numerical precision comparisons use a separately authorized developer allocation.
A standard-grid PASS is not a per-submission convergence proof.
