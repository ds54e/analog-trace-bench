# Analog Trace Bench

Recorded AI analog-circuit design trials: design decisions, tool actions,
submitted SPICE, and independent electrical evaluation.

Browse results by [Model](https://ds54e.github.io/analog-trace-bench/) or
[Task](https://ds54e.github.io/analog-trace-bench/tasks.html). The catalog contains
219 trials across nine SKY130 OTA and LDO tasks and nine models. Eight models
have three runs per task; Fable 5.1 has one run each for LDO-LOW-VOLTAGE, LDO-QUIET,
and OTA-WIDE. Failed trials are included.

Each trace shows the saved public messages, commands, and results, followed by
the exact submitted circuit and its evaluation. Original evidence is available
as SHA-256-verified [Release assets](https://github.com/ds54e/analog-trace-bench/releases).
The [task index](data/tasks/index.json) links the captured task definitions.

This repository contains the public evidence catalog, website sources, and
analysis tools. Browsing and building recorded results require no PDK, simulator,
or provider credentials.

## Build and preview

Python 3.10+ is sufficient to build and validate saved pages:

```sh
python3 tools/build_site.py
python3 tools/check_site.py
python3 -m http.server 8000 --directory site
```

Open `http://localhost:8000/`. See [Development](docs/DEVELOPMENT.md) for tests,
Windows commands, and importing new traces.

## Repository layout

| Path | Contents |
| :--- | :--- |
| `content/traces/` | Canonical summary and trace fragments for each run. |
| `site/assets/` | Shared styles and run navigation. |
| `site/data/` | Run catalog, token costs, and full-precision evaluation reports. |
| `data/` | Evidence identities, captured task definitions, validation profiles, and pricing snapshots. |
| `tools/` | Site generation, validation, evidence reading, and trace import. |
| `tests/` | Tooling and run-navigation tests. |

Generated HTML is excluded from Git. Only `site/` is deployed to GitHub Pages;
original archives remain in Release assets and ignored local `evidence/`.
Website deployment uses a separate manual workflow.

## Documentation

| Guide | Purpose |
| :--- | :--- |
| [Analysis](docs/ANALYSIS.md) | Download and read evidence; interpret the recorded results. |
| [Development](docs/DEVELOPMENT.md) | Build, test, preview, and maintain the website. |
| [Trace guide](docs/TRACE_GUIDE.md) | Import workflow, payload fidelity, and presentation rules. |
| [Validation](docs/VALIDATION.md) | Current coverage and integrity checks. |
| [Token costs](docs/TOKEN_COSTS.md) | Usage accounting and dated comparison rates. |
| [Timing](docs/TIMING.md) | Model, measurement, and host-resource clocks. |
| [Numerical accuracy](docs/NUMERICAL_ACCURACY.md) | Captured evaluation grids and numerical interpretation. |
| [Publication](docs/PUBLISHING.md) | Evidence assets and manual Pages deployment. |
