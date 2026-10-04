# Public result analysis

This repository and its public Release assets contain the information used to
maintain the website and inspect recorded trials. Building saved pages requires
Python 3.10+ and its standard library. Reading analysis also uses only Python;
provider authentication, a private repository, a PDK and ngspice are unnecessary.

## Download, verify and read

`data/evidence.json` lists every selected trial, exact archive URL and SHA-256,
original electrical status, captured source/configuration identities, model time,
and the matching task definition under `data/tasks/`. Display IDs identify each public trace; each catalog entry also names its full attempt ID.

```sh
python3 tools/fetch_evidence.py --list
python3 tools/fetch_evidence.py ota-wide-sky130-astra-r1
python3 tools/atb_analysis_archive.py verify evidence/ARCHIVE.tar.xz
python3 tools/atb_analysis_archive.py unpack evidence/ARCHIVE.tar.xz evidence/unpacked/RUN
python3 tools/analysis_read.py evidence/unpacked/RUN/analysis
python3 tools/analysis_read.py evidence/unpacked/RUN/analysis --list
python3 tools/analysis_read.py evidence/unpacked/RUN/analysis --file astra-01/evidence/submission.json
```

The unpacker checks the complete byte/hash inventory and rejects unsafe paths,
links, duplicates and existing destinations. The reader expands `$atb_ref`
records and joins JSONL chunks in their recorded order. It never executes saved
commands. Use the actual run slot shown by the reader rather than assuming
`astra-01` for another model. `availability.json` distinguishes absent records
from recorded values. Missing values remain unknown and never become zero.

## What the records mean

- `submitted.spice` and `submission.json`: the frozen design and revision.
- `transcript.jsonl` and `tools.json`: saved messages, actions and results.
- `published.json`, `hidden.json`, `robustness.json`: original independent
  evaluation, conditions, units, limits, missing measurements and verdicts.
- `requests.json`, `revisions.json`, `experiments/`: exploration and design edits.
- `submission-timing.json`, `model-call-timing.json`: AI-side time and lateness.
- `usage.json`: provider-normalized token usage, cached input/write semantics,
  final total reconciliation (CLI producers) or per-request raw usage (direct API),
  and provider cost where exposed. Reasoning tokens
  are already included in output. The site's `token-costs.json` retains verified
  counts/source hashes and distinguishes recorded totals from Standard-rate
  comparison estimates; see [token cost accounting](TOKEN_COSTS.md).
- `measurement-timing.json`: measurement intervals, native CPU and waiting time.
- `campaigns/`: environment, host resources and controller/evaluation/storage time.
- `audit.json`, `storage-link-audit.json`: recorded integrity checks.

AI-side time is the union of provider request intervals, including queueing,
transport, retries and inference. Local Python, ngspice and filesystem execution
are excluded unless overlapping an active model request. It is not a measurement
of pure thinking time. The captured budget is 90 minutes; late submissions remain
eligible. A private four-hour wall safety limit is separate. Do not sum concurrent
or overlapping intervals as elapsed campaign time. See
[timing definitions](records/timing-evidence.md) for clocks and scope.

Keep the original `PASS`, `MISS`, and `MEASUREMENT_FAILURE` labels in analysis.
For the selected campaign, a contract-limited failure to find the required
balanced operating point counts as a design failure. The Luna OTA-WIDE entry
records that diagnosed cause separately. An infrastructure error requires a
separate unresolved evaluation classification; do not infer design failure from
every missing file. Numerical resolution and grid limitations remain recorded.

## Website maintenance

All selected trials appear in both the Model and Task indexes and have downloadable evidence.
Index time and cost bars show arithmetic means per task/model across available
runs; pass badges show passed / recorded runs. Individual pages show one run.
All 63 selected trials have prepared HTML views, including failed trials. The
four accepted OTA-WIDE reference pages are preserved. The campaign importer
uses the verified archive reader, supports the captured Codex, Claude and OpenCode
formats, and source-checks saved fragments before keeping an existing page.
See [all-result import checks](ALL_RESULTS_IMPORT.md) for coverage and omissions. Never assume example metric limits,
counts, task prefixes or transcript semantics for another task.

Raw waveforms remain on the evaluation/design hosts. They are needed for a fresh
raw waveform audit, not for recorded result interpretation or website operation.
Archive source paths identify the original host and are not local prerequisites.
