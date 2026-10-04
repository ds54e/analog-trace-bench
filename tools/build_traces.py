#!/usr/bin/env python3
"""Render trace pages from preserved run fragments and shared presentation."""
import html
import json
from pathlib import Path
import re

from site_templates import ROOT, asset_url, evaluation_label, render_page, template
from token_costs import load_token_costs, render_token_summary

EVALUATION_PATTERN = r'<script type="application/json" id="independent-evaluation-data">(.*?)</script>'


def split_evaluation(trace):
    matches = re.findall(EVALUATION_PATTERN, trace, re.S)
    if len(matches) != 1:
        raise ValueError('Prepared trace must contain exactly one complete evaluation report')
    json.loads(matches[0])
    return re.sub(EVALUATION_PATTERN, '', trace, flags=re.S), matches[0] + '\n'


def trace_paths(run_id, root=ROOT):
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', run_id):
        raise ValueError('Invalid run ID: ' + run_id)
    return root / 'content/traces' / run_id, root / 'site/data/evaluations' / (run_id + '.json')


def write_run_sources(run_id, summary, trace, root=ROOT):
    """Import already source-verified markup; leave validation expectations for review."""
    content, report = trace_paths(run_id, root)
    trace, evaluation = split_evaluation(trace)
    content.mkdir(parents=True, exist_ok=True)
    report.parent.mkdir(parents=True, exist_ok=True)
    (content / 'summary.html').write_text(summary, encoding='utf-8')
    (content / 'trace.html').write_text(trace, encoding='utf-8')
    report.write_text(evaluation, encoding='utf-8')


def summary_tables(summary):
    boundary = re.search(r'<tr[^>]*><th>Architecture</th>', summary)
    if boundary is None:
        raise ValueError('Run summary has no circuit architecture')
    return ''.join('<table class="summary-table"><caption>' + caption + '</caption>\n' +
                   rows.strip() + '\n</table>\n' for caption, rows in [
                       ('Run &amp; evaluation', summary[:boundary.start()]),
                       ('Circuit design', summary[boundary.start():])])


def render_trace_page(task, model, summary, trace, run=1, report_href=None, peers=(), root=ROOT,
                      token_summary=''):
    if not isinstance(run, int) or run < 1:
        raise ValueError('Run number must be a positive integer')
    # Simplify presentation while preserving captured fragments and reports.
    summary = re.sub(
        r'(<th>Evaluation result</th><td>)(.*?)(</td>)',
        lambda match: match[1] + re.sub(r'\b(?:MISS|MEASUREMENT_FAILURE)\b', 'FAIL', match[2]) + match[3],
        summary)
    trace = trace.replace('class="evaluation-table-wrap"', 'class="table-scroll evaluation-table-wrap"')
    trace = re.sub(
        r'<table class="summary-table evaluation-metrics">.*?</table>',
        lambda table: re.sub(
            r'<td>((?:PASS|MISS|MEASUREMENT_FAILURE)(?: / (?:PASS|MISS|MEASUREMENT_FAILURE))*)</td></tr>',
            lambda cell: '<td>' + evaluation_label(cell[1]) + '</td></tr>', table[0]),
        trace, flags=re.S)
    available = {peer['run']: peer for peer in peers}
    tabs, empty_panels = [], []
    for number in range(1, max(3, run, *available.keys()) + 1):
        selected = number == run
        tabs.append(f'<button aria-controls="run-panel-{number}" aria-selected="{str(selected).lower()}" '
                    f'class="run-tab{" is-active" if selected else ""}" data-run="{number}" '
                    f'id="run-tab-{number}" role="tab" tabindex="{0 if selected else -1}" '
                    f'type="button">Run {number}</button>')
        if selected:
            continue
        if number in available:
            href = html.escape(Path(available[number]['trace']).name, quote=True)
            message = f'<a href="{href}">Read recorded Run {number}.</a>'
        else:
            message = f'Run {number} is not available yet.'
        empty_panels.append(f'<div aria-labelledby="run-tab-{number}" class="run-panel" hidden="" '
                            f'id="run-panel-{number}" role="tabpanel">\n<p class="run-empty">{message}</p>\n</div>')
    content = template('trace.html', root, task=html.escape(task), model=html.escape(model),
                       run=run, tabs='\n'.join(tabs), empty_panels='\n'.join(empty_panels),
                       summary=summary_tables(summary) + token_summary, trace=trace)
    head = '<link rel="stylesheet" href="' + asset_url('trace.css', '../', root) + '"/>\n'
    head += '<script defer src="' + asset_url('trace.js', '../', root) + '"></script>'
    if report_href:
        head += '\n<link rel="alternate" type="application/json" id="independent-evaluation-data" href="' + \
                html.escape(report_href, quote=True) + '" title="Independent evaluation source"/>'
        head += '\n<link rel="alternate" type="application/json" id="token-cost-data" href="../data/token-costs.json" title="Token usage and cost source"/>'
    return render_page(task + ' / ' + model + ' — Recorded trace', content, head, '../index.html', root)


def rendered_traces(root=ROOT):
    catalog = json.loads((root / 'site/data/runs.json').read_text(encoding='utf-8'))
    outputs = {}
    costs = None
    for task in catalog['tasks']:
        for run in task['runs']:
            if run.get('trace') is None:
                continue
            page = Path(run['trace'])
            if page.parent != Path('traces') or page.suffix != '.html':
                raise ValueError('Trace route must be traces/<filename>.html')
            if page.as_posix() in outputs:
                raise ValueError('Duplicate trace route: ' + run['trace'])
            content, report = trace_paths(run['id'], root)
            if not report.is_file():
                raise ValueError('Missing evaluation source: ' + run['id'])
            if costs is None:
                costs, pricing = load_token_costs(root)
            peers = [peer for peer in task['runs'] if peer['model'] == run['model'] and peer.get('trace')]
            outputs[page.as_posix()] = render_trace_page(
                task['id'], run['model'], (content / 'summary.html').read_text(encoding='utf-8'),
                (content / 'trace.html').read_text(encoding='utf-8'), run=run['run'],
                report_href='../data/evaluations/' + report.name, peers=peers, root=root,
                token_summary=render_token_summary(costs[run['id']], pricing))
    return outputs
