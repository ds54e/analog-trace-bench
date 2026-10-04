# Always-on LDO measurement contract

Numerical stimulus settings come from spec.json. Loads are 1/20/100 uA;
external capacitors are 10/100 nF. Edges take 2 us, initial hold is 100 us,
isolated plateaus are 200 us, and maximum sample gap is 50 ns. Burst plateaus
are 20 us with eight pulses and a 200 us tail. DC error and recovery use the
absolute 1.176–1.224 V band; maximum transient excursion is 96 mV from 1.2 V.
Recovery must complete within 100 us. Evaluate both load-edge directions.
Minimum-load DC overhead is at most 2 uA, other DC loads at most 10 uA.
Absolute VREF current is at most 1 uA. Use the signed terminal currents;
overhead = max(Iin-Iout,0)+max(Iref,0). Preserve KCL within 1 nA.
No startup, protection, noise or yield requirement is included.

Each standalone DC, load profile, line profile or PSRR condition costs one native
case. A full nominal group has three DC cases and three load profiles (six cases).
Line transient and light/heavy-load PSRR at 1 kHz/1 MHz are reference measurements,
not scored. PSRR is 20 log10(abs(VIN/VOUT)) at the regulated operating point.
Line stimulus goes from minimum to maximum VIN and back at heavy load.

Save full waveforms and OP currents. Settling is final entry into the fixed
recovery band that remains there through the observation end. Check initial
hold DC error and maximum post-edge excursion independently. Burst recovery is
checked after the final falling edge. A complete waveform that never recovers
has a null recovery plus its observation lower bound and fails if that bound
exceeds the limit. Truncated or invalid samples are measurement failures.
One submitted circuit must pass all required conditions without rounding.

## Numerical precision

Independent evaluation uses the captured standard grid for every required case.
Numerical precision comparisons use a separately authorized developer allocation.
A standard-grid PASS is not a per-submission convergence proof.
