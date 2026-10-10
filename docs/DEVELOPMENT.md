# Development

## Build, test, and preview

Run from the repository root with Python 3.10+:

```sh
python3 tools/build_site.py
python3 tools/check_site.py
python3 -m unittest discover -s tests -v
node --test tests/run-navigation.test.cjs
python3 -m http.server 8000 --directory site
```

Open `http://localhost:8000/`. Static generation and offline validation use only
Python's standard library. Run-navigation tests require Node 20+. Importing new
MODEL Markdown also requires the pinned `marked` dependency:

```sh
npm install --ignore-scripts
```

On Windows PowerShell, enable UTF-8 before running the Python commands and use
`python` in place of `python3`:

```powershell
$env:PYTHONUTF8 = '1'
python tools/build_site.py
python tools/check_site.py
```

`build_site.py --check` detects stale output without writing. Export a complete
portable preview with `python3 tools/build_site.py --output out/preview`, then
serve that directory. The export destination must be outside `site/`.

## Maintained sources

| Path | Role |
| :--- | :--- |
| `tools/templates/` | Shared document shell and trace layout. |
| `site/assets/` | Shared typography, colors, tables, scrolling, and navigation. |
| `content/traces/<run-id>/` | Canonical summary rows and complete trace markup. |
| `site/data/evaluations/` | Full-precision independent reports. |
| `site/data/runs.json` | Task descriptions, model/run identities, and routes. |
| `data/evidence.json` | Release URLs, hashes, configurations, verdicts, and timing. |
| `data/trace-summaries.json` | Reviewed descriptions of submitted circuits. |
| `data/trace-validation.json` | Content/report hashes, revisions, and source coverage. |
| `data/token-pricing.json`, `site/data/token-costs.json` | Dated rates and source-derived costs. |
| `tools/trace/rendering.py` | Shared trace markup, Markdown, metric, and timing helpers. |
| `tools/trace/transcript.py` | Captured Codex, Claude, and OpenCode event semantics. |
| `tools/trace/import_results.py` | Archive import and source verification. |
| `tools/build_index.py` | Aggregation and rendering for both indexes. |

Build from canonical fragments rather than editing generated HTML. Prepared
fragments avoid archive parsing on each build. Shared assets use content-hashed
URLs, and internal routes are relative. Full trace text and SPICE remain readable
without JavaScript; each page links its complete evaluation JSON.

## Presentation

`index.html` groups by model; `tasks.html` groups by task. Both use the same
validated catalog. `DISPLAY_ORDER` in `tools/build_index.py` controls section and
row order; unlisted models and tasks follow the specified entries.

Each task/model pair has one row linking to its earliest available run. A PASS
badge means all recorded runs pass; otherwise the badge is FAIL. Passed / recorded
counts appear beside the badge. Time and USD are arithmetic means of unrounded
run values. Incomplete metrics remain unknown. Time rounds to whole minutes
(half up). Multiple runs show their minimum and maximum on the same scale as
the mean bar; single runs have no range markers.

Run selectors use native links and `aria-current="page"`. Arrow/Home/End keys
move focus, and Enter follows the focused link. Missing runs are disabled labels.
Individual pages contain Run and evaluation, Circuit design, and Token cost
tables, followed by the transcript, final SPICE, and independent evaluation.
See [Trace guide](TRACE_GUIDE.md) for the complete content and layout contract.

## Import recorded runs

1. Identify the archive, task/model/run, captured configuration, transcript
   schema, submission, evaluation, and timing. Verify archive and task identities.
2. Register the run in `data/evidence.json` and `site/data/runs.json`. Preserve
   its full attempt ID, original slot, `captured_run`, and configuration. Use
   `comparison_repeat` for public Run 1–3 labels when selected attempts are
   numbered for comparison. Use exact immutable Release URLs.
3. Review the submitted circuit and rationale; add its description to
   `data/trace-summaries.json`. Extend producer/task semantics when needed and
   add focused checks for a new format.
4. Import costs and traces, then verify sources:

```sh
python3 tools/import_token_costs.py
python3 tools/trace/import_results.py --all
python3 tools/trace/import_results.py --all --verify-only
python3 tools/import_token_costs.py --check
python3 tools/build_site.py
python3 tools/check_site.py
```

The trace importer also accepts individual catalog run IDs. It checks compressed
hashes and complete unpacked inventories, expands factored records, and joins
streams in manifest order. Existing fragments are source-checked before reuse.
New pages receive fragments, linked reports, routes, and validation profiles.
Source verification requires the original archives; normal builds and CI are
offline. See [Analysis](ANALYSIS.md) for standalone evidence reading.

## Verification and publication

Preserve decoded payloads, whitespace, and final newlines. Git attributes protect
canonical fragments from line-ending conversion. Content corrections require
comparison with original evidence; do not update hashes merely to pass a check.
Task limits, metric definitions, and counts come from the captured task.

Run the build and site check for every change. Run Python tests for tooling
changes and Node tests for navigation changes. Browser inspection verifies
layout and interaction; report it separately from source/DOM checks. Neither
the build nor the checks execute archived commands or circuit simulations.

Repository updates use `main` unless requested otherwise. The Check website
workflow validates source updates. Pages publication is manual; see
[Publication](PUBLISHING.md) for deployment and live verification.
