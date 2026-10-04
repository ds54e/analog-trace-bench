# Development

## Layout and commands

`site/` is a static website and the deployment boundary. Files under `docs/`, `data/`, `tools/`, and `tests/` support development and are not uploaded to Pages.

Run commands from the repository root:

```sh
python3 tools/build_index.py
python3 tools/check_site.py
python3 -m unittest discover -s tests -v
python3 -m http.server 8000 --directory site
```

The index is generated from `site/data/runs.json` and the evidence-URL mapping in `data/evidence.json`. Edit those inputs or `tools/build_index.py`, then regenerate. `check_site.py` detects a stale index, broken local links/fragments, inconsistent run metadata, and trace payload/hash/count regressions.

Static development uses Python 3.10+ and the standard library. For trace regeneration, install Node 20+ and the pinned Markdown dependency:

```sh
npm install --ignore-scripts
```

The existing Codex runtime can instead supply its Node and module paths through `CODEX_PRIMARY_RUNTIME_NODE` and `CODEX_PRIMARY_RUNTIME_NODE_MODULES`. The reference implementation was checked with Python 3.12.14, Node v24.19.0, and marked 17.0.5.

## Add a run

1. Inventory the source archive and determine its task/model/run, schema, submission and final evaluation.
2. Generate `site/traces/<task>-<model>-raw.html` using an adapted parser and the approved presentation from `docs/TRACE_GUIDE.md`.
3. Add the run to `site/data/runs.json`; add its archive filename/hash to `data/evidence.json`. Use `url: null` until an actual Release asset exists.
4. Add a source-derived record to `data/trace-validation.json`: MODEL/ACTION/displayed-RESULT counts, final-SPICE byte count/hash, submitted revision, evaluation category count, and row counts by stage. Do not obtain these expectations merely by copying an unverified generated page.
5. Verify source strings and original circuit bytes through the generation adapter. Regenerate the index and run the site checks. Inspect affected browser behavior when available.
6. Commit the requested files to `main`. Keep raw evidence, local downloads, temporary outputs and personal environment state out of Git.

Existing trace source data is intentionally embedded in the HTML. A cosmetic edit must preserve decoded MODEL, ACTION, RESULT, final-SPICE and evaluation payloads. Keep the final-SPICE and evaluation sections after the historical trace.

The trace-file Git attributes preserve original line endings and exclude saved payload whitespace from Git's whitespace checks. Do not trim or normalize recorded content.

## Existing example adapters

```sh
python3 tools/fetch_evidence.py --list
python3 tools/fetch_evidence.py ota-wide-sky130-astra-r1
python3 tools/trace/build_astra_page.py evidence/ota-wide-sky130-astra-r1-20261003-model-time-recovery3.tar.xz
python3 tools/trace/build_sonnet_example.py evidence/ota-wide-sky130-sonnet-r1-20261003-model-time-full9.tar.xz
```

Fetching requires the matching entry's actual asset URL. These are example-specific adapters, not a universal importer; inspect their assumptions before reuse. Opus and Sol pages are preserved as accepted reference snapshots, with no regeneration adapter for those exact fixtures in this initial repository.

For a larger adapter change, keep a short progress note with the current schema assumptions and remaining acceptance checks. A new session can resume from repository state and that note; it should not depend on the previous conversation.

## Verification scope

The continuous check is offline and does not download evidence or run circuit simulation. Source fidelity is checked while importing/regenerating from an available archive. The offline check verifies committed page invariants against the source-derived records.

A new parser warrants focused fixture tests and byte/string comparisons. A small label or spacing change warrants an affected-output diff. Broaden tests only when a failure, new behavior, or unresolved concern justifies it.

The workflow layout follows OpenAI's [progressive-disclosure guidance](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra) and [GPT-6 prompting/verification guidance](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-6.1-sol), checked on 2026-10-04: a short repository router, relevant task references, explicit completion criteria, and proportionate verification.
