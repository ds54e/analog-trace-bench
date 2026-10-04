#!/usr/bin/env python3
"""Generate the standalone Astra trace page without an existing Opus HTML.

Usage: python3 build_astra_page.py [evidence.tar.xz] [--output page.html]
Requires Python 3.10+, Node.js and marked (or the Codex runtime).
"""
from __future__ import annotations

import argparse
from dataclasses import dataclass
import datetime as dt
import gzip
import html
import json
import os
from pathlib import Path
import re
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parents[1]
DEFAULT_SOURCE = REPO_ROOT / 'evidence/ota-wide-sky130-astra-r1-20261003-model-time-recovery3.tar.xz'
DEFAULT_OUTPUT = REPO_ROOT / 'site/traces/ota-wide-sky130-astra-raw.html'
EVIDENCE_PREFIX = 'analysis/astra-01/evidence/'
ENTRY_CLASSES = {'MODEL': 'trace-ai', 'ACTION': 'trace-tool', 'RESULT': 'trace-result'}
MODEL_TIME_NOTE = 'Statement timestamp is not recorded; original transcript order is preserved'


@dataclass(frozen=True)
class Evidence:
    tools: list[dict]
    configuration: dict
    submission: dict
    submitted_spice: str
    timing: dict
    submission_timing: dict
    model_timing: dict
    published: dict
    hidden: dict
    transcript: list[dict]
    events: list[dict]


@dataclass(frozen=True)
class RunTiming:
    start: dt.datetime
    wall_s: float
    model_s: float
    measurement_s: float
    overlap_s: float
    outside_s: float


@dataclass(frozen=True)
class Trace:
    markup: str
    models: list[str]
    commands: list[str]
    results: list[str]
    recorded_results: int
    displayed_results: int
    groups: int


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def escape(value: object) -> str:
    return html.escape(str(value), quote=True)


def load_evidence(source: Path) -> Evidence:
    """Read saved evidence without extracting or executing archive content."""
    with tarfile.open(source) as archive:
        def read_bytes(name: str) -> bytes:
            with archive.extractfile(EVIDENCE_PREFIX + name) as stream:
                return stream.read()

        def read_json(name: str) -> dict | list:
            return json.loads(read_bytes(name))

        transcript, events = [], []
        for member in sorted(archive.getmembers(), key=lambda item: item.name):
            if not member.isfile():
                continue
            target = None
            if member.name.startswith(EVIDENCE_PREFIX + 'transcript/'):
                target = transcript
            elif member.name.startswith(EVIDENCE_PREFIX + 'events/'):
                target = events
            if target is not None:
                with archive.extractfile(member) as stream:
                    target.extend(json.loads(line) for line in stream if line.strip())

        return Evidence(
            tools=read_json('tools.json'),
            configuration=read_json('launch.json')['configuration'],
            submission=read_json('submission.json'),
            submitted_spice=read_bytes('submitted.spice').decode('utf-8'),
            timing=read_json('measurement-timing.json'),
            submission_timing=read_json('submission-timing.json'),
            model_timing=read_json('model-call-timing.json'),
            published=read_json('published.json'),
            hidden=read_json('hidden.json'),
            transcript=transcript,
            events=events,
        )


def merge_intervals(intervals: list[tuple[float, float]], lower: float, upper: float) -> list:
    """Clip activity to the submission window, then union overlapping intervals."""
    merged = []
    for start, end in sorted(intervals):
        start, end = max(start, lower), min(end, upper)
        if end <= start:
            continue
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(end, merged[-1][1])
        else:
            merged.append([start, end])
    return merged


