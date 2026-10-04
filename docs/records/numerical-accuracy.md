# Numerical accuracy policy

OTA and LDO independent evaluation uses `fixed-grid-v1`. Each fresh attempt
captures its measurement settings, native dependencies, evaluator and complete
evaluation matrix. Every required case runs on that grid. Inclusive electrical
limits are compared without rounding. There is no automatic refinement stage or
additional refinement budget in participant evaluation.

## Development qualification

Precision checks use a separately authorized, finite development allocation.
Compare the same circuit, pinned device models and electrical conditions while
changing only the declared numerical settings. Cover demanding conditions and
representative circuit behavior. Record the actual settings, metric differences,
verdicts, solver failures, case accounting and raw evidence for both measurements.

Refine the settings relevant to the measurement: transient maximum timestep,
DC sweep spacing, AC frequency spacing, noise integration spacing or solver
tolerances. A finer transient grid does not test DC operating-point convergence
or noise integration accuracy. The existing development utilities retain their
explicit finer-grid options; their effects differ by analysis.

Existing qualification records are evidence for their tested references and
conditions. They do not establish an error bound for every submitted circuit.
Keep those records and their original identities. A change to measurement
settings or electrical acceptance requires new captured task inputs and the
appropriate native qualification, never an edit to a registered attempt.

## Participant results and follow-up

Results retain `numerical-policy.json` and report `STANDARD_GRID_ONLY`.
This means the electrical verdict uses the captured standard grid. It is not a
per-submission convergence proof. Missing, invalid or failed measurements retain
their ordinary failure states; this policy cannot convert them to PASS.

An electrical result close to a limit can motivate a separately authorized
development investigation. Preserve the original result and submission, state
the finite case budget, and retain both measurements. A numerical verdict change
is an unresolved finding for interpretation and task qualification. It cannot
replace the original result with a more favorable score.

Registered attempts execute their captured rules. Evidence readers preserve the
numerical checks actually recorded for those attempts, including any conditional
fine checks, without applying a new rule to an existing result.

## Independent native case counts

| Task | Cases per submitted DUT |
|---|---:|
| OTA-FIXED-SKY130 / OTA-ADM45 | 240 |
| OTA-FREE-SKY130 / OTA-FREE-ADM45 | 210 |
| OTA-DRIVE-SKY130 / OTA-PRECISION-SKY130 | 210 |
| OTA-WIDE-SKY130 | 318 |
| LDO-CORE-SKY130 / LDO-CORE-ADM45 | 129 |
| LDO-ALWAYS-ON-SKY130 / LDO-LOW-VOLTAGE-SKY130 | 129 |
| LDO-QUIET-SKY130 | 231 |

These counts include the required characterization cases where specified.
The task planner and captured matrix govern execution. Failed or interrupted
native launches count; there are no free retries or early exits on electrical MISS.
