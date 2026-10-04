#!/usr/bin/env python3
"""Import recorded campaign archives; never execute commands or simulate circuits.

Use --all to add missing pages, or supply catalog run IDs. Archive integrity,
expanded records and every displayed payload are checked before installation.
Existing accepted pages are source-checked and preserved by default.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from dataclasses import dataclass
import datetime as dt
import hashlib
import html
import json
import math
from pathlib import Path
import re
import sys

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / 'tools'))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from atb_analysis_archive import unpack, sha
from atb_analysis_export import AnalysisSnapshot, expand, read
from build_traces import render_trace_page, split_evaluation, trace_paths, write_run_sources
from build_site import build
from fetch_evidence import fetch_entry
import build_astra_page as shared
from transcript import Event, Normalized, normalize, successful

require = shared.require
escape = shared.escape


class Records:
    """Resolve factored JSON and stream parts in their recorded manifest order."""
    def __init__(self, folder):
        self.folder = Path(folder)
        self.snapshot = AnalysisSnapshot(self.folder)
        self.manifest = self.snapshot.load_manifest()
        self.shared = {}
        for name in self.manifest['files']:
            if name.startswith('shared/') and name.endswith('.json'):
                self.shared.update(read(self.folder / name))

    def get(self, name):
        if name in self.manifest['streams']:
            return [json.loads(line)
                    for part in self.manifest['streams'][name]['parts']
                    for line in (self.folder / part).read_bytes().splitlines() if line.strip()]
        require(name in self.manifest['files'], 'Missing recorded evidence: ' + name)
        data = (self.folder / name).read_bytes()
        return expand(json.loads(data), self.shared) if name.endswith('.json') else data


@dataclass(frozen=True)
class CampaignEvidence(shared.Evidence):
    extra_reports: dict
    robustness_circuits: list


def reports(evidence):
    return {'published': evidence.published, 'hidden': evidence.hidden,
            **{stage: report for stage, report in evidence.extra_reports.items()
               if stage == 'robustness' and isinstance(report, dict) and report.get('rows')}}


def report_source(evidence):
    return {'published': evidence.published, 'hidden': evidence.hidden,
            'independent_evaluation': evidence.timing['independent_evaluation'], **evidence.extra_reports}


def verify_fixed_submission(submission, spice):
    # This campaign freezes an eight-transistor topology and admits only sizing.
    # Compare every admitted parameter with the saved circuit, without running it.
    device_params = {'Mbn': ('wbn', 'lbn'), 'Mtl': ('wtl', 'ltl'),
                     'M1': ('win', 'lin'), 'M2': ('win', 'lin'),
                     'M3': ('wld', 'lld'), 'M4': ('wld', 'lld'),
                     'M7': ('wp2', 'lp2'), 'M8': ('wn2', 'ln2')}
    params = submission['params']
    for device, (w, l) in device_params.items():
        match = re.search(r'(?m)^X' + device + r'\s+.*?\bw=([^\s]+)\s+l=([^\s]+)', spice)
        require(match is not None and float(match[1]) == float(params[w]) and float(match[2]) == float(params[l]),
                'Fixed-topology sizing differs from frozen submission: ' + device)
    capacitor = re.search(r'(?m)^Cc\s+\S+\s+\S+\s+(\S+)', spice)
    require(capacitor is not None and float(capacitor[1]) == float(params['cc']), 'Fixed Miller capacitor differs')
    resistor = re.search(r'(?m)^Rz\s+\S+\s+\S+\s+(\S+)', spice)
    require((resistor is not None and float(resistor[1]) == float(params['rz'])) or
            (resistor is None and float(params['rz']) == 0), 'Fixed compensation resistor differs')


def load_evidence(entry, records):
    trials = records.manifest['trials']
    require(len(trials) == 1, 'Expected one independently evaluated trial per archive')
    trial = trials[0]
    require(trial['run_id'] == entry['slot'], 'Archive slot differs from catalog')
    require(trial['participant_campaign'] == entry['attempt_id'], 'Archive attempt differs from catalog')
    require(trial['configuration'] == entry['configuration'], 'Archive configuration differs from catalog')
    require(sha(records.folder / 'manifest.json') == entry['analysis_manifest_sha256'],
            'Archive analysis identity differs from catalog')
    base = entry['slot'] + '/evidence/'
    def get(name):
        return records.get(base + name)
    submitted = get('submitted.spice')
    submission = get('submission.json')
    circuit = get('submitted_circuit_manifest.json')
    require(circuit['sha256'] == hashlib.sha256(submitted).hexdigest() and
            circuit['revision'] == submission['revision'], 'Submitted circuit manifest differs')
    if entry['task'] == 'OTA-FIXED-SKY130':
        verify_fixed_submission(submission, submitted.decode('utf-8'))
    else:
        require(submitted.decode('utf-8') == submission['design']['netlist'],
                'Submitted SPICE and frozen submission netlist disagree')
    evidence = CampaignEvidence(
        get('tools.json'), trial['configuration'], submission, submitted.decode('utf-8'),
        get('measurement-timing.json'), get('submission-timing.json'), get('model-call-timing.json'),
        get('published.json'), get('hidden.json'), get('transcript.jsonl'), get('events.jsonl'),
        {stage: get(stage + '.json') for stage in ('robustness', 'characterization', 'fine')}, [])
    robustness = evidence.extra_reports['robustness']
    if robustness:
        samples = robustness['samples']
        info = robustness['robustness']
        require(len(samples) == info['attempted'] == len(robustness['groups']), 'Robustness sample coverage differs')
        for group in robustness['groups']:
            case = get('experiments/' + group['group'] + '.json')
            require(len(case['records']) == 1, 'Expected one fixed robustness sample per group')
            original = case['records'][0]
            require(original['variant'] == submission['revision'] and
                    original['dut_netlist_sha256'] == circuit['sha256'] and
                    original['dut_params'] == submission['params'], 'Robustness circuit identity differs')
            evidence.robustness_circuits.append({'experiment': group['group'], 'revision': original['variant'],
                                                'spice_sha256': original['dut_netlist_sha256']})
        valid = [sample for sample in samples if sample['status'] == 'OK']
        passed = sum(sample['abs_follower_error_v'] <= info['limit_v'] for sample in valid)
        require(len(valid) == info['valid'] and passed == info['passed'], 'Robustness verdict differs from samples')
    for stage in ('published', 'hidden'):
        report = getattr(evidence, stage)
        require(report['electrical_status'] == entry['stages'][stage]['electrical_status'],
                'Recorded evaluation status differs from catalog')
        require(report['counts'] == entry['stages'][stage]['counts'],
                'Recorded evaluation counts differ from catalog')
    return evidence



def calculate_timing(evidence):
    timing = shared.calculate_timing(evidence)
    recorded = evidence.timing.get('model_calls', {})
    if recorded.get('state') == 'recorded':
        require(abs(recorded['model_calls_wall_s'] - timing.model_s) < 0.01,
                'Recorded model timing disagrees with submission-window accounting')
        require(abs(recorded['model_measurement_overlap_s'] - timing.overlap_s) < 0.01,
                'Recorded overlap disagrees with clipped interval accounting')
    require(abs(timing.model_s - evidence.submission_timing['model_time_final']['design_model_calls_s']) < 0.01,
            'Submission time differs')
    return timing


def action_body(fields):
    if isinstance(fields, str):
        return '<div class="raw-field">' + shared.codebox(fields, 'command') + '</div>'
    require(isinstance(fields, dict), 'Unsupported tool arguments')
    pieces = []
    if 'description' in fields:
        pieces.append('<div class="raw-field"><p class="action-description" data-field="description">' +
                      escape(fields['description']) + '</p></div>')
    for key in ('command', 'file_path', 'path', 'content'):
        if key in fields:
            require(isinstance(fields[key], str), 'Non-string tool payload: ' + key)
            label = '<div class="raw-field-label">content</div>' if key == 'content' else ''
            pieces.append('<div class="raw-field">' + label + shared.codebox(fields[key], key) + '</div>')
    options = {k: v for k, v in fields.items()
               if k not in {'command', 'file_path', 'path', 'content', 'description', 'timeout'}}
    if options:
        pieces.append('<div class="raw-field">' + shared.codebox(
            json.dumps(options, ensure_ascii=False, indent=2, allow_nan=False), 'options') + '</div>')
    return ''.join(pieces)


def render_history(normalized, timing):
    models = [dict(id=e.id, text=e.payload) for e in normalized.events if e.kind == 'MODEL']
    # All archive-supplied links/images are inert. The original Markdown remains
    # recoverable in model-source templates; no remote content is fetched by readers.
    renderer = shared.MARKDOWN_RENDERER
    start = renderer.index('renderer.link = ')
    end = renderer.index('renderer.html = ', start)
    renderer = renderer[:start] + """renderer.link = function({tokens}) { return this.parser.parseInline(tokens); };
