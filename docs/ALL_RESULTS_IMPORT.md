# Recorded-result import checks

Current coverage: 81 traces across nine SKY130 tasks and seven models. Astra has
Run 1–3 for every task; all other models have one recorded run per task/model.
The generated site has 83 HTML pages: Model index, Task index and 81 individual
traces. Original run verdicts are 70 PASS, 10 MISS and one MEASUREMENT_FAILURE;
derived site labels use PASS / FAIL.

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

The DeepSeek pages contain 152 MODEL, 481 ACTION and 481 RESULT cards. After
that addition, coverage was 1,134 MODEL, 4,998 ACTION and 4,511 RESULT cards,
22,932 Published rows, 7,833 Hidden rows and seven robustness aggregates. All linked reports retain original
precision and available characterization/fine records, including explicit nulls.

DeepSeek direct-API usage is reconciled per request and against aggregate counts.
Null cache-write counts remain null and have no billable/UI row. The captured
Sunday requests use the documented off-peak schedule; see
[Token costs](TOKEN_COSTS.md) for rates, scope and source-check commands.

## Astra Run 2–3 addition — 2026-10-05

All 18 additional public Astra archives were imported, with nine task/model
pairs now holding Run 1–3. All additional runs pass both scored stages; the two
new OTA-FIXED runs also pass the full 30-sample robustness evaluation. The
original release summary is retained in `data/campaigns/astra-r2-r3-20261005.json`.
Archive hashes/inventories, configuration/job identities and every reused task
file were compared before catalog installation. Captured tool and public MODEL
payloads, frozen SPICE/revision, independent reports and timing were source-checked.

The new pages contain 181 MODEL, 687 ACTION and 604 RESULT cards. Approved
omissions are 54 transport records and 83 empty successful results. Eleven
file-change events preserve captured paths/status without inventing absent patch
contents. Existing 63 evidence/cost/validation entries and accepted content/report
bytes remain unchanged.

Both indexes keep one row per task/model. Astra badges show `PASS 3 / 3`; time
and USD use the arithmetic mean of the three unrounded run values. The row
continues to link to Run 1; all three individual pages offer working links to
the other runs through their run tabs. Each page selects its own run on load.
There are 1,315 MODEL, 5,685 ACTION and 5,115 RESULT cards in total, 29,484
Published rows, 10,071 Hidden rows and nine robustness aggregates.

## Current verification

```sh
python3.12 tools/trace/import_results.py --all --verify-only
python3.12 tools/import_token_costs.py --check
python3.12 tools/build_site.py --check
python3.12 tools/check_site.py
python3.12 -m unittest discover -s tests -v
node --test tests/trace-tabs.test.cjs
```

All 27 Astra traces, including the 18 new pages, were source-checked. All 81
token-cost records were rechecked against their archives. The offline site check
covers 83 pages and dependencies; 38 Python tests and six Node tab tests pass.
Earlier accepted trace/report hashes protect the unchanged non-Astra records.

Actual headless Chrome/Playwright review loads all 81 traces, verifies their
selected run, payload counts, exact submitted-SPICE hash, evaluation category
count, cost total and peer links. Nine navigation chains follow Run 1 → 2 → 3 → 1.
Sixteen index cases cover Model/Task, 360/768/1120/1280 px and light/dark mode;
pass badges, three-run means, scaled bars and earliest-trace links match the
source catalogs. 72 layout cases cover every new Astra page at 360/1280 px in
both color modes, including token tables, turn rails, unwrapped scrollable code
and keyboard tabs. Browser errors and failed local requests: zero. Representative
new desktop/light and mobile/dark screenshots were visually inspected.

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

## Additional Astra per-run coverage

| Run | MODEL | ACTION | RESULT | SPICE bytes | Published / Hidden / Robustness rows |
| :--- | ---: | ---: | ---: | ---: | :--- |
| ldo-always-on-sky130-astra-r2 | 7 | 25 | 24 | 1240 | 360 / 60 / 0 |
| ldo-always-on-sky130-astra-r3 | 6 | 27 | 24 | 1028 | 360 / 60 / 0 |
| ldo-core-sky130-astra-r2 | 8 | 35 | 25 | 656 | 360 / 60 / 0 |
| ldo-core-sky130-astra-r3 | 11 | 24 | 24 | 879 | 360 / 60 / 0 |
| ldo-low-voltage-sky130-astra-r2 | 11 | 24 | 23 | 656 | 360 / 60 / 0 |
| ldo-low-voltage-sky130-astra-r3 | 14 | 105 | 90 | 1157 | 360 / 60 / 0 |
| ldo-quiet-sky130-astra-r2 | 9 | 56 | 32 | 1163 | 612 / 102 / 0 |
| ldo-quiet-sky130-astra-r3 | 8 | 18 | 18 | 500 | 612 / 102 / 0 |
| ota-drive-sky130-astra-r2 | 10 | 31 | 29 | 671 | 288 / 153 / 0 |
| ota-drive-sky130-astra-r3 | 8 | 30 | 25 | 656 | 288 / 153 / 0 |
| ota-fixed-sky130-astra-r2 | 10 | 43 | 40 | 2042 | 288 / 153 / 1 |
| ota-fixed-sky130-astra-r3 | 12 | 40 | 39 | 2031 | 288 / 153 / 1 |
| ota-free-sky130-astra-r2 | 10 | 38 | 32 | 669 | 288 / 153 / 0 |
| ota-free-sky130-astra-r3 | 8 | 31 | 31 | 661 | 288 / 153 / 0 |
| ota-precision-sky130-astra-r2 | 10 | 33 | 30 | 1476 | 288 / 153 / 0 |
| ota-precision-sky130-astra-r3 | 11 | 34 | 31 | 1492 | 288 / 153 / 0 |
| ota-wide-sky130-astra-r2 | 10 | 26 | 25 | 1541 | 432 / 225 / 0 |
| ota-wide-sky130-astra-r3 | 18 | 67 | 62 | 2218 | 432 / 225 / 0 |