def calculate_timing(evidence: Evidence) -> RunTiming:
    start = dt.datetime.fromisoformat(evidence.timing['started_at'])
    finish = dt.datetime.fromisoformat(evidence.timing['submitted_at'])
    lower, upper = start.timestamp(), finish.timestamp()
    model_intervals = merge_intervals(
        [(row['start_utc_ns'] / 1e9, row['end_utc_ns'] / 1e9)
         for row in evidence.model_timing['requests'] if not row.get('startup_prewarm')],
        lower, upper,
    )
    tool_names = {row['tool_call_id']: row.get('tool_name') for row in evidence.events
                  if row['event'] == 'broker_tool_started'}
    measurement_intervals = merge_intervals(
        [(dt.datetime.fromisoformat(row['start']).timestamp(),
          dt.datetime.fromisoformat(row['end']).timestamp())
         for row in evidence.events if row['event'] == 'broker_tool_finished'
         and tool_names[row['tool_call_id']] == 'measure'],
        lower, upper,
    )
    overlap = sum(max(0, min(end_a, end_b) - max(start_a, start_b))
                  for start_a, end_a in model_intervals
                  for start_b, end_b in measurement_intervals)
    model_s = evidence.submission_timing['model_time_final']['design_model_calls_s']
    measurement_s = evidence.timing['measurement_rpc_active_s']
    wall_s = evidence.timing['design_wall_s']
    outside_s = wall_s - model_s - measurement_s + overlap
    require(outside_s >= 0, 'Timing intervals exceed the recorded submission window')
    return RunTiming(start, wall_s, model_s, measurement_s, overlap, outside_s)


def clock(seconds: float) -> str:
    seconds = int(round(seconds))
    return f'{seconds // 3600}:{seconds // 60 % 60:02d}:{seconds % 60:02d}'


def time_tag(timestamp: str, run_start: dt.datetime) -> str:
    elapsed = (dt.datetime.fromisoformat(timestamp) - run_start).total_seconds()
    return f'<div class="trace-time" title="{escape(timestamp)}">{clock(elapsed)}</div>'


def codebox(text: str, field: str) -> str:
    return f'<pre data-field="{escape(field)}" tabindex="0"><code>{escape(text)}</code></pre>'


def render_article(kind: str, item_id: str, body: str, run_start: dt.datetime,
                   timestamp: str | None = None, tool_name: str = '') -> str:
    stamp = time_tag(timestamp, run_start) if timestamp else ''
    title = f' title="{MODEL_TIME_NOTE}"' if kind == 'MODEL' and timestamp is None else ''
    return (
        f'<article class="trace-entry {ENTRY_CLASSES[kind]}" data-kind="{kind}" data-tool-id="{escape(item_id)}">'
        f'<div class="trace-meta"{title}>'
        f'<span class="trace-tag trace-tag--{kind.lower()}">{kind}</span>{stamp}'
        f'<span class="trace-tool-name">{escape(tool_name)}</span></div>'
        f'<div class="trace-content">{body}</div></article>'
    )


def render_model_markdown(models: list[dict]) -> dict[str, str]:
    """Render Markdown while retaining each original string in the final HTML."""
    node = os.environ.get('CODEX_PRIMARY_RUNTIME_NODE', 'node')
    modules = os.environ.get('CODEX_PRIMARY_RUNTIME_NODE_MODULES')
    marked_path = str(Path(modules) / 'marked/lib/marked.esm.js') if modules else 'marked'
    process = subprocess.run(
        [node, '--input-type=module', '-e', MARKDOWN_RENDERER],
        input=json.dumps([model['text'] for model in models]),
        text=True, capture_output=True, check=True,
        env={**os.environ, 'ATB_MARKED_PATH': marked_path},
    )
    rendered = json.loads(process.stdout)
    require(len(rendered) == len(models), 'Markdown renderer returned an incomplete result')
    return {model['id']: markup for model, markup in zip(models, rendered)}


def render_submission(spice: str) -> str:
    return (
        '<div class="turn-group" data-submission="final">'
        '<article class="trace-entry trace-submission" data-kind="SUBMISSION" aria-label="Final submitted SPICE">'
        '<div class="trace-meta"><span class="trace-tag">SPICE</span>'
        '<span class="trace-tool-name">Final submission</span></div>'
        '<div class="trace-content">' + codebox(spice, 'submitted-spice') +
        '</div></article></div>'
    )


METRIC_LABELS = {
    'tracking_error_v': 'DC tracking error',
    'power_w': 'Power',
    'input_current_abs_a': 'Input current',
    'ibias_compliance': 'IBIAS compliance',
    'gain_db': 'Loop gain',
    'unity_gain_hz': 'Unity-gain frequency',
    'large_up_settling_time_s': 'Large step · up · settling',
    'large_down_settling_time_s': 'Large step · down · settling',
    'large_up_slew_v_per_s': 'Large step · up · slew rate',
    'large_down_slew_v_per_s': 'Large step · down · slew rate',
    'input_noise_rms_v': 'Input noise',
    'psrr_1000_db': 'PSRR · 1 kHz',
    'psrr_1000000_db': 'PSRR · 1 MHz',
    'cmrr_db': 'CMRR',
}


