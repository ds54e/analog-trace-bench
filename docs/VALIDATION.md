# Recorded-result validation

The catalog contains 219 traces across nine SKY130 tasks and nine models.
Eight models have three runs for every task. Fable 5.1 has one run each for
LDO-LOW-VOLTAGE, LDO-QUIET, and OTA-WIDE. The build produces 221 HTML pages;
each index has 75 task/model rows.

Original electrical verdicts are 175 PASS, 38 MISS, five MEASUREMENT_FAILURE,
and one MEASUREMENT_INVALID. Website badges map those verdicts to PASS / FAIL;
the evidence retains the original classifications.

## Authoritative records

| Record | What it verifies |
| :--- | :--- |
| `data/evidence.json` | Attempt identity, archive URL/hash, configuration, task, verdict, and timing. |
| `data/tasks/` | Captured task files, inventories, and definition hashes. |
| `data/trace-validation.json` | Fragment/report hashes, event counts, omissions, submitted-SPICE bytes/hash, and evaluation revisions. |
| `site/data/evaluations/` | Full-precision rows, conditions, limits, completeness, and available robustness records. |
| `site/data/token-costs.json` | Source usage identities, reconciliation, and cost arithmetic. |
| `data/campaigns/` | Source campaign summaries, selection records, and superseded-attempt provenance. |

Campaign records describe the evidence selection. Current website coverage is
defined by the evidence and run catalogs, rather than by any individual batch.

## Offline checks

```sh
python3 tools/build_site.py
python3 tools/check_site.py
python3 -m unittest discover -s tests -v
node --test tests/run-navigation.test.cjs
```

The site check covers deterministic output, relative links, unique DOM IDs,
current/peer run identities, fragment/report hashes, event counts, final-SPICE
bytes, evaluation revisions and verdict counts, task inventories, and deployment
contents. Focused tests cover tooling failures and supported transcript semantics.
These checks require no network access or simulator.

## Source checks

With the original archives available under ignored `evidence/`:

```sh
python3 tools/trace/import_results.py --all --verify-only
python3 tools/import_token_costs.py --check
```

Source checks compare the verified archive inventory, completed public messages,
tool inputs/results, submitted circuit, reports, and usage records. Per-run
profiles account for omitted transport records, empty successes, redundant
notifications, and recognized Read decoration. Recorded failures remain visible.

Inspect affected pages in a browser for responsive layout, scrolling, color
modes, and navigation. Report checks actually performed; an offline integrity
pass does not imply a browser inspection or a fresh electrical evaluation.
