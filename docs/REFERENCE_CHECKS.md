# Reference checks

Snapshot: 2026-10-04.

The initial four pages came from the accepted standalone fixtures. The shared-site refactor extracted canonical summary/trace fragments, moved each complete inert evaluation report to a linked JSON file, and replaced duplicated presentation with shared templates/assets. Recorded payloads and rendered trace content were not rewritten.

| Check | Recorded result |
| :--- | :--- |
| All four summary/trace fragments | Byte-for-byte equal to original markup after removing only the inert evaluation JSON script, whose complete payload moved to a separate file. |
| Evaluation source | All four JSON strings equal the original embedded strings, with one file-ending newline added. Each retains 432 Published and 225 Hidden rows, group/completeness records, revision and timing. |
| Submitted SPICE | Decoded bytes equal the original archives' `submitted.spice`; lengths and hashes remain unchanged. |
| Astra adapter | Reimport from the original archive passed full source checks and retained accepted fragment/report hashes. |
| Sonnet adapter | Reimport passed source checks, including 456 Read-prefix removals, and retained accepted fragment/report hashes. |
| Opus and Sol | Source-verified prepared fragments retained; no exact-fixture archive adapter is included initially. |
| Generated site | Five pages passed deterministic-output, links/DOM, source hash, circuit, and evaluation checks. |
| Python tooling | Eleven tests passed, including export dependencies, stale-output detection, and rejection of a changed command after rebuilding. |
| Tab behavior | Six Node event tests passed for initialization, click, arrows, Home/End, native Tab behavior, and a page without tabs. |
| Browser screenshots | Not performed; browser layout and visual rendering were not verified in this environment. |

The two former trace CSS variants differed only by structured-input and MODEL-table additions. The shared stylesheet preserves accepted rules and includes those additions for every trace. The shared tab script initializes a single keyboard tab stop without changing visible styling.

The four initial HTML documents totalled 2,283,250 bytes. Generated trace HTML now totals 1,265,313 bytes. Complete reports remain available as separate JSON; this reduces initial HTML size and does not discard evidence or reduce total site size by the same amount.

Archive identities/hashes are in `data/evidence.json`. Original standalone HTML hashes, source-derived expectations, and accepted fragment/report hashes are in `data/trace-validation.json`. Original archives will be supplied through Release assets.

Future changes should record actual checks and distinguish static/event checks from archive comparison and browser inspection.
