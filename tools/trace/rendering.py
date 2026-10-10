"""Shared rendering and timing helpers for recorded circuit-design traces.

Archive reading and task-specific evaluation belong to import_results.py.
"""
from __future__ import annotations

from dataclasses import dataclass
import datetime as dt
import html
import json
import os
from pathlib import Path
import re
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from site_templates import format_duration as clock

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
    model_s: float | None
    measurement_s: float
    overlap_s: float | None
    outside_s: float | None


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def escape(value: object) -> str:
    return html.escape(str(value), quote=True)


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
    model_s = evidence.submission_timing['model_time_final']['design_model_calls_s']
    measurement_s = evidence.timing['measurement_rpc_active_s']
    wall_s = evidence.timing['design_wall_s']
    # Incomplete request spans cannot establish model activity or its overlap.
    # Keep independently recorded wall/measurement totals without summing a
    # partial set of model requests.
    if model_s is None:
        return RunTiming(start, wall_s, None, measurement_s, None, None)
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
    outside_s = wall_s - model_s - measurement_s + overlap
    require(outside_s >= 0, 'Timing intervals exceed the recorded submission window')
    return RunTiming(start, wall_s, model_s, measurement_s, overlap, outside_s)


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


def mono(value: object) -> str:
    return f'<span class="mono-value">{escape(value)}</span>'


def summary_row(label: str, value: str, group_start: bool = False) -> str:
    attribute = ' class="summary-group-start"' if group_start else ''
    return f'<tr{attribute}><th>{escape(label)}</th><td>{value}</td></tr>'


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
