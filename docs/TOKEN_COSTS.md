# Token costs

`data/token-pricing.json` stores dated official rates. The importer's
`site/data/token-costs.json` records normalized counts, source hashes, exact
calculated costs and any separately recorded provider total. These are comparison
estimates rather than invoice reconciliation.

| Captured provider | Visible items | Input accounting |
| :--- | :--- | :--- |
| Claude | Uncached input / Cached input / Cache write / Output | Input already excludes cache reads/writes. |
| OpenAI/Codex | Uncached input / Cached input / Output | Subtract cached tokens from inclusive input. |
| DeepSeek/OpenCode direct API | Uncached input / Cached input / Output | Subtract cache-hit tokens from inclusive prompt tokens. |

Reasoning is included in output and never charged again. Missing fields remain
null. OpenAI has no separately captured cache-write charge; DeepSeek also has no
cache-write line in its rate schedule. Neither gets a fabricated zero-cost row.
Claude's recorded cache-write duration selects its rate; the UI says only
`Cache write`. A mixed-duration row uses the weighted unit rate.

Total token cost sums `Tokens × USD / 1M` for each visible billable item. The
UI displays Type / Tokens / Cost, unit prices such as `$10.00 / 1M`, and a plain
`$2.01` total without bold or an approximation symbol. Index USD values average
recorded run costs before rounding.

OpenAI CLI-turn totals do not expose request context lengths or effective
billing tiers; cumulative run input must not trigger a long-context multiplier.
The existing six-model rate snapshot was checked on 2026-10-04. DeepSeek's
additional snapshot was checked on 2026-10-05 against its
[official pricing](https://api-docs.deepseek.com/quick_start/pricing/), confirmed
again on 2026-10-08. Original DeepSeek requests occurred on Sunday
2026-10-04 UTC. All 932 imported repeat requests started between 14:58 and 21:30 UTC on
2026-10-05, outside the documented 01:00–04:00 and 06:00–10:00 weekday peak
windows. Both batches use the off-peak comparison rates:
uncached input $0.15, cached input $0.003 and output $0.60 per million tokens.
Review the applicable schedule when importing future DeepSeek runs.

```sh
python3 tools/import_token_costs.py
python3 tools/import_token_costs.py --check
```

The importer checks archive/package/index/shared-record hashes and trial
identity before expanding usage. CLI producers supply final-total reconciliation;
DeepSeek direct API records are reconciled from raw request usage, cache hit/miss
counts and normalized aggregates. The offline build rechecks decimal arithmetic
and source identities. Changing prices requires rerunning the cost importer;
existing provider-reported amounts remain separately available in JSON.
