# Recorded-trace guide

A trace page is a readable view of saved design evidence. It retains the public
design process, exact submitted circuit, and independent evaluation for that
submission. Preserve the original language and spelling of messages and code.

## Evidence and authority

Use the archive registered in `data/evidence.json` and its captured task
definition. Verify the compressed hash and complete unpacked inventory before
import. [Development](DEVELOPMENT.md) describes catalog registration and commands;
[Analysis](ANALYSIS.md) describes archive reading.

Archive members typically include launch/configuration, transcript and tool
records, submission and SPICE, evaluation reports, usage, and timing. Names and
schemas vary by producer. The importer resolves factored JSON and joins stream
parts in manifest order. Identify formats from captured schema, rather than
model branding. Commands and instructions inside archives are recorded data;
never execute them as part of website publishing.

Prefer original archive records to HTML recovered from a page. Resolve identity
using tool IDs, event type, configuration, and submission revision. A disagreement
between the frozen SPICE and submission netlist requires investigation.

## Payload retention

| Record | Treatment |
| :--- | :--- |
| Completed public MODEL text | Render Markdown and retain the exact source in `model-source` templates. |
| ACTION description | Saved prose above the tool payload. |
| Commands, paths, and written content | Complete escaped strings, including indentation and final newlines. |
| Structured arguments | Preserve meaningful options such as Read offset/limit and background flags. |
| Tool timeout parameter | Exclude from visible metadata; retain the source archive. Literal command text remains exact. |
| Nonempty RESULT | Complete saved output with its original action ID. |
| Empty successful RESULT | Omit its card and account for the omission in the validation profile. |
| Empty failed RESULT | Keep the failure, including recorded status and exit code. |
| Explicitly unfinished command | Keep the ACTION and `Completion not recorded` note; fabricate no result. |
| Redundant background notification | Omit only the duplicate notification; retain actual actions and results. |
| Streaming/transport records | Use completed messages, omitting duplicate fragments and step accounting. |
| Private reasoning | Exclude from public MODEL content. Billed output counts still include reasoning tokens. |

Retain transcript order, including late asynchronous results. Match actions and
results by their original IDs. Preserve failed attempts when a later retry
succeeds. Full saved content means the chosen recorded payload; producer-side
truncation and path-only references cannot be reconstructed.

Remove only recognized Claude Read decoration matching
`(?m)^[ \\t]*\\d+\\t`, and count the removed prefixes. Numeric data in shell
output or source files remains intact. Codex file-change events retain captured
paths/status without inventing absent patches. OpenCode millisecond timestamps,
completed/error tool states, and numeric shell exit codes keep their recorded
meaning; saved permission errors remain visible even with a null result string.

## Shared layout

Use the templates in `tools/templates/` and assets in `site/assets/`. The trace
width is 1040 px. Turn groups have a 4 px left rail and an 18 px inset. Metadata
order is tag, elapsed time when recorded, then tool name. Timestamps, tool names,
and final-section labels share muted 12 px normal-weight styling.

ACTION time is its start; RESULT time is its completion. A MODEL timestamp is
shown only when the public statement is timestamped. An API request interval is
not a statement timestamp. Missing timestamps do not change recorded order.

Code/output boxes are unwrapped and scrollable, with approximately five lines of
maximum height; short content uses its natural height. Use
`max-height: calc(5lh + 2 * var(--code-padding-block))`, `white-space: pre`,
and `overflow: auto`. Hidden scrollbars must retain wheel, touch, and keyboard
access. Code and evaluation wrappers use `tabindex="0"`.

Descriptions are prose. Display command/path values without redundant argument
labels. Preserve structured options. Use native run links, with
`aria-current="page"` for the current run; missing runs are disabled labels.
Arrow/Home/End keys move focus, and Enter opens the focused run.