def metric_label(metric: str) -> str:
    if metric in METRIC_LABELS:
        return METRIC_LABELS[metric]
    match = re.fullmatch(r'small_(?:(low|high)_)?(up|down)_(settling_time_s|overshoot_ratio)', metric)
    require(match is not None, f'Unknown evaluation metric: {metric}')
    position, direction, quantity = match.groups()
    parts = ['Small step'] + ([position] if position else []) + [direction]
    parts.append('settling' if quantity == 'settling_time_s' else 'overshoot')
    return ' · '.join(parts)


def metric_value(metric: str, value: float, unit: str, *, significant_digits: int = 6) -> str:
    if metric == 'tracking_error_v':
        factor, display_unit = 1e3, 'mV'
    elif metric == 'power_w':
        factor, display_unit = 1e3, 'mW'
    elif metric == 'input_current_abs_a':
        factor, display_unit = 1e6, 'µA'
    elif metric == 'input_noise_rms_v':
        factor, display_unit = 1e6, 'µV RMS'
    elif metric == 'unity_gain_hz':
        factor, display_unit = 1e-6, 'MHz'
    elif metric.endswith('_settling_time_s'):
        factor, display_unit = 1e9, 'ns'
    elif metric.endswith('_slew_v_per_s'):
        factor, display_unit = 1e-6, 'V/µs'
    elif metric.endswith('_overshoot_ratio'):
        factor, display_unit = 100, '%'
    else:
        factor, display_unit = 1, unit
    number = f'{value * factor:.{significant_digits}g}'
    # Keep ordinary engineering values readable (180 ns rather than 1.8e+02 ns).
    if 'e' in number and 1e-3 <= abs(float(number)) < 1e6:
        number = f'{float(number):g}'
    return number + (f' {display_unit}' if display_unit else '')


def render_evaluation(evidence: Evidence, timing: RunTiming) -> str:
    """Show worst scored values and retain every independent evaluation row."""
    reports = [evidence.published, evidence.hidden]
    revision = evidence.submission['revision']
    by_metric = {}
    for report in reports:
        counts = {}
        for row in report['rows']:
            require(row['revision'] == revision, 'Evaluation revision differs from the submitted circuit')
            counts[row['verdict']] = counts.get(row['verdict'], 0) + 1
            by_metric.setdefault(row['metric'], []).append(row)
        require(counts == report['counts'], 'Evaluation counts differ from recorded rows')
        require(report['execution_complete'] and all(group['complete'] for group in report['groups']),
                'Independent evaluation is incomplete')
    independent = evidence.timing['independent_evaluation']
    rows = []
    for metric, measurements in by_metric.items():
        definitions = {(row['direction'], row['limit'], row['unit']) for row in measurements}
        require(len(definitions) == 1, f'Inconsistent evaluation limits for {metric}')
        direction, limit, unit = definitions.pop()
        require(direction in ('<=', '>='), f'Unsupported evaluation direction for {metric}')
        require(all(row['measured'] is not None and row['measurement_valid'] for row in measurements),
                f'Missing or invalid measurement for {metric}')
        worst = (max if direction == '<=' else min)(measurements, key=lambda row: row['measured'])
        verdicts = {row['verdict'] for row in measurements}
        verdict = 'PASS' if verdicts == {'PASS'} else ' / '.join(sorted(verdicts))
        condition = f'{worst["stage"].title()} · {worst["pvt"]} · {worst["cload_f"] * 1e12:g} pF'
        inequality = '≤' if direction == '<=' else '≥'
        if metric == 'ibias_compliance':
            measured_text = 'Within supply rails' if worst['measured'] == 1 else 'Outside supply rails'
            limit_text = 'VSS ≤ V(IBIAS) ≤ VDD'
        else:
            measured_text = metric_value(metric, worst['measured'], unit, significant_digits=2)
            limit_text = inequality + ' ' + metric_value(metric, limit, unit)
        cells = [measured_text, limit_text, condition, verdict]
        rows.append(f'<tr data-metric="{escape(metric)}"><th scope="row">{escape(metric_label(metric))}</th>' +
                    ''.join(f'<td>{escape(cell)}</td>' for cell in cells) + '</tr>')
    source = json.dumps({'published': evidence.published, 'hidden': evidence.hidden,
                         'independent_evaluation': independent},
                        ensure_ascii=False, separators=(',', ':'), allow_nan=False).replace('<', '\\u003c')
    return (
        '<div class="turn-group" data-evaluation="independent">'
        '<article class="trace-entry trace-evaluation" data-kind="EVALUATION" aria-label="Final independent evaluation">'
        '<div class="trace-meta"><span class="trace-tag trace-tag--result">RESULT</span>' +
        time_tag(independent['finished_at'], timing.start) +
        '<span class="trace-tool-name">Independent evaluation</span></div>'
        '<div class="trace-content"><div class="evaluation-table-wrap" tabindex="0" aria-label="Independent evaluation metrics">'
        '<table class="summary-table evaluation-metrics">'
        '<thead><tr><th scope="col">Metric</th><th scope="col">Worst value</th>'
        '<th scope="col">Limit</th><th scope="col">Worst condition</th><th scope="col">Result</th></tr></thead>'
        '<tbody>' + '\n'.join(rows) + '</tbody></table></div>'
        '<script type="application/json" id="independent-evaluation-data">' + source + '</script>'
        '</div></article></div>'
    )


