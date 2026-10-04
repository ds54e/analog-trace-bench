# Recorded-result import checks

Current coverage: 63 traces across nine SKY130 tasks and seven models, with one
recorded run per task/model. The generated site has 65 HTML pages: Model index,
Task index and 63 individual traces. Original run verdicts are 52 PASS, 10 MISS
and one MEASUREMENT_FAILURE; derived site labels use PASS / FAIL.

The initial 54-trial import is preserved in the
[six-model verification snapshot](records/import-2026-10-04.md). The four accepted
OTA-WIDE reference fragments and all other existing trace/report payloads remain
unchanged. Current per-run hashes, revisions, counts and omissions live in
`data/trace-validation.json`.

## DeepSeek addition — 2026-10-05

Nine public archives from the 2026-10-04 direct-API batch were imported as
DeepSeek 4.1 Flash. The captured launch configuration records DeepSeek-V4.1-Flash;
API usage records identify `deepseek-flash`. The original release aggregate is
retained in `data/campaigns/deepseek-20261004.json` and its archive identities,
configuration/job IDs and outcomes were compared with verified evidence.

All nine compressed SHA-256 hashes and complete unpacked inventories passed.
Every reused task-definition file matched the captured manifest and its local
file hash. Frozen submission revisions/SPICE, Published/Hidden counts, timing,
fixed-topology sizing and all 30 OTA-FIXED robustness samples were verified.
DeepSeek contributes four PASS and five MISS runs.

The OpenCode normalizer preserves completed public text, full tool inputs and
results, and captured read decoration. Six recorded permission/error messages
come from transcript state when the producer's tools record has null output.
Numeric shell exit codes take precedence over the tool's `completed` state;
failures remain visible. Unix millisecond timestamps are converted to UTC.
799 step-accounting records are omitted as transport metadata. Private reasoning
never enters public events; output token counts still include its billed tokens.

New pages contain 152 MODEL, 481 ACTION and 481 RESULT cards. Overall coverage
is 1,134 MODEL, 4,998 ACTION and 4,511 RESULT cards, 22,932 Published rows, 7,833
Hidden rows and seven robustness aggregates. All linked reports retain original
precision and available characterization/fine records, including explicit nulls.

DeepSeek direct-API usage is reconciled per request and against aggregate counts.
Null cache-write counts remain null and have no billable/UI row. The captured
Sunday requests use the documented off-peak schedule; see
[Token costs](TOKEN_COSTS.md) for rates, scope and source-check commands.

## Current verification

```sh
python3.12 tools/trace/import_results.py --all --verify-only
python3.12 tools/import_token_costs.py --check
python3.12 tools/build_site.py --check
python3.12 tools/check_site.py
python3.12 -m unittest discover -s tests -v
node --test tests/trace-tabs.test.cjs
```

All 63 traces and token-cost records were source-checked. The offline site check
covers 65 pages and their local dependencies; 38 Python tests and six Node tab
tests pass. Focused regressions cover OpenCode errors, null exit status, timestamp
units, private/transport omission, unknown/incomplete events, request token
reconciliation, cache semantics, missing values and model identity.

Actual headless Chrome/Playwright review loads all 63 traces and checks both
indexes against source-derived results. Sixteen index cases cover Model/Task,
360/768/1120/1280 px and light/dark mode. 76 trace layout cases cover the nine new
DeepSeek pages plus ten existing representatives at 360/1280 px in both modes.
44 token-table layout cases include every DeepSeek page and Claude/OpenAI
representatives; values were checked on all 63 pages. Tabs, Home/End navigation,
4 px rails, unwrapped keyboard-scrollable payloads, long model names and page
width passed. Browser page errors and failed local requests: zero. Representative
new mobile/dark and desktop/light screenshots were visually inspected.

Local logs/screenshots remain under ignored `out/`; archives stay under ignored
`evidence/`. No archived command or circuit simulation was executed. Generated
HTML is excluded from Git. Publication uses the separate manual Pages workflow.

## DeepSeek per-run coverage

| Run | MODEL | ACTION | RESULT | SPICE bytes | Published / Hidden / Robustness rows |
| :--- | ---: | ---: | ---: | ---: | :--- |
| ldo-always-on-sky130-deepseek-r1 | 16 | 41 | 41 | 514 | 360 / 60 / 0 |
| ldo-core-sky130-deepseek-r1 | 16 | 41 | 41 | 1095 | 360 / 60 / 0 |
| ldo-low-voltage-sky130-deepseek-r1 | 9 | 77 | 77 | 1161 | 360 / 60 / 0 |
| ldo-quiet-sky130-deepseek-r1 | 22 | 58 | 58 | 817 | 612 / 102 / 0 |
| ota-drive-sky130-deepseek-r1 | 9 | 42 | 42 | 1116 | 288 / 153 / 0 |
| ota-fixed-sky130-deepseek-r1 | 31 | 102 | 102 | 2031 | 288 / 153 / 1 |
| ota-free-sky130-deepseek-r1 | 19 | 46 | 46 | 1071 | 288 / 153 / 0 |
| ota-precision-sky130-deepseek-r1 | 17 | 48 | 48 | 925 | 288 / 153 / 0 |
| ota-wide-sky130-deepseek-r1 | 13 | 26 | 26 | 1583 | 432 / 225 / 0 |
