# Timing and host evidence

Each registered attempt captures its implementation. Its controller records
execution observations through reporting, then closes the records before storage.
Resume adds a session with its own host configuration and clock identity.

## Retained records

| Record | Scope |
|---|---|
| `campaigns/<attempt>/execution-environment.json` | Host configuration at each session start, scheduling limits, captured source hashes and regeneration archive identity |
| `campaigns/<attempt>/host-resources.jsonl` | Shared-host CPU counters, available memory, swap/OOM counters and pressure every 30 seconds, plus session start/end samples |
| `campaigns/<attempt>/host-resource-summary.json` | Observed memory minimum, counter deltas, sampling gaps, collection errors and unclosed sessions |
| `campaigns/<attempt>/campaign-events.jsonl` | Controller transitions with UTC, monotonic timestamps, boot identity and run ID |
| `campaigns/<attempt>/execution-timing.json` | Controller state intervals, including independent evaluation, audit and reporting |
| `campaigns/<attempt>/storage-timing.jsonl` | Environment preparation and archive/pruning attempts through their finish or failure |
| `<run>/evidence/measurement-timing.json` | Design and post-submission verification windows, interval unions and CPU totals |
| `<run>/evidence/tools.json`, `events.jsonl` | Observable participant commands and broker calls, including concurrent activity |
| `<run>/evidence/model-timing.jsonl` | Allowlisted CLI request boundaries and span ancestry; prompts, bodies and credentials are discarded before persistence |
| `<run>/evidence/model-timing.health.json` | Collector closure, errors, byte counts, host clock anchors and authenticated pinned CLI identity |
| `<run>/evidence/model-call-timing.json` | Completed model-call intervals, prewarm classification, known subtotal and explicit unknown intervals |
| `<run>/evidence/submission-timing.json` | Frozen controller decision and separately derived model-budget lateness |
| Case `process_timing` | Exact ngspice PID, UTC/monotonic start/end, boot ID, elapsed time, user/system CPU and Linux maximum RSS |
| Case `execution_timing` | Executor timing, native slot waits, stage boundaries and snapshot time |
| Case `extraction_timing` | Free-netlist extraction start/end and elapsed time |
| Case `processing_timing` | Native harness admission/check/hash spans with wall and current-thread CPU |
| Case `extraction_timing.processing_timing` | Free-netlist extraction spans, including nested waveform read/validation |
| Case `execution_timing.processing_timing` | Observed case-worker processing spans, including fixed-OTA waveform reads |
| First free-netlist case `artifact_processing_timing` | Hashing all native artifacts once for the shared measurement group; aggregate once per invocation |
| Case `disk_capacity` | Output forecasts, minimum free bytes and final observed admission/runtime checks |

The paths above are logical paths in the analysis export. JSONL is split into
chunks listed by the manifest; concatenating the chunks reconstructs the stream.
Campaign and run `availability.json` mark absent files explicitly. The runtime
keeps the source records under its campaign report directory. Storage timing is
written under `runs/storage/<attempt>/` and included in the export.

## Time and missing data

### Model calls

The model budget counts the union of request intervals, including provider queue,
transport, retries and inference. Pure inference remains null because providers
do not expose it separately. Local tools, Python, ngspice and waits alone consume
no model budget. Model calls overlapping those tools still count.

Claude records official `llm_request` spans. Allowlisted API-body dispatch events
also start the live clock; the body itself is discarded before writing. Codex
records stream starts and response-completed events. The pinned CLI emits
an HTTP duration completion followed by a usage summary, while WebSocket uses
the usage completion. The collector selects the boundary by the corresponding
dispatch transport so it neither drops WebSocket completion nor counts the
HTTP summary twice. HTTP header and WebSocket send durations alone are
insufficient. Span ancestry excludes startup prewarm. Every exported span retains
validated ancestry IDs; unfamiliar span names and all attributes are discarded.
Manual and automatic compaction retain the pinned CLI's `session_task.compact`
and `run_auto_compact` scopes and count their model requests;
its local processing remains outside the model budget. Only API dispatch failures
and response-stream events close model intervals. A failed local tool is retained
as tool evidence and cannot close an API request.
Events without the CLI's custom `event.timestamp` use OTLP `timeUnixNano`,
the event's own UTC timestamp. Observation or arrival time is never substituted;
missing, zero or invalid event timestamps remain recording failures. The
normalized record identifies which timestamp field supplied the event time.
The pinned CLI also names model-catalog discovery `codex.api_request`.
Its explicit `/models` endpoint is excluded before parsing timing fields:
catalog discovery is not a sampling request and omits the session timestamp.
Sampling events with missing or invalid time still fail recording.
Only the pinned CLI descended from the launched participant may send to the
local collector; an unrelated participant subprocess cannot fabricate telemetry.
OpenCode records host-gate request admission and settlement instead.