def render_trace(evidence: Evidence, timing: RunTiming) -> Trace:
    tool_map = {tool['tool_call_id']: tool for tool in evidence.tools}
    require(len(tool_map) == len(evidence.tools), 'Duplicate tool call IDs')
    models = [row['item'] for row in evidence.transcript
              if row.get('item', {}).get('type') == 'agent_message' and row['type'] == 'item.completed']
    rendered_models = render_model_markdown(models)
    groups, current = [], []
    model_sources, commands, results = [], [], []
    last_kind = None
    recorded_results = displayed_results = 0

    def append(kind: str, item_id: str, body: str,
               timestamp: str | None = None, tool_name: str = '') -> None:
        current.append(render_article(kind, item_id, body, timing.start, timestamp, tool_name))

    for row in evidence.transcript:
        item = row.get('item', {})
        item_type = item.get('type')
        event = row['type']
        if item_type == 'agent_message' and event == 'item.completed':
            if current:
                groups.append(current)
                current = []
            text = item['text']
            append('MODEL', '', '<div class="ai-text raw-model">' + rendered_models[item['id']] +
                   '</div><template class="model-source">' + escape(text) + '</template>')
            model_sources.append(text)
            last_kind = 'MODEL'
        elif item_type == 'command_execution' and event == 'item.started':
            tool = tool_map[item['id']]
            require(tool['input'] == item['command'], f'Command mismatch for {item["id"]}')
            if current and last_kind != 'MODEL':
                groups.append(current)
                current = []
            append('ACTION', item['id'], '<div class="raw-field">' +
                   codebox(item['command'], 'command') + '</div>', tool['start'], 'Bash')
            commands.append(item['command'])
            last_kind = 'ACTION'
        elif item_type == 'command_execution' and event == 'item.completed':
            tool = tool_map[item['id']]
            output = item['aggregated_output']
            require(tool['result'] == output, f'Result mismatch for {item["id"]}')
            recorded_results += 1
            if output.strip():
                append('RESULT', item['id'], codebox(output, ''), tool['end'], 'Bash')
                results.append(output)
            elif tool['exit_status'] != 0:
                append('RESULT', item['id'], '<p class="action-description">Exit code: ' +
                       escape(tool['exit_status']) + ' · No output</p>', tool['end'], 'Bash')
            else:
                # Successful empty stdout adds no information to the displayed trace.
                continue
            displayed_results += 1
            last_kind = 'RESULT'
    if current:
        groups.append(current)
    require(len(commands) == recorded_results == len(evidence.tools), 'Incomplete tool execution trace')
    markup = '\n'.join(f'<div class="turn-group" data-turn="{index}">\n' +
                       '\n'.join(group) + '\n</div>'
                       for index, group in enumerate(groups, 1))
    markup += '\n' + render_submission(evidence.submitted_spice)
    markup += '\n' + render_evaluation(evidence, timing)
    return Trace(markup, model_sources, commands, results, recorded_results, displayed_results, len(groups))


def mono(value: object) -> str:
    return f'<span class="mono-value">{escape(value)}</span>'


