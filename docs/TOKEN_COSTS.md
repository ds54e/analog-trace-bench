# Token costs

`data/token-pricing.json` stores dated comparison rates and their source URLs.
`site/data/token-costs.json` retains normalized usage, source hashes, exact
calculated costs, reconciliation, and separately recorded provider amounts.
Website USD values are comparison estimates rather than invoice reconciliation.

## Usage accounting

| Captured provider | Visible items | Input accounting |
| :--- | :--- | :--- |
| Claude | Uncached input / Cached input / Cache write / Output | Input excludes cache reads/writes. |
| OpenAI/Codex | Uncached input / Cached input / Output | Subtract cached tokens from inclusive input. |
| DeepSeek/OpenCode direct API | Uncached input / Cached input / Output | Subtract cache-hit tokens from inclusive prompt tokens. |

Reasoning is included in output and is never charged again. Missing fields remain
null. Providers without a captured cache-write charge receive no fabricated row.
Claude's recorded cache duration selects its write rate; mixed durations use a
weighted unit rate.

Cost sums `Tokens × USD / 1M` across billable items. The UI shows Type / Tokens /
Cost, unit rates, and a plain total. Index USD values average available run costs
before rounding; incomplete values remain unknown.

CLI turn or run totals do not reveal individual request context lengths or
billing tiers. Do not infer a long-context multiplier from cumulative run input.
Captured rates are snapshots for recorded trials, not live prices.

## Rate selection and reconciliation

Use the provider, model, cache duration, and captured request schedule to select
the applicable snapshot. DeepSeek's recorded requests use the off-peak comparison
rates registered in the pricing data. Review the applicable schedule for new
runs rather than copying that selection.

Claude CLI producers reconcile unique provider-message usage with captured
segment totals. A restarted session can have several segments; its last segment
alone is not a whole-run total. Preserve distinct CLI cost observations and do
not invent a provider total. Other unexplained conflicts are rejected.

DeepSeek direct API usage is reconciled from raw request usage, cache hit/miss
counts, and normalized aggregates. OpenAI usage retains inclusive input and its
cached subset. Provider-reported amounts remain separate from comparison
estimates.

## Import and verify

```sh
python3 tools/import_token_costs.py
python3 tools/import_token_costs.py --check
```

The importer checks archive/package/index/shared-record hashes and trial
identities before expanding usage. Offline generation verifies decimal
arithmetic and source identities. A pricing change requires rerunning the cost
importer with source evidence; it does not replace recorded provider amounts.
See [Validation](VALIDATION.md) for the wider integrity checks.
