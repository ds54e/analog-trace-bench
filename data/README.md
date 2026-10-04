# Result evidence

[evidence.json](evidence.json) is the complete selected-trial catalog. It binds
each result to its public Release archive, SHA-256, model configuration, source
revision, independent verdict, timing, and [captured task definition](tasks/index.json).

Download and read original records using Python's standard library and the tools
in this public repository. See [Analysis](../docs/ANALYSIS.md) for exact commands,
schema-4 references, stream ordering, missing values and time interpretation.
Large original archives stay in Release assets and local ignored `evidence/`.
The website build uses committed sources and never needs the private repository.

Additional maintained records:

- `trace-summaries.json`: reviewed descriptions of the frozen submitted circuits.
- `trace-validation.json`: accepted content/report hashes and source coverage.
- `token-pricing.json`: dated rates used by `site/data/token-costs.json`; see
  [token accounting](../docs/TOKEN_COSTS.md).
- `campaigns/deepseek-20261004.json`: original public DeepSeek release summary.
  Its archive identities and aggregate outcomes were compared with all nine
  verified archives before catalog installation.

`evidence.json` retains the original six-model `campaign_id` and lists both
campaigns in `campaign_ids`; DeepSeek entries identify their additional batch.
Their `source_sha` is explicitly identified as the captured task-manifest base
revision, with actual execution implementation hashes retained in the archive.
