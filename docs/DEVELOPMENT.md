# Development

## Sources and generated pages

The website uses deterministic static generation. Presentation is shared; recorded content is separate. It does not use a client-side application framework or fetch the trace before displaying it.

| Path | Role |
| :--- | :--- |
| `tools/templates/page.html` | Shared document head and site header for the index and traces. |
| `tools/templates/trace.html` | Shared trace heading, summary, tabs, and panels. |
| `site/assets/site.css` | Shared colors, fonts, page layout, headings, tables, and focus/scroll behavior. |
| `site/assets/trace.css`, `trace.js` | Trace-specific styles and accessible tab behavior. |
| `site/assets/home.css` | Result-index headings and table columns. |
| `content/traces/<run-id>/summary.html` | Verified summary-table rows. |
| `content/traces/<run-id>/trace.html` | Complete MODEL/ACTION/RESULT markup, original MODEL source templates, final SPICE, and the rendered evaluation table. |
| `site/data/evaluations/<run-id>.json` | Complete original evaluation precision, rows, conditions, revision, completeness and timing. |
| `site/data/runs.json` | Task/run identity and stable page routes. |
| `site/data/token-costs.json` | Verified token counts, reported/estimated USD costs, and source hashes. |
| `data/token-pricing.json` | Dated official Standard short-context rates for reproducible estimates. |
| `data/evidence.json` | All selected trial identities, verdicts, timing, task definitions, hashes, and actual asset URLs. |
| `data/trace-validation.json` | Source-derived counts, circuit hash/revision, and accepted content/report hashes. |
| `site/index.html`, `site/traces/*.html` | Generated output, excluded from Git. |

Prepared fragments are intentional: the transcript formats differ, so archive adapters handle their semantics once and verify them against the source. The static-site build reuses verified markup without reparsing archived commands or repeatedly rendering MODEL Markdown. It is not a universal transcript importer.

Visible trace text and submitted SPICE are already in generated HTML. JavaScript controls only the run tabs. Complete evaluation JSON is linked from each page's head using `rel="alternate"`; its visible table does not require a fetch. Existing page routes and the accepted presentation are preserved. Open the website through a server or export the complete directory; copying one HTML file omits shared dependencies.

## Build and check

Run from the repository root:

```sh
python3 tools/build_site.py
python3 tools/check_site.py
python3 -m unittest discover -s tests -v
node --test tests/trace-tabs.test.cjs
python3 -m http.server 8000 --directory site
```

Open `http://localhost:8000/`. Building and checking saved pages require Python 3.10+ and its standard library. The tab-event tests require Node 20+ and no installed packages. They verify event behavior, not browser layout.

The build creates the index for all catalogued results and trace pages whose `trace` route is present. A null route retains downloadable evidence without claiming an imported HTML trace. Every rendered trace still requires its source-derived validation profile. `--check` detects stale output without writing. `check_site.py` also checks relative links/fragments, unique DOM IDs, run identity, payload counts, content hashes, submitted-SPICE bytes/hash, report hashes, and evaluation revision/rows. Changing a saved command and regenerating HTML still fails the content check.

For a portable review copy:

```sh
python3 tools/build_site.py --output out/preview
python3 -m http.server 8000 --directory out/preview
```

An export includes shared assets and JSON reports. Its output directory must be outside `site/`. Asset URLs include content hashes so updated CSS/JavaScript do not reuse an older cache entry. Relative URLs work under the GitHub Pages project path.

`site_templates.render_page` loads `site.css` before each page's component CSS.
Use the shared `page-shell`, `summary-table`, and `table-scroll` classes for
layout and tables instead of repeating base rules in page styles. Index
headings use the same display font and weight as trace headings; the compact
index tables scroll horizontally on narrow screens and remain focusable.
The index uses `AI model`, `Evaluation result`, and `Model-call time` to match
run summaries. Both duration renderers use `format_duration` (`H:MM:SS`), and
derived evaluation labels use `PASS` / `FAIL`. Archived transcript text,
prepared fragments, and complete JSON reports retain their original values.

The index has one row per model, with each recorded Run 1–3 shown separately
inside the evaluation, time, cost, trace, and archive columns. It has no Run
column and does not aggregate worst values. Labels identify individual runs
when several are present; unavailable runs are not fabricated. The concise
task descriptions in `site/data/runs.json` describe the captured specifications.

Token usage is appended at the end of generated run summaries without editing
the verified fragments. Import and source-check it with:

```sh
python3 tools/import_token_costs.py
python3 tools/import_token_costs.py --check
```

This importer verifies the archive hash, package/index/shared-record hashes,
trial identity, and final usage reconciliation before expanding `usage.json`.
Claude totals come from the recorded provider cost. OpenAI totals are explicitly
marked `≈`: the archived CLI-turn aggregates do not reveal per-request context
lengths or effective billing tiers, so the comparison uses the dated Standard
short-context rates. Do not apply long-context multipliers to cumulative run
tokens. Cached OpenAI input is subtracted from the input total; Claude input
already excludes cached reads/writes. Reasoning is included in output and is
never billed twice. Missing usage remains unknown. The build validates cost
arithmetic offline; the importer's `--check` validates against original assets.