def summary_row(label: str, value: str, group_start: bool = False) -> str:
    attribute = ' class="summary-group-start"' if group_start else ''
    return f'<tr{attribute}><th>{escape(label)}</th><td>{value}</td></tr>'


def render_summary(evidence: Evidence, timing: RunTiming) -> str:
    def duration(seconds: float, percentage: bool = True) -> str:
        suffix = f'<span class="time-pct">({seconds / timing.wall_s * 100:.1f}%)</span>' if percentage else ''
        return mono(clock(seconds)) + suffix

    def verdict(label: str, report: dict) -> str:
        counts = report['counts']
        return f'{label}: {counts.get("PASS", 0)}/{sum(counts.values())} passed'

    resources = evidence.submission['params']['resources']
    rows = [
        ('Date', mono(timing.start.date().isoformat()), False),
        ('AI model', mono(evidence.configuration['model'] + ' · effort=' + evidence.configuration['effort']), False),
        ('PDK', mono('SKY130'), False),
        ('Evaluation result', verdict('Published', evidence.published) + ' · ' + verdict('Hidden', evidence.hidden), True),
        ('Total elapsed time', duration(timing.wall_s, False), False),
        ('Model-call time', duration(timing.model_s), False),
        ('Measurement RPC time', duration(timing.measurement_s), False),
        ('Model / measurement overlap', duration(timing.overlap_s), False),
        ('Outside model / measurement', duration(timing.outside_s), False),
        ('Architecture', 'Two-stage OTA · attenuated PMOS input · NMOS current-mirror load', True),
        ('Output stage', 'NMOS gain device · 20:1 PMOS bias mirror', False),
        ('Compensation', '2.6 pF Miller capacitor · 2 kΩ series resistor', False),
        ('Input network', '0.31 DC attenuation · 1.2 MΩ per input · capacitive lead and MOS shunt capacitors', False),
        ('Implementation size', f'{resources["mos_instances"]} MOS · {resources["mos_wl_um2"]:,.1f} µm² total W×L · {resources["total_capacitance_f"] * 1e12:.1f} pF explicit C', False),
    ]
    return '\n'.join(summary_row(*row) for row in rows)


def validate_page(page: str, evidence: Evidence, trace: Trace) -> None:
    """Verify full source strings, including whitespace, before writing output."""
    def payloads(pattern: str, content: str = page) -> list[str]:
        return [html.unescape(value) for value in re.findall(pattern, content, re.S)]

    require(payloads(r'<template class="model-source">(.*?)</template>') == trace.models,
            'Model source text changed during rendering')
    require(payloads(r'<pre data-field="command"[^>]*><code>(.*?)</code></pre>') == trace.commands,
            'Command text changed during rendering')
    articles = re.findall(r'<article[^>]*data-kind="RESULT"[^>]*>.*?</article>', page, re.S)
    results = [value for article in articles for value in payloads(r'<pre[^>]*><code>(.*?)</code></pre>', article)]
    require(results == trace.results, 'Result text changed during rendering')
    require(len(articles) == trace.displayed_results, 'Displayed result count changed')
    require(payloads(r'<pre data-field="submitted-spice"[^>]*><code>(.*?)</code></pre>') == [evidence.submitted_spice],
            'Submitted SPICE changed during rendering')
    evaluation_source = re.findall(r'<script type="application/json" id="independent-evaluation-data">(.*?)</script>', page, re.S)
    require(len(evaluation_source) == 1 and json.loads(evaluation_source[0]) == {
        'published': evidence.published, 'hidden': evidence.hidden,
        'independent_evaluation': evidence.timing['independent_evaluation'],
    }, 'Independent evaluation data changed during rendering')
    require('<details' not in page and 'Background completion' not in page, 'Unexpected obsolete trace UI')
    require('<!-- RUN_SUMMARY -->' not in page and '<!-- DESIGN_TRACE -->' not in page, 'Unfilled page template')
    require('/workspace/' not in ''.join(re.findall(r'href="([^"]*)"', page)), 'Unresolvable workspace link')


def build_page(evidence: Evidence) -> tuple[str, Trace, RunTiming]:
    timing = calculate_timing(evidence)
    trace = render_trace(evidence, timing)
    page = PAGE_TEMPLATE.replace('<!-- RUN_SUMMARY -->', render_summary(evidence, timing), 1)
    page = page.replace('<!-- DESIGN_TRACE -->', trace.markup, 1)
    validate_page(page, evidence, trace)
    return page, trace, timing


