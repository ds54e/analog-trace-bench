# Result evidence

| Record | Contents |
| :--- | :--- |
| [evidence.json](evidence.json) | Selected trials, immutable Release URLs, archive hashes, configurations, source identities, verdicts, and timing. |
| [tasks/index.json](tasks/index.json) | Captured task definitions and their inventories. |
| `trace-summaries.json` | Reviewed descriptions of frozen submitted circuits. |
| `trace-validation.json` | Content/report hashes, source coverage, revisions, and omission accounting. |
| `token-pricing.json` | Dated comparison rates used by the cost importer. |
| `campaigns/` | Original campaign summaries, attempt selections, and superseded-attempt records. |

Public trace IDs identify the selected runs. Evidence entries retain the full
attempt identity, captured configuration, campaign identity, and original run
slot. A campaign summary can include attempts outside the current public
selection; use `evidence.json` and `site/data/runs.json` for current coverage.

Original archives stay in Release assets and ignored local `evidence/`. Download,
verify, and read them with the tools in this repository; see
[Analysis](../docs/ANALYSIS.md). The website builds from committed fragments and
reports. [Validation](../docs/VALIDATION.md) describes integrity checks;
[Token costs](../docs/TOKEN_COSTS.md) explains usage accounting.