CI and the manual Pages workflow build before checking. `main` and `refactor/**` pushes run checks; publication remains a separate manual action. Commit sources and shared assets, not generated HTML. For a style or layout change, edit the corresponding shared asset/template and rebuild.

## Import a run

1. Inventory the evidence and identify its task/model/run, transcript schema, authoritative submission, evaluation, and timing.
2. Adapt a source parser and task semantics using `docs/TRACE_GUIDE.md`. Use the existing rendering helpers and shared website presentation.
3. Produce verified summary rows and trace markup. `build_traces.write_run_sources` separates complete inert evaluation JSON from prepared markup and writes the canonical fragments/report for a run ID. An adapter can also write those files directly after source verification.
4. Add the run to `site/data/runs.json` and `data/evidence.json`. Keep `url: null` until an actual Release asset exists. Use a unique `traces/<filename>.html` route.
5. Add source-derived counts, submitted-SPICE byte/hash, submitted revision, and evaluation category/stage row counts to `data/trace-validation.json`. Record SHA-256 of `summary.html`, `trace.html`, and the exact saved report bytes after comparing them to the archive. Do not approve an unverified result merely by updating hashes until checks pass.
6. Build, check, and inspect affected browser behavior when available. Record actual coverage and approved omissions. Commit to the requested branch; use `main` when no different branch was requested.

Campaign import (all currently catalogued results):

```sh
npm install --ignore-scripts
python3 tools/trace/import_results.py --all
python3 tools/trace/import_results.py --all --verify-only
```

The importer verifies the Release asset SHA-256 and the unpacked inventory,
expands factored records, and joins streams in manifest order. It adds missing
pages and source-checks existing pages without changing accepted fragments.
Supply catalog run IDs to process selected results. Reviewed circuit summaries
live in `data/trace-summaries.json`; these describe the submitted circuits,
not measured outcomes. Use Python 3.10+ (`python3.12` in the import workspace).

The captured campaign includes Codex file-change events without patch text,
Claude Read decoration, task-specific LDO limit variants, censored recovery
measurements, a failed OTA balanced-point measurement, and OTA-FIXED's sizing
and robustness format. These have explicit handling and focused tests. The
importer rejects unknown public transcript formats instead of silently omitting
them. See [import checks](ALL_RESULTS_IMPORT.md) before extending it to a new
campaign or task. Archived commands are never executed.

Existing adapters:

```sh
python3 tools/fetch_evidence.py --list
python3 tools/fetch_evidence.py ota-wide-sky130-astra-r1
python3 tools/trace/build_astra_page.py evidence/ota-wide-sky130-astra-r1-20261003-model-time-recovery3.tar.xz
python3 tools/trace/build_sonnet_example.py evidence/ota-wide-sky130-sonnet-r1-20261003-model-time-full9.tar.xz
```

Fetching requires the actual asset URL. Adapters source-verify their fixture, update canonical fragments/reports, and rebuild the site. Optional `--output` writes a diagnostic intermediate page instead of importing; it is for source checks and is not a portable standalone export. Use `build_site.py --output` for review copies. Opus and Sol use verified prepared fragments; no exact-fixture archive adapter is included for them initially.

Importing MODEL Markdown requires Node 20+ and the pinned dependency:

```sh
npm install --ignore-scripts
```

The Codex runtime can alternatively supply `CODEX_PRIMARY_RUNTIME_NODE` and `CODEX_PRIMARY_RUNTIME_NODE_MODULES`. Adapters were checked with Python 3.12.14, Node v24.19.0, and marked 17.0.5. Their OTA prefixes, summaries, metric definitions and count assertions require adaptation for other tasks.

## Fidelity and verification scope

Preserve decoded MODEL/ACTION/RESULT and final-SPICE strings, including whitespace and final newlines. Git attributes disable line-ending normalization and whitespace cleanup for canonical fragments. Keep final SPICE and evaluation after the historical trace.

Accepted content/report hashes guard prepared fragments. Presentation edits normally leave them unchanged. If an adapter or corrected source changes content, compare against authoritative evidence and update validation records with a documented reason. Never alter archived payloads to satisfy a visual or whitespace check.

Continuous checks are offline. They do not download archives, run simulations, or establish fidelity to evidence that has never been inspected. Source fidelity is verified during import; static checks then protect accepted records. A new parser warrants focused fixture tests and source comparisons. A cosmetic change needs affected-output verification. Broaden checks for new behavior, failures, or unresolved concerns.

For a larger adapter change, keep a short progress note with schema assumptions and remaining acceptance checks so another session can resume from repository state.

The workflow follows OpenAI's [progressive-disclosure guidance](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra) and [GPT-6 prompting/verification guidance](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-6.1-sol), checked on 2026-10-04: concise repository routing, relevant task references, explicit completion criteria, and proportionate verification.

## Standalone evidence analysis

[Analysis](ANALYSIS.md) documents public-only downloading, verified unpacking, record expansion and timing interpretation. `tools/atb_analysis_archive.py`, `tools/atb_analysis_export.py` and `tools/analysis_read.py` require only Python. `data/tasks/` retains byte-exact captured specifications and measurement documents with per-file hashes. Public site builds do not access the development repository or execution hosts.