def main() -> None:
    parser = argparse.ArgumentParser(description='Rebuild the Astra OTA trace from its saved evidence archive.')
    parser.add_argument('source', nargs='?', type=Path, default=DEFAULT_SOURCE)
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    arguments = parser.parse_args()
    page, trace, timing = build_page(load_evidence(arguments.source))
    arguments.output.parent.mkdir(parents=True, exist_ok=True)
    arguments.output.write_text(page, encoding='utf-8')
    print(json.dumps({
        'output': str(arguments.output.resolve()),
        'html_bytes': len(page.encode('utf-8')),
        'gzip_bytes': len(gzip.compress(page.encode('utf-8'), mtime=0)),
        'models': len(trace.models), 'actions': len(trace.commands),
        'nonempty_results': len(trace.results), 'recorded_results': trace.recorded_results,
        'displayed_results': trace.displayed_results, 'groups': trace.groups,
        'wall_s': timing.wall_s, 'model_s': timing.model_s, 'measurement_s': timing.measurement_s,
        'overlap_s': timing.overlap_s, 'outside_s': timing.outside_s,
        'payloads_verified': True,
    }, ensure_ascii=False))


MARKDOWN_RENDERER = r"""
import fs from 'node:fs';
const {marked} = await import(process.env.ATB_MARKED_PATH);
const renderer = new marked.Renderer();
renderer.link = function({href, tokens}) {
  const text = this.parser.parseInline(tokens);
  if (href.startsWith('/workspace/')) return '<code>' + text + '</code>';
  const safe = href.replaceAll('&','&amp;').replaceAll('"','&quot;');
  return '<a href="'+safe+'">'+text+'</a>';
};
renderer.html = ({text}) => text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
marked.use({renderer});
const input = JSON.parse(fs.readFileSync(0, 'utf8'));
process.stdout.write(JSON.stringify(input.map(text => marked.parse(text))));
"""

PAGE_TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width" name="viewport"/>
<title>OTA-WIDE-SKY130 / Astra — Recorded trace</title>
<style id="atb-styles">/* Analog Trace Bench — recorded design trace */
:root {
  color-scheme: light dark;

  --page-bg: #faf9f6;
  --surface: #fffefb;
  --text: #1c1c1b;
  --copy: #272725;
  --muted: #706d67;
  --rule: #ddd9d1;
  --rule-strong: #bdb8ae;
  --table-border: #c9c5bc;

  --model: #1f6a5b;
  --action: #1f4f9a;
  --result: #9a4e1f;
  --focus: #315f9a;

  --font-display: "Helvetica Neue", Arial, sans-serif;
  --font-body: Georgia, "Times New Roman", serif;
  --font-mono: ui-monospace, "Cascadia Mono", "SFMono-Regular", Consolas, monospace;

  --content-width: 800px;
  --page-gutter: 32px;
  --trace-rail-width: 4px;
  --trace-inset: 18px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --page-bg: #171816;
    --surface: #1d1e1b;
    --text: #f0efe9;
    --copy: #dddcd6;
    --muted: #aaa79f;
    --rule: #3b3c38;
    --rule-strong: #55564f;
    --table-border: #55564f;
    --model: #8fb6aa;
    --action: #91abc0;
    --result: #c49a81;
    --focus: #91abc0;
  }
}

* {
  box-sizing: border-box;
}

html {
  background: var(--page-bg);
  color: var(--text);
  scrollbar-gutter: stable;
  text-size-adjust: 100%;
}

body {
  margin: 0;
  background: var(--page-bg);
  color: var(--text);
  font: 400 17px/1.68 var(--font-body);
}

button,
table {
  font: inherit;
}

[hidden] {
  display: none !important;
}

:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 3px;
}

::selection {
  background: color-mix(in srgb, var(--model) 22%, transparent);
}

.site-header,
.page-shell {
  width: min(var(--content-width), calc(100% - 2 * var(--page-gutter)));
  margin-inline: auto;
}

.site-header {
  padding-block: 18px;
  border-bottom: 1px solid var(--rule);
}

.brand {
  color: var(--text);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.015em;
  text-decoration: none;
}

.page-shell {
  padding-block: 32px 72px;
}

.document-header {
  margin-bottom: 18px;
}