CLI exports are buffered. Codex dispatch is observable after HTTP headers or
WebSocket send, so long header waits delay live detection. Active observed calls
continue consuming budget between exports. The controller rechecks a budget
crossing after two seconds to let completion exports settle; detection delay is
not an additional promised participant allowance. The observed controller cutoff
is saved. Final reports derive complete intervals and clip them at submission,
excluding any later narration. Frozen submission records are preserved; derived
lateness is stored separately as `model_time_final`.

A crash, missing completion, ambiguous pairing, missing ancestry, rejected
export or host UTC step leaves the full total unknown. A known subtotal is
retained and is not presented as a complete total. A detected recording error
stops the owned participant for review. The separate private four-hour safety
limit uses monotonic time and does not depend on telemetry progress.

`measurement-timing.json` includes `model_calls`: design model-call time, its
overlap with measurement RPCs, measurement time without model calls, and elapsed
time outside model calls. Time without model calls can include participant Python,
other local work, scheduling and idle time; it does not establish model idleness.
Intervals are merged before subtraction, so overlap is never added twice.

### Local processing and host resources

Elapsed time uses a monotonic clock when both endpoints have the same boot
identity. UTC remains available for matching records and reading the timeline.
Aggregates use UTC only when matching monotonic boundaries are unavailable and
label that fallback. Clock sources remain explicit.

Executor queue timing is `recorded` when a case runs through the executor and
`not_applicable` when it executes directly. Its value is null for a direct case.
Missing instrumentation is `not_recorded`; an observed zero remains zero.
Native-slot wait timing is separate from the executor queue.

Processing observations remain in memory until ordinary case evidence is written.
Each span records UTC/monotonic endpoints, current-thread CPU, completion/failure,
and explicit parent identity. A waveform reader records bytes, points and signals.
Nested read time is already included in extraction; do not add inclusive spans
twice. Thread CPU excludes simultaneous case threads and native child processes.
Maximum Python RSS is a shared process lifetime high-water mark, not an isolated
phase peak. Failed native processing spans remain in failure execution timing.

Measurement wall time merges overlapping intervals. CPU seconds add across
processes. `native_cpu_sum_s` has the same design window as native wall time.
`post_submission` covers submission through completed verification.
`all_cases_native_cpu_sum_s` retains every case's CPU, including evaluation.
If a process crosses a phase boundary, its CPU is unknown for that
phase; the contained-process subtotal and crossing count remain available. The
full case CPU is retained without estimating how it was divided.

Native-only reports use schema 3 with `scope: "native_only"`. Their design
phase is `not_applicable` with null duration. `independent_evaluation` starts
at the evaluation controller's first VERIFYING transition and ends at recorded
verification completion. It excludes preparation, queue, audit and storage.
Missing boundaries remain unknown; fixture freeze is never used as a proxy.
Producing this report requires no participant CLI, login or model files.

Combined Git handoff reports use schema 3 with
`scope: "design_and_remote_evaluation"`. Design and independent evaluation use
their own host-local clocks and case sets. The post-submission timeline uses
cross-host UTC and explicitly retains unknown clock synchronization uncertainty.
It includes handoff and scheduling delays and does not estimate their causes.
Both hosts' recorded storage streams are reconstructed byte for byte in the
combined export; their availability stays explicit when missing.

Host samples include other attempts and background services. Counter deltas use
matching session and boot identities; resets and missing counters remain unknown.
Sampling gaps and interrupted sessions remain visible. Sampled memory minima do
not establish exact peaks. Collector CPU covers reading counters and excludes
log writing. Diagnostics flush to the OS per sample and sync at session boundaries.

## Storage and interpretation

Resource records and summaries are fixed before archival. Storage records its
preparation and archival intervals before publishing the immutable export.
Publication/build/verification timing is retained in the external
`runs/storage/<attempt>/analysis-export.json` receipt. This receipt also binds the
published manifest. Storage verification preserves its original publication
timing, and already published source streams remain frozen on retries.

Derived snapshots retain the collection receipt, design storage stream,
builder source hashes and generated file hashes. Reading a derived snapshot
does not launch models or native cases or change scores. Frozen exports are
verified against their captured evaluation policy; `numerical-policy.json` is
required for fixed-grid-v1 registrations. Other captured policies retain their
original export bytes and fine evidence. See [Numerical accuracy](NUMERICAL_ACCURACY.md).

Compare actual elapsed time, measured waits, native wall/CPU, cases and electrical
quality together. Participant work can overlap measurement. Time outside a
measurement includes provider latency and other tools; it cannot establish pure
model inference. Provider queue, transport and inference timings are retained
only to the extent the CLI exposes them. Removing waits cannot reconstruct the
design decisions or exploration lost to a deadline. Hardware and swap effects
are observations for comparison, not an exact causal time correction.
