# Initial reference checks

Snapshot: 2026-10-04.

The four committed trace pages come from the accepted standalone pages. The brand link was changed from a same-page fragment to `../index.html` for website navigation. Recorded trace, submitted circuit and evaluation payloads are preserved.

| Check | Recorded result |
| :--- | :--- |
| Submitted SPICE in all four pages | Byte-for-byte equal to the original evidence archive's `submitted.spice`. |
| Final evaluations | 432 Published and 225 Hidden rows per fixture, tied to the submitted revision. |
| Astra shared builder | The repository adapter's source and payload checks passed; regenerated output matched the committed page byte for byte. |
| Sonnet example adapter | The repository adapter's source and payload checks passed; regenerated output matched the committed page byte for byte. |
| Opus and Sol | Accepted HTML snapshots and archive SPICE comparisons retained; no exact-fixture regeneration adapter is included initially. |
| Browser screenshots | Not performed in the preparation environment; Chromium was unavailable. |

Source archive identities and hashes are recorded in `data/evidence.json`. Expected page counts, submitted hashes and revisions are recorded in `data/trace-validation.json`. The original archives are supplied through Release assets later.

For future changes, record the checks actually performed and distinguish offline page checks from source-archive comparison and browser inspection. Passing `check_site.py` alone does not establish fidelity to an archive that has never been inspected.