.document-header h1 {
  margin: 0 0 10px;
  color: var(--text);
  font: 650 37px/1.06 var(--font-display);
  letter-spacing: -0.032em;
  overflow-wrap: anywhere;
}

.title-model {
  white-space: nowrap;
}

/* Run switcher */
.run-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 22px 0 18px;
}

.run-tab {
  appearance: none;
  padding: 6px 12px;
  border: 1px solid var(--table-border);
  border-radius: 4px;
  background: transparent;
  color: var(--muted);
  font: 500 13px/1.2 var(--font-display);
  cursor: pointer;
}

.run-tab:hover {
  border-color: var(--muted);
  color: var(--text);
}

.run-tab.is-active {
  border-color: var(--muted);
  background: color-mix(in srgb, var(--surface) 65%, transparent);
  color: var(--text);
}

.run-empty {
  margin: 34px 0;
  color: var(--muted);
  font: 400 15px/1.6 var(--font-display);
}

/* Summary */
.run-summary {
  margin-top: 24px;
}

.summary-table {
  width: 100%;
  table-layout: fixed;
  border: 1px solid var(--table-border);
  border-collapse: collapse;
  font: 400 15px/1.5 var(--font-display);
}

.summary-table th,
.summary-table td {
  padding: 8px 10px;
  border: 1px solid var(--rule);
  font-weight: 400;
  text-align: left;
  vertical-align: middle;
  overflow-wrap: anywhere;
}

.summary-table th {
  width: 28.5%;
  color: var(--muted);
}

.summary-table td {
  color: var(--text);
}

.summary-table .summary-group-start > * {
  border-top-color: var(--rule-strong);
}

.mono-value {
  font-variant-numeric: tabular-nums;
}

