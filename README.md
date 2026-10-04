# Analog Trace Bench

Public recorded circuit-design traces and website development tools.

The generated website lives in `site/`. It contains recorded pages for all 54 selected trials across nine SKY130 tasks and six models, preserving the four accepted OTA-WIDE-SKY130 reference pages. Each trace retains saved public messages, actions and results, the submitted SPICE, and the recorded independent evaluation, including failed trials and available robustness records.

Original evidence archives belong in GitHub Release assets. They are not committed to this repository or included in the Pages deployment.

## Local development

```sh
python3 tools/build_site.py
python3 tools/check_site.py
python3 -m unittest discover -s tests -v
python3 -m http.server 8000 --directory site
```

Open `http://localhost:8000/`. Building and checking saved pages need only Python 3.10+. Importing new MODEL Markdown also needs Node and `marked`; see [Development](docs/DEVELOPMENT.md).

## Repository map

| Path | Purpose |
| :--- | :--- |
| `site/` | The only directory deployed to GitHub Pages. |
| `content/traces/<run-id>/` | Canonical summary rows and trace markup with complete saved payloads. |
| `tools/templates/` | Shared page shell and trace layout. |
| `site/assets/` | Shared styles and tab behavior. |
| `site/traces/` | Generated trace pages, excluded from Git. |
| `site/data/evaluations/` | Full-precision independent evaluation reports, linked from each page. |
| `site/data/runs.json` | Task/run catalog used to generate the index. |
| `data/evidence.json` | Source archive names, SHA-256 hashes, and exact release-asset URLs when available. |
| `data/trace-validation.json` | Expected source-derived counts, submitted hashes, and evaluation revisions. |
| `tools/` | Deterministic site generation, validation, and evidence retrieval. |
| `tools/trace/` | Campaign importer, shared rendering helpers, and fixture adapters. |
| `docs/` | Development, trace fidelity, publication, and task handoff. |
| `tests/` | Focused tooling checks. |

## Work on another task or model

Use [the task prompt](docs/SOL_TASK_PROMPT.md) with the requested evidence and output target. Consult [the trace guide](docs/TRACE_GUIDE.md) for presentation and fidelity rules and [Development](docs/DEVELOPMENT.md) for repository commands.

For other website changes, use [the website task prompt](docs/WEB_TASK_PROMPT.md).

The campaign importer in `tools/trace/import_results.py` handles the captured Codex and Claude formats, including file-change events. The supplied fixture builders also demonstrate these formats. Task prefixes, architecture summaries and metric definitions still require adaptation for a new benchmark. Do not treat example counts or OTA limits as universal.

## Evidence and publication

The result index covers 54 selected trials across nine SKY130 tasks and six models. Original archives are public Release assets; `tools/fetch_evidence.py` checks SHA-256 before installing a download. [Analysis](docs/ANALYSIS.md) explains the records and standalone reader. Exact task definitions are indexed in [data/tasks/index.json](data/tasks/index.json).

GitHub Pages deployment is prepared but manual. Follow [Publication](docs/PUBLISHING.md) when ready. Changes to `main` and `refactor/**` branches run a build and validation; they do not publish the website automatically.

Generated HTML is not committed. The Pages workflow builds it before uploading `site/`; shared CSS and JavaScript are reused across all trace pages. Full trace text and submitted SPICE remain readable without JavaScript.

The initial source and reconstruction checks are recorded in [Reference checks](docs/REFERENCE_CHECKS.md).