renderer.image = ({text}) => text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
""" + renderer[end:]
    original = shared.MARKDOWN_RENDERER
    try:
        shared.MARKDOWN_RENDERER = renderer
        rendered = shared.render_model_markdown(models)
    finally:
        shared.MARKDOWN_RENDERER = original
    groups, current = [], []
    previous = None
    for event in normalized.events:
        if current and (event.kind == 'MODEL' or event.kind == 'ACTION' and previous != 'MODEL'):
            groups.append(current)
            current = []
        if event.kind == 'MODEL':
            markup = re.sub(r'<table>(.*?)</table>',
                            r'<div class="ai-table-wrap"><table class="ai-table">\1</table></div>',
                            rendered[event.id], flags=re.S)
            body = '<div class="ai-text raw-model">' + markup + '</div>'
            body += '<template class="model-source">' + escape(event.payload) + '</template>'
        elif event.kind == 'ACTION':
            body = action_body(event.payload)
        else:
            body = shared.codebox(event.payload, '') if event.payload.strip() else ''
            if not successful(event.status):
                body += '<p class="action-description">Outcome: ' + escape(event.status)
                body += (' · No output' if not event.payload.strip() else '') + '</p>'
        current.append(shared.render_article(event.kind, '' if event.kind == 'MODEL' else event.id,
                       body, timing.start, event.timestamp, event.name))
        previous = event.kind
    if current:
        groups.append(current)
    return '\n'.join(f'<div class="turn-group" data-turn="{i}">\n' + '\n'.join(g) + '\n</div>'
                     for i, g in enumerate(groups, 1))


LDO_LABELS = {
    'dc_error_v': 'DC regulation error',
    'overhead_a': 'Overhead current',
    'vref_abs_a': 'VREF current',
    'initial_hold_error_v': 'Initial hold error',
    'envelope_error_v': 'Transient envelope error',
    'recovery_0_s': 'First edge · recovery',
    'recovery_1_s': 'Second edge · recovery',
    'output_noise_rms_v': 'Output noise',
}


FIXED_ALIASES = {
    'loop_gain_db_min': 'gain_db', 'unity_loop_gain_hz_min': 'unity_gain_hz',
    'dc_tracking_error_v_max': 'tracking_error_v', 'quiescent_power_w_max': 'power_w',
    'input_noise_rms_v_max': 'input_noise_rms_v', 'cmrr_db_min': 'cmrr_db',
    'psrr_plus_db_min[1000Hz]': 'psrr_1000_db', 'psrr_plus_db_min[1000000Hz]': 'psrr_1000000_db',
}
for step in ('small_up', 'small_down', 'large_up', 'large_down'):
    FIXED_ALIASES['settling_time_s_max[' + step + ']'] = step + '_settling_time_s'
for step in ('small_up', 'small_down'):
    FIXED_ALIASES['overshoot_ratio_max[' + step + ']'] = step + '_overshoot_ratio'
for step in ('large_up', 'large_down'):
    FIXED_ALIASES['large_step_20_80_slope_v_per_s_min[' + step + ']'] = step + '_slew_v_per_s'


def metric_label(metric):
    metric = FIXED_ALIASES.get(metric, metric)
    if metric == 'cmrr_valid_measurement':
        return 'CMRR measurement validity'
    if metric in ('phase_margin_deg_min', 'no_0db_recross_min', 'mismatch_pass_count_min'):
        return {'phase_margin_deg_min': 'Phase margin', 'no_0db_recross_min': 'No 0 dB recross',
                'mismatch_pass_count_min': 'Mismatch samples passed'}[metric]
    return LDO_LABELS[metric] if metric in LDO_LABELS else shared.metric_label(metric)


def metric_value(metric, value, unit, significant_digits=6):
    metric = FIXED_ALIASES.get(metric, metric)
    if metric in ('dc_error_v', 'initial_hold_error_v', 'envelope_error_v'):
        return shared.metric_value('tracking_error_v', value, unit, significant_digits=significant_digits)
    if metric in ('overhead_a', 'vref_abs_a'):
        return shared.metric_value('input_current_abs_a', value, unit, significant_digits=significant_digits)
    if metric.startswith('recovery_'):
        factor, display_unit = 1e6, 'µs'
    elif metric == 'output_noise_rms_v':
        factor, display_unit = 1e6, 'µV RMS'
    else:
        return shared.metric_value(metric, value, unit, significant_digits=significant_digits)
    number = f'{value * factor:.{significant_digits}g}'
    if 'e' in number and 1e-3 <= abs(float(number)) < 1e6:
        number = f'{float(number):g}'
    return number + ' ' + display_unit


def condition(row):
    # Case IDs distinguish DC/load/line edges; the full experiment identity stays
    # in the linked report rather than consuming the visible condition column.
    suffix = ' · ' + row['case_id'] if row.get('case_id') else ''
    if row['cload_f'] in ('all', 'bias'):
        scope = 'all loads' if row['cload_f'] == 'all' else 'bias operating point'
        return f'{row["stage"].title()} · {row["pvt"]} · {scope}' + suffix
    cap = float(row['cload_f'])
    factor, unit = (1e6, 'µF') if cap >= 1e-6 else ((1e9, 'nF') if cap >= 1e-9 else (1e12, 'pF'))
    return f'{row["stage"].title()} · {row["pvt"]} · {cap * factor:g} {unit}' + suffix


def evaluation_groups(evidence):
    grouped = {}
    for stage, report in reports(evidence).items():
        require(report['stage'] == stage, 'Evaluation stage identity differs')
        require(dict(Counter(r['verdict'] for r in report['rows'])) == report['counts'],
                'Evaluation counts differ from recorded rows')
        require(len(report['groups']) == report['expected_groups'], 'Evaluation group inventory differs')
        for row in report['rows']:
            if stage == 'robustness' and row['metric'] == 'mismatch_pass_count_min':
                # The aggregate is intentionally revisionless; every underlying
                # diagnostic sample must match the frozen revision.
                require(report['robustness']['attempted'] == len(report['samples']), 'Robustness sample inventory differs')
            else:
                require(row['revision'] == evidence.submission['revision'],
                        'Evaluation revision differs from frozen submission')
            require(row['stage'] == stage, 'Evaluation row stage differs')
            if row['metric'] == 'cmrr_valid_measurement':
                require(row['verdict'] == 'MEASUREMENT_FAILURE' and row['measured'] is None,
                        'Unsupported measurement-validity record')
                grouped.setdefault((row['metric'], None, None, ''), []).append(row)
                continue
            require(row['direction'] in ('<=', '>='), 'Unsupported metric direction')
            limit = row.get('limit', row.get('draft_standard_target'))
            require(isinstance(limit, (int, float)) and math.isfinite(limit),
                    'Unsupported metric limit')
            if row['measured'] is not None:
                require(isinstance(row['measured'], (int, float)) and math.isfinite(row['measured']),
                        'Non-finite recorded measurement')
            key = (row['metric'], row['direction'], limit, row['unit'])
            grouped.setdefault(key, []).append(row)
    return grouped


def render_evaluation(evidence, timing):
    grouped = evaluation_groups(evidence)
    rows = []
    for (metric, direction, limit, unit), measurements in grouped.items():
        label = metric_label(metric)
        variants = [k for k in grouped if k[0] == metric]
        if len(variants) > 1:
            # Overhead limits distinguish light load; quiet-LDO envelope limits
            # distinguish line and load transients. Never merge these requirements.
            if metric == 'overhead_a':
                label = ('Light-load overhead current' if limit == min(k[2] for k in variants)
                         else 'Overhead current · other loads')
            elif metric == 'envelope_error_v':
                label += ' · ' + ('line' if all(r['case_id'].startswith('line') for r in measurements) else 'load')
            else:
                raise ValueError('Unreviewed task-specific metric variants: ' + metric)
        bounded = [r for r in measurements if r['measured'] is None and r.get('measurement_valid') and
                   r.get('measured_lower_bound') is not None]
        invalid = [r for r in measurements if not r.get('measurement_valid', False) or
                   r['measured'] is None and r.get('measured_lower_bound') is None]
        verdicts = {r['verdict'] for r in measurements}
        verdict = 'PASS' if verdicts == {'PASS'} else ' / '.join(sorted(verdicts))
        inequality = '≤' if direction == '<=' else '≥'
        if metric == 'cmrr_valid_measurement':
            limit_text = 'Balanced operating point required'
        elif metric == 'ibias_compliance':
            limit_text = 'VSS ≤ V(IBIAS) ≤ VDD'
        elif metric == 'no_0db_recross_min':
            limit_text = 'No 0 dB recross'
        else:
            limit_text = inequality + ' ' + metric_value(metric, limit, unit)
        if invalid:
            measured_text = f'Unavailable · {len(invalid)}/{len(measurements)} measurements invalid'
            condition_text = condition(invalid[0])
        elif bounded:
            require(direction == '<=', 'Unsupported censored lower-bound metric')
            candidates = [(r['measured_lower_bound'], r) for r in bounded]
            candidates += [(r['measured'], r) for r in measurements if r['measured'] is not None]
            value, worst = max(candidates, key=lambda pair: pair[0])
            measured_text = '≥ ' + metric_value(metric, value, unit, 2) + f' · {len(bounded)} windows exceeded'
            condition_text = condition(worst)
        else:
            worst = (max if direction == '<=' else min)(measurements, key=lambda r: r['measured'])
            measured_text = ('Within supply rails' if worst['measured'] == 1 else 'Outside supply rails') \
                if metric == 'ibias_compliance' else metric_value(metric, worst['measured'], unit, 2)
            if metric == 'no_0db_recross_min':
                measured_text = 'No recross' if worst['measured'] == 1 else 'Recross recorded'
            condition_text = condition(worst)
        cells = [measured_text, limit_text, condition_text, verdict]
        rows.append('<tr data-metric="' + escape(metric) + '"><th scope="row">' + escape(label) + '</th>' +
                    ''.join('<td>' + escape(cell) + '</td>' for cell in cells) + '</tr>')
    independent = evidence.timing['independent_evaluation']
    source = json.dumps(report_source(evidence), ensure_ascii=False,
                        separators=(',', ':'), allow_nan=False).replace('<', '\\u003c')
    incomplete = [stage.title() for stage in ('published', 'hidden')
                  if not getattr(evidence, stage)['execution_complete'] or
                  not all(g['complete'] for g in getattr(evidence, stage)['groups'])]
    note = '<p class="action-description">Incomplete evaluation: ' + escape(', '.join(incomplete)) + '</p>' if incomplete else ''
    return ('<div class="turn-group" data-evaluation="independent">'
            '<article class="trace-entry trace-evaluation" data-kind="EVALUATION" aria-label="Final independent evaluation">'
            '<div class="trace-meta"><span class="trace-tag trace-tag--result">RESULT</span>' +
            (shared.time_tag(independent['finished_at'], timing.start) if independent.get('finished_at') else '') +
            '<span class="trace-tool-name">Independent evaluation</span></div><div class="trace-content">' + note +
            '<div class="evaluation-table-wrap" tabindex="0" aria-label="Independent evaluation metrics">'
            '<table class="summary-table evaluation-metrics"><thead><tr><th scope="col">Metric</th>'
            '<th scope="col">Worst value</th><th scope="col">Limit</th><th scope="col">Worst condition</th>'
            '<th scope="col">Result</th></tr></thead><tbody>' + '\n'.join(rows) + '</tbody></table></div>'
            '<script type="application/json" id="independent-evaluation-data">' + source + '</script>'
            '</div></article></div>')


def render_summary(entry, evidence, timing, descriptions):
    def duration(seconds, percentage=True):
        return shared.mono(shared.clock(seconds)) + (f'<span class="time-pct">({seconds / timing.wall_s * 100:.1f}%)</span>'
                                                     if percentage else '')
    def verdict(stage):
        report = getattr(evidence, stage)
        counts = report['counts']
        incomplete = ' · incomplete' if not report['execution_complete'] else ''
        return (f'{stage.title()}: {counts.get("PASS", 0)}/{sum(counts.values())} passed'
                f' ({report["electrical_status"]})' + incomplete)
    rows = [
        ('Date', shared.mono(timing.start.date().isoformat()), False),
        ('AI model', shared.mono(evidence.configuration['model'] + ' · effort=' + evidence.configuration['effort']), False),
        ('PDK', shared.mono('SKY130'), False),
        ('Evaluation result', escape(verdict('published') + ' · ' + verdict('hidden')), True),
        ('Total elapsed time', duration(timing.wall_s, False), False),
        ('Model-call time', duration(timing.model_s), False),
        ('Measurement RPC time', duration(timing.measurement_s), False),
        ('Model / measurement overlap', duration(timing.overlap_s), False),
        ('Outside model / measurement', duration(timing.outside_s), False),
    ]
    if evidence.extra_reports['robustness']:
        info = evidence.extra_reports['robustness']['robustness']
        rows.insert(4, ('Deterministic robustness',
                       escape(f'{info["passed"]}/{info["expected"]} samples passed · '
                              f'{info["required"]} required ({info["verdict"]})'), False))
    if entry.get('failure_category'):
        rows.append(('Evaluation diagnosis', escape(entry['diagnosis']), False))
    if entry.get('submission_model_late'):
        rows.append(('Submission timing', 'Submitted after the model-call time budget', False))
    for i, (label, value) in enumerate(descriptions):
        rows.append((label, escape(value), i == 0))
    resources = evidence.submission['params'].get('resources')
    if resources is None:
        resources = {'mos_instances': 8, 'mos_wl_um2': evidence.submission['gate_area_um2'],
                     'total_capacitance_f': float(evidence.submission['params']['cc'])}
    rows.append(('Implementation size', f'{resources["mos_instances"]} MOS · {resources["mos_wl_um2"]:,.1f} µm² total W×L · '
                 f'{resources["total_capacitance_f"] * 1e12:g} pF explicit C', False))
    return '\n'.join(shared.summary_row(*row) for row in rows)


def decoded(pattern, text):
    return [html.unescape(value) for value in re.findall(pattern, text, re.S)]


def verify_payloads(trace, normalized, evidence, report):
    models = [e.payload for e in normalized.events if e.kind == 'MODEL']
    require(decoded(r'<template class="model-source">(.*?)</template>', trace) == models,
            'Completed public MODEL source changed')
    articles = re.findall(r'<article[^>]*data-kind="(ACTION|RESULT)"[^>]*>.*?</article>', trace, re.S)
    require(len(articles) == sum(e.kind != 'MODEL' for e in normalized.events), 'Displayed tool coverage differs')
    by_kind = defaultdict(list)
    for article in re.findall(r'<article[^>]*data-kind="(?:ACTION|RESULT)"[^>]*>.*?</article>', trace, re.S):
        kind = re.search(r'data-kind="([^"]+)"', article)[1]
        id = html.unescape(re.search(r'data-tool-id="([^"]+)"', article)[1])
        by_kind[kind].append((id, article))
    for kind in ('ACTION', 'RESULT'):
        expected = [e for e in normalized.events if e.kind == kind]
        actual = by_kind[kind]
        require([e.id for e in expected] == [id for id, _ in actual], 'Tool ID/order changed: ' + kind)
        for event, (_, article) in zip(expected, actual):
            if kind == 'RESULT':
                outputs = decoded(r'<pre[^>]*><code>(.*?)</code></pre>', article)
                require(outputs == ([event.payload] if event.payload.strip() else []), 'Tool RESULT payload changed: ' + event.id)
                if not event.payload.strip():
                    require('No output' in article and escape(event.status) in article, 'Empty failure hidden')
                continue
            fields = event.payload if isinstance(event.payload, dict) else {'command': event.payload}
            for name, value in fields.items():
                if name == 'timeout':
                    continue
                if name in ('command', 'file_path', 'path', 'content'):
                    require(decoded(r'<pre data-field="' + name + r'"[^>]*><code>(.*?)</code></pre>', article) == [value],
                            'ACTION payload changed: ' + event.id + ' ' + name)
                elif name == 'description':
                    require(decoded(r'<p[^>]*data-field="description"[^>]*>(.*?)</p>', article) == [value],
                            'ACTION description changed: ' + event.id)
                else:
                    options = decoded(r'<pre data-field="options"[^>]*><code>(.*?)</code></pre>', article)
                    require(len(options) == 1 and json.loads(options[0]).get(name) == value,
                            'ACTION options changed: ' + event.id + ' ' + name)
    require(decoded(r'<pre data-field="submitted-spice"[^>]*><code>(.*?)</code></pre>', trace) == [evidence.submitted_spice],
            'Submitted SPICE bytes changed')
    expected_report = report_source(evidence)
    actual_report = json.loads(report)
    # Accepted reference fragments predate extra-stage retention. Their two
    # reports remain byte-for-byte protected; empty optional reports add no rows.
    if not any(evidence.extra_reports.values()) and set(actual_report) == {'published', 'hidden', 'independent_evaluation'}:
        expected_report = {key: expected_report[key] for key in actual_report}
    require(actual_report == expected_report, 'Expanded independent evaluation data changed')


def validation_profile(entry, trace, summary, report, normalized, evidence):
    return {
        'id': entry['id'], 'page': entry['trace'],
        'counts': dict(Counter(e.kind for e in normalized.events)),
        'submitted_spice_bytes': len(evidence.submitted_spice.encode('utf-8')),
        'submitted_spice_sha256': hashlib.sha256(evidence.submitted_spice.encode('utf-8')).hexdigest(),
        'revision': evidence.submission['revision'],
        'evaluation_categories': len(re.findall(r'<tr data-metric=', trace)),
        'evaluation_row_counts': {stage: len(report["rows"]) for stage, report in reports(evidence).items()},
        'content_sha256': {name: hashlib.sha256(text.encode('utf-8')).hexdigest()
                           for name, text in [('summary.html', summary), ('trace.html', trace)]},
        'evaluation_sha256': hashlib.sha256(report.encode('utf-8')).hexdigest(),
        'source_archive_sha256': entry['sha256'],
        'source_verification': {
            'payloads_verified': True, 'recorded_tools': len(normalized.tools),
            'read_line_number_prefixes_removed': normalized.read_prefixes,
            'omissions': normalized.omissions,
            'robustness_sample_circuits': evidence.robustness_circuits,
            'unavailable_measurement_rows': {stage: sum(not r.get('measurement_valid', False) or (r['measured'] is None and r.get('measured_lower_bound') is None)
                                                    for r in getattr(evidence, stage)['rows'])
                                         for stage in ('published', 'hidden')},
            'window_exceeded_rows': {stage: sum(r['measured'] is None and bool(r.get('measurement_valid')) and
                                              r.get('measured_lower_bound') is not None
                                              for r in getattr(evidence, stage)['rows'])
                                     for stage in ('published', 'hidden')},
        },
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('run_ids', nargs='*')
    parser.add_argument('--all', action='store_true', help='Source-check all results and add all missing pages')
    parser.add_argument('--verify-only', action='store_true', help='Verify saved fragments against archives without writing')
    parser.add_argument('--evidence', type=Path, default=REPO / 'evidence')
    args = parser.parse_args()
    manifest = read(REPO / 'data/evidence.json')
    catalog_path = REPO / 'site/data/runs.json'
    catalog = read(catalog_path)
    runs = {r['id']: r for task in catalog['tasks'] for r in task['runs']}
    profiles_path = REPO / 'data/trace-validation.json'
    profiles = read(profiles_path)
    indexed = {p['id']: p for p in profiles['traces']}
    descriptions = read(REPO / 'data/trace-summaries.json')
    selected = [e for e in manifest['runs'] if args.all or e['id'] in args.run_ids]
    require(len(selected) > 0, 'Supply known run IDs or --all')
    require(not set(args.run_ids) - {e['id'] for e in selected}, 'Unknown run ID')
    imported = verified = 0

    def save_catalog():
        profiles['traces'] = [indexed[e['id']] for e in manifest['runs'] if e['id'] in indexed]
        for path, value in ((profiles_path, profiles), (catalog_path, catalog)):
            temporary = path.with_suffix(path.suffix + '.tmp')
            temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            temporary.replace(path)

    for entry in selected:
        archive = fetch_entry(entry, manifest['repository'], args.evidence)
        destination = args.evidence / 'unpacked' / entry['id']
        if not destination.exists():
            unpack(archive, destination)
        records = Records(destination / 'analysis')
        # Recheck cached snapshots as well as the compressed source identity.
        records.snapshot.verify()
        evidence = load_evidence(entry, records)
        normalized = normalize(evidence)
        timing = calculate_timing(evidence)
        run = runs[entry['id']]
        content, report_path = trace_paths(entry['id'])
        if run.get('trace'):
            trace = (content / 'trace.html').read_text(encoding='utf-8')
            report = report_path.read_text(encoding='utf-8')
            verify_payloads(trace, normalized, evidence, report)
            evaluation_groups(evidence)
            if entry['id'] in descriptions:
                # The original four reference pages retain their accepted
                # presentation. Campaign pages must also match the current
                # source-derived summary and task-specific worst-value table.
                summary = (content / 'summary.html').read_text(encoding='utf-8')
                require(summary == render_summary(entry, evidence, timing, descriptions[entry['id']]),
                        'Run summary differs from recorded evidence')
                table_pattern = r'<table class="summary-table evaluation-metrics">.*?</table>'
                require(re.findall(table_pattern, trace, re.S) ==
                        re.findall(table_pattern, render_evaluation(evidence, timing), re.S),
                        'Visible evaluation differs from recorded evidence')
            verified += 1
        else:
            require(not args.verify_only, 'Trace not imported: ' + entry['id'])
            require(entry['id'] in descriptions, 'Missing reviewed circuit summary: ' + entry['id'])
            summary = render_summary(entry, evidence, timing, descriptions[entry['id']])
            trace = render_history(normalized, timing) + '\n' + shared.render_submission(evidence.submitted_spice)
            trace += '\n' + render_evaluation(evidence, timing)
            clean_trace, report = split_evaluation(trace)
            verify_payloads(clean_trace, normalized, evidence, report)
            run['trace'] = 'traces/' + entry['id'].removesuffix('-r1') + '-raw.html'
            page = render_trace_page(entry['task'], entry['model'], summary, clean_trace,
                                     report_href='../data/evaluations/' + entry['id'] + '.json')
            require('<details' not in page and '<script>' not in page, 'Active or obsolete archived UI')
            write_run_sources(entry['id'], summary, trace)
            indexed[entry['id']] = validation_profile({**entry, 'trace': run['trace']},
                                                       clean_trace, summary, report, normalized, evidence)
            imported += 1
            save_catalog()
        print(f'{entry["id"]}: source verified ({len(normalized.tools)} tools)', flush=True)
    if not args.verify_only:
        save_catalog()
        pages = build()
        print(f'Imported {imported}; preserved/source-verified {verified}; built {pages} pages.')
    else:
        print(f'Source-verified {verified} recorded pages.')


if __name__ == '__main__':
    main()