.time-pct {
  margin-left: 0.28em;
  color: var(--muted);
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* Trace */
.run-trace {
  margin-top: 26px;
}

.turn-group {
  position: relative;
  margin-top: 24px;
  padding-left: var(--trace-inset);
}

.run-trace > .turn-group:first-of-type {
  margin-top: 0;
}

.turn-group::before {
  content: "";
  position: absolute;
  inset-block: 2px;
  left: 0;
  width: var(--trace-rail-width);
  border-radius: 3px;
  background: var(--rule-strong);
  opacity: 0.45;
  pointer-events: none;
}

.trace-entry {
  padding-block: 9px;
}

.trace-entry + .trace-entry {
  margin-top: 4px;
}

.trace-meta {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 9px;
}

.trace-time,
.trace-tool-name {
  color: var(--muted);
  font: 400 12px/1.2 var(--font-display);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.trace-tag {
  display: inline-block;
  padding: 2px 6px;
  border: 1px solid currentColor;
  border-radius: 4px;
  background: transparent;
  font: 600 10px/1.25 var(--font-display);
  letter-spacing: 0.03em;
  text-transform: uppercase;
  white-space: nowrap;
}

.trace-tag--model {
  color: var(--model);
}

.trace-tag--action {
  color: var(--action);
}

.trace-tag--result {
  color: var(--result);
}

.trace-content {
  min-width: 0;
  margin: 0;
}

.ai-text {
  color: var(--copy);
  font: 400 15.5px/1.68 var(--font-body);
  overflow-wrap: anywhere;
}

.ai-text strong,
.ai-text b {
  color: inherit;
  font-weight: inherit;
}

.ai-text p {
  margin: 0 0 10px;
}

.ai-text p:last-child {
  margin-bottom: 0;
}

.ai-text ul,
.ai-text ol {
  margin: 0 0 14px;
  padding-left: 1.35em;
}

.ai-text li {
  margin: 5px 0;
}

.ai-text code {
  padding: 0.06em 0.25em;
  border-radius: 3px;
  background: color-mix(in srgb, var(--rule) 45%, transparent);
  font: 400 0.9em/1.4 var(--font-mono);
}

pre {
  max-width: 100%;
  margin: 0;
  padding: 11px 13px;
  border: 0;
  border-radius: 0;
  background: var(--surface);
  color: color-mix(in srgb, var(--text) 82%, var(--page-bg));
  font: 400 12.5px/1.56 var(--font-mono);
  font-variant-numeric: tabular-nums;
  tab-size: 4;
  --code-padding-block: 11px;
  max-height: calc(5lh + 2 * var(--code-padding-block));
  overflow: auto;
  white-space: pre;
  overflow-wrap: normal;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

@media (max-width: 760px) {
  :root {
    --page-gutter: 18px;
  }

  .site-header {
    padding-block: 16px;
  }

  .page-shell {
    padding-block: 26px 56px;
  }

  .document-header h1 {
    font-size: 31px;
  }

  .summary-table th {
    width: 33%;
  }

  pre {
    padding: 10px 11px;
    --code-padding-block: 10px;
    font-size: 12px;
  }
}

@media (max-width: 520px) {
  body {
    font-size: 16px;
  }

  .document-header h1 {
    font-size: 27px;
  }

  .title-model {
    white-space: normal;
  }

  .summary-table {
    font-size: 14px;
  }

  .summary-table th {
    width: 36%;
  }

  .summary-table th,
  .summary-table td {
    padding: 7px 8px;
  }
}

@media (forced-colors: active) {
  .turn-group::before {
    background: GrayText;
    opacity: 0.7;
  }

  .trace-tag {
    color: CanvasText;
    border-color: CanvasText;
  }

}

/* Raw trace: original strings, including multiline commands and file content. */
.raw-model { white-space: normal; }

.action-description {
  margin: 0;
  color: var(--copy);
  font: 400 14px/1.6 var(--font-display);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

/* Independent evaluation */
.evaluation-table-wrap {
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.summary-table.evaluation-metrics {
  min-width: 700px;
  table-layout: auto;
  font-size: 12px;
}

.summary-table.evaluation-metrics th,
.summary-table.evaluation-metrics td {
  width: auto;
  vertical-align: top;
}

.evaluation-metrics td {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.evaluation-table-wrap::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

pre::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
pre > code { font: inherit; color: inherit; }
</style>
</head>
<body>
<header class="site-header">
<a class="brand" href="../index.html">Analog Trace Bench</a>
</header>
<main class="page-shell">
<article class="document-page">
<header class="document-header">
<h1>OTA-WIDE-SKY130 / <span class="title-model">Astra</span></h1>
</header>
<div aria-label="Trial" class="run-tabs" data-run-tabs="" role="tablist">
<button aria-controls="run-panel-1" aria-selected="true" class="run-tab is-active" data-run="1" id="run-tab-1" role="tab" type="button">Run 1</button>
<button aria-controls="run-panel-2" aria-selected="false" class="run-tab" data-run="2" id="run-tab-2" role="tab" type="button">Run 2</button>
<button aria-controls="run-panel-3" aria-selected="false" class="run-tab" data-run="3" id="run-tab-3" role="tab" type="button">Run 3</button>
</div>
<div aria-labelledby="run-tab-1" class="run-panel" id="run-panel-1" role="tabpanel">
<section aria-label="Run summary" class="run-summary" id="run-1-summary">
<table class="summary-table">
<!-- RUN_SUMMARY -->
</table>
</section>
<section aria-label="Design trace" class="run-trace" id="run-1-trace">
<!-- DESIGN_TRACE -->
</section>
</div>
<div aria-labelledby="run-tab-2" class="run-panel" hidden="" id="run-panel-2" role="tabpanel">
<p class="run-empty">Run 2 is not available yet.</p>
</div>
<div aria-labelledby="run-tab-3" class="run-panel" hidden="" id="run-panel-3" role="tabpanel">
<p class="run-empty">Run 3 is not available yet.</p>
</div>
</article>
</main>
<script>(() => {
  const tablist = document.querySelector('[data-run-tabs]');
  if (!tablist) return;

  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const panels = tabs
    .map((tab) => document.getElementById(tab.getAttribute('aria-controls')))
    .filter(Boolean);

  const activate = (nextTab, moveFocus = false) => {
    tabs.forEach((tab) => {
      const selected = tab === nextTab;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });

    panels.forEach((panel) => {
      panel.hidden = panel.id !== nextTab.getAttribute('aria-controls');
    });

    if (moveFocus) nextTab.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', (event) => {
      const keyMap = {
        ArrowLeft: index - 1,
        ArrowRight: index + 1,
        Home: 0,
        End: tabs.length - 1,
      };

      if (!(event.key in keyMap)) return;
      event.preventDefault();
      const nextIndex = (keyMap[event.key] + tabs.length) % tabs.length;
      activate(tabs[nextIndex], true);
    });
  });
})();</script>
</body>
</html>
"""


if __name__ == "__main__":
    main()
