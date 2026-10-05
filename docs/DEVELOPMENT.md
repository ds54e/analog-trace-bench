# Development

## Build and check

Run from the repository root with Python 3.10+:

```sh
python3 tools/build_site.py
python3 tools/check_site.py
python3 -m unittest discover -s tests -v
node --test tests/trace-tabs.test.cjs
python3 -m http.server 8000 --directory site
```

Open `http://localhost:8000/`. Static generation and offline checking need only
Python's standard library. Tab tests require Node 20+; importing new MODEL
Markdown also requires `npm install --ignore-scripts` for pinned `marked`.
Use `python3.12` in a workspace whose default Python is older than 3.10.

`build_site.py --check` detects stale output without writing. `check_site.py`
checks local links, DOM IDs, run identities, accepted content/report hashes,
payload counts, exact submitted-SPICE bytes/hash, and evaluation revisions/rows.
Neither command downloads archives or runs circuit simulations.

Export a complete portable preview with `python3 tools/build_site.py --output
out/preview`, then serve that directory. The destination must be outside `site/`.
Shared asset URLs contain content hashes and all internal routes are relative.

## Source layout

| Path | Role |
| :--- | :--- |
| `tools/templates/` | Shared document/header and trace layout. |
| `site/assets/site.css` | Shared typography, colors, tables, focus and scrolling. |
| `site/assets/home.css`, `trace.css`, `trace.js` | Index and trace presentation; keyboard navigation between runs. |
| `content/traces/<run-id>/` | Canonical verified summary rows and complete trace markup. |
| `site/data/evaluations/` | Original independent reports at full precision. |
| `site/data/runs.json` | Tasks, descriptions, model/run identities and stable routes. |
| `data/evidence.json` | Exact Release URLs, hashes, configurations, verdicts and timing. |
| `data/trace-summaries.json` | Reviewed submitted-circuit descriptions. |
| `data/trace-validation.json` | Accepted hashes, revisions and source coverage. |
| `data/token-pricing.json`, `site/data/token-costs.json` | Dated rates and source-derived costs. |
| `tools/trace/transcript.py` | Captured Codex, Claude and OpenCode event semantics. |
| `tools/trace/import_results.py` | Verified archive import, evaluation and payload checks. |
| `tools/build_index.py` | Shared aggregation and rendering of both index views. |
| `site/index.html`, `site/tasks.html`, `site/traces/` | Generated output, excluded from Git. |

Keep source archives in Releases and ignored local `evidence/`, outside the
Pages artifact. Build from canonical fragments; do not edit generated HTML.
Prepared fragments avoid reparsing archives and rerendering Markdown on every
build. Full trace text and SPICE are readable without JavaScript; the complete
report is linked through `rel="alternate"` without a required client fetch.

## Shared presentation

The warm background, sans-serif typography, headings and horizontal table rules
come from shared assets. Use `page-shell`, `summary-table` and `table-scroll`
rather than duplicating base styles. Follow [Trace guide](TRACE_GUIDE.md) for
payload fidelity, turn rails and five-line, unwrapped scrollable code boxes.

`index.html` groups by model; `tasks.html` groups by task and shows its short
description. Every header offers Model / Task links; the current index has
`aria-current="page"`, and the brand returns to the Model view. Both indexes
render from one validated result snapshot. Visible column headings are hidden;
Task/AI model, Pass, Model-call time and USD remain semantic headers.

Each task/model pair has one row. Its label links to the earliest available
trace; run links open other recorded runs directly. Pass shows passed / recorded runs
in a PASS badge when all runs pass, otherwise FAIL. Time and USD are arithmetic
means across recorded runs, calculated before rounding. Missing values stay
unknown rather than producing partial means. Time shows minutes to one decimal,
USD uses `$2.01`; blue and brown bars show the mean. For multiple recorded runs,
small dots mark their minimum and maximum, joined by a thin horizontal line
over the mean bar; hover text includes both values. Bars and markers share a
scale up to the largest individual run
in that section, so the maximum marker stays within the track. Single-run rows
have no range markers. Incomplete metrics remain unknown without partial ranges.
The index has no Run, Design or Archive columns.

Run selectors are native links, with `aria-current="page"` on the current run.
Recorded runs open in one click, including without JavaScript; browser history
and opening a new tab work normally. Arrow/Home/End keys move focus between
recorded-run links, and Enter follows the focused link. Missing runs remain
visible as disabled labels with an explanatory tooltip.

Individual summaries have Run and evaluation, Circuit design and Token cost
tables. Their first column aligns; presentation splits verified fragments
without changing them. Token costs use concise Type / Tokens / Cost labels,
unit rates such as `$10.00 / 1M` and plain totals. See [Token costs](TOKEN_COSTS.md)
for provider-specific accounting and import commands.

## Import recorded runs

1. Inventory the actual Release assets, task/model/run, submission, transcript
   schema, evaluation and timing. Verify the archive identity and task files.
2. Register evidence-derived entries in `data/evidence.json` and
   `site/data/runs.json`, initially with `trace: null`. Use an actual immutable
   asset URL; never copy another run's configuration, status or hashes.
3. Review the submitted SPICE/rationale and add its circuit description to
   `data/trace-summaries.json`. Extend transcript/task semantics when needed and
   add focused producer-format checks; unknown public formats must be rejected.
4. Download/unpack the selected archives and import token costs before the final
   site build. [Analysis](ANALYSIS.md) documents standalone evidence reading.
5. Import selected catalog run IDs, or source-check all registered results:

```sh
npm install --ignore-scripts
python3 tools/import_token_costs.py
python3 tools/trace/import_results.py --all
python3 tools/trace/import_results.py --all --verify-only
python3 tools/import_token_costs.py --check
```

The importer verifies compressed SHA-256 and the full unpacked inventory,
expands factored JSON, and joins streams in manifest order. It compares tool
inputs/results, completed public messages, frozen SPICE and independent reports.
Missing pages receive canonical fragments, linked reports, routes and validation
profiles; accepted existing fragments are source-checked and preserved.

Codex file-change records retain captured paths/status without inventing absent
patches. Only recognized Claude Read line-number decoration is removed. OpenCode
uses millisecond timestamps and completed/error tool states; shell exit codes
remain authoritative, and recorded permission errors remain visible when the
saved tools record has no result string. Step accounting and private reasoning
are excluded from public events. See [Import checks](ALL_RESULTS_IMPORT.md) for
current coverage and the historical fixture records.

Task-specific limits, censored measurements, balanced-point failures and fixed
OTA sizing/robustness have explicit handling. Do not reuse example counts or OTA
limits for another task. Existing Astra/Sonnet fixture builders remain examples;
use the campaign importer for current multi-model coverage.

## Verification and publishing

Preserve decoded payload strings, whitespace and final newlines. Git attributes
protect canonical fragments from line-ending conversion. Do not change accepted
hashes merely to make a check pass; compare any content correction to authoritative
evidence and document its reason. Source checks require downloaded archives;
offline CI protects already accepted records. Browser checks assess layout,
scrolling and tabs, and must be reported separately from source/DOM checks.

Commit authorized sources and shared assets to `main` unless the task requests
another branch. CI runs build/check and focused tests. Publication is a separate
manual workflow; honor authorization already given in the session. Follow
[Publishing](PUBLISHING.md) for deployment and live verification.