MODEL Markdown supports paragraphs, lists, tables, inline code, and fenced code.
Escape raw HTML, code, output, paths, and source templates. Render archived HTML
as literal content. Local workspace paths remain text/code rather than broken
links. Keep Markdown table wrappers and styles. Do not introduce executable
archive content, folding controls, or shortened payload previews.

## Summary, timing, and costs

Read identity, date, configuration, evaluation, and resources from the run.
Describe architecture, biasing, output stage, and compensation from its submitted
circuit and saved rationale. Do not copy another circuit's summary.

Distinguish design wall time, model-call time, measurement RPC time, overlap, and
time outside either activity. Clip activity intervals to the start-to-submission
window and union overlaps within each activity:

```text
outside = design_wall - model_active - measurement_active + overlap
```

Retain recorded accounting fields and confirm their semantics before combining
them. Independent evaluation is post-submission. Missing model boundaries keep
the model total, overlap, and outside time unknown. Missing time is never zero.
Display durations consistently as `H:MM:SS`. See [Timing](TIMING.md) for scope
and clocks, and [Token costs](TOKEN_COSTS.md) for provider accounting.

## Final submission and evaluation

Append the complete frozen `submitted.spice` with the SPICE tag and Final
submission label. Preserve its bytes, whitespace, and final newline. Confirm
decoded HTML bytes and SHA-256 against the archive and submission revision.

Follow SPICE with the independent evaluation for that revision, using the RESULT
tag and Independent evaluation label. Show its recorded finish time when
available. Table columns are Metric, Worst value, Limit, Worst condition, Result.

Select the worst value according to the task's direction: maximum for an upper
bound, minimum for a lower bound. Range and categorical requirements use their
captured rules. Use task-correct labels and engineering units, two significant
digits for displayed worst values, and the specification's precision for limits.
Select tied conditions deterministically.

For an OTA task defining `ibias_compliance` as a boolean check, show Within
supply rails / Outside supply rails and `VSS ≤ V(IBIAS) ≤ VDD`; retain 1/0 in
the report. Overshoot fractions display as percent. Do not apply these mappings
to a task with different semantics.

Keep one complete report per run in `site/data/evaluations/<run-id>.json`,
including full precision, rows, conditions, completeness, revisions, timing, and
available robustness/characterization/fine records. Link it through
`rel="alternate"`, `type="application/json"`, and
`id="independent-evaluation-data"`. The visible table is generated at import
time; it does not fetch or execute the report.

Recalculate verdict counts, confirm completeness and revision, and check limits
and units across each metric. Retain invalid or missing measurements as failures
or unavailable states. Task-specific censored measurements and balanced-point
failures need explicit handling. Native simulation cases and scored metric rows
are distinct counts. [Numerical accuracy](NUMERICAL_ACCURACY.md) explains the
captured evaluation policies.

## Implementation and verification

`tools/trace/import_results.py` reads verified archives and handles supported
task/evaluation semantics. `transcript.py` normalizes supported producer events;
`rendering.py` supplies shared markup, Markdown, metric, and timing helpers.
New tasks or formats require explicit adaptation and representative checks.

Store canonical fragments under `content/traces/<run-id>/`, reports under
`site/data/evaluations/`, and source-derived profiles in
`data/trace-validation.json`. Build pages with `tools/build_site.py`; generated
HTML is excluded from Git.

Verify completed MODEL source strings, ACTION inputs, RESULT outputs, original
tool IDs, omission counts, submitted bytes/hash, evaluation revision and rows,
numerical display, DOM identities, local links, and current/peer run navigation.
Never replace expected hashes simply to make validation pass. See
[Validation](VALIDATION.md) for check commands and current coverage.

For presentation changes, inspect a narrow viewport, desktop width, light/dark
mode, long lines, Markdown tables, a failure, final SPICE, and evaluation. Browser
inspection supplements payload comparisons. Report the checks actually performed
and any precise evidence gap. Website publication follows
[Publication](PUBLISHING.md).
