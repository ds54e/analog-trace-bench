#!/usr/bin/env python3
"""Generate the static index from the committed run and evidence catalogs."""
import argparse
import html
import json
import re
from decimal import Decimal
from pathlib import Path
from typing import NamedTuple

from fetch_evidence import validate_entry, validate_url
from site_templates import asset_url, evaluation_label, render_page
from token_costs import decimal_cost, load_token_costs

ROOT = Path(__file__).resolve().parents[1]
DISPLAY_ORDER = {
    'model': ('Astra 6', 'Sol 6.1', 'Opus 5.5', 'Sonnet 5.5', 'Fable 5.1',
              'Sol 6', 'Luna 6', 'Haiku 5.5', 'DeepSeek 4.1 Flash'),
    'task': ('OTA-FIXED-SKY130', 'OTA-FREE-SKY130', 'OTA-DRIVE-SKY130',
             'OTA-PRECISION-SKY130', 'OTA-WIDE-SKY130', 'LDO-CORE-SKY130',
             'LDO-ALWAYS-ON-SKY130', 'LDO-QUIET-SKY130', 'LDO-LOW-VOLTAGE-SKY130'),
}


class MetricSummary(NamedTuple):
    mean: Decimal | None
    minimum: Decimal | None
    maximum: Decimal | None


def summarize_metric(values):
    """Aggregate complete recorded values once, without rounding or partial ranges."""
    if not values or any(value is None for value in values):
        return MetricSummary(None, None, None)
    values = [Decimal(str(value)) for value in values]
    return MetricSummary(sum(values, Decimal(0)) / len(values), min(values), max(values))


def metric_label(value, kind):
    if value is None:
        return ''
    return f'{value / 60:.1f} min' if kind == 'time' else f'${value:.2f}'


def metric_cell(metric, scale_max, kind, count):
    value, minimum, maximum = metric
    if value is None:
        return '<span class="unavailable">Not recorded</span>'
    percent = value / scale_max * 100 if scale_max else Decimal(0)
    suffix = 's' if count != 1 else ''
    title = f'Mean of {count} recorded run{suffix}'
    markers = ''
    bounds = ''
    if minimum is not None and maximum is not None:
        bounds = f' data-min="{minimum}" data-max="{maximum}"'
        if count > 1:
            title += f'; min: {metric_label(minimum, kind)}; max: {metric_label(maximum, kind)}'
            start = minimum / scale_max * 100 if scale_max else Decimal(0)
            width = (maximum - minimum) / scale_max * 100 if scale_max else Decimal(0)
            markers = (f'<span class="metric-range" '
                       f'style="left: {start:.4f}%; width: {width:.4f}%"></span>')
            for endpoint, amount in [('min', minimum), ('max', maximum)]:
                position = amount / scale_max * 100 if scale_max else Decimal(0)
                markers += (f'<span class="metric-marker metric-marker--{endpoint}" '
                            f'style="left: {position:.4f}%"></span>')
    return (f'<div class="metric metric--{kind}" data-value="{value}" '
            f'title="{title}"{bounds}>'
            '<span class="metric-track" aria-hidden="true">'
            f'<span class="metric-fill" style="width: {percent:.4f}%"></span>{markers}</span>'
            f'<span class="metric-value">{metric_label(value, kind)}</span></div>')


def load_results(root=ROOT):
    catalog = json.loads((root / 'site/data/runs.json').read_text())
    entries = json.loads((root / 'data/evidence.json').read_text())
    evidence = {entry['id']: entry for entry in entries['runs']}
    costs, _ = load_token_costs(root)
    if len(evidence) != len(entries['runs']):
        raise ValueError('Duplicate evidence run IDs')
    results = []
    seen = set()
    for task in catalog['tasks']:
        groups = {}
        for run in task['runs']:
            if run['id'] in seen:
                raise ValueError('Duplicate catalog run ID: ' + run['id'])
            seen.add(run['id'])
            entry = evidence[run['id']]
            validate_entry(entry)
            if (entry['task'], entry['model'], entry['run']) != (task['id'], run['model'], run['run']):
                raise ValueError('Catalog and evidence identity disagree: ' + run['id'])
            if entry['url']:
                validate_url(entry['url'], entries['repository'], entry['filename'])
            if run['run'] not in (1, 2, 3):
                raise ValueError('The result index supports Run 1–3: ' + run['id'])
            groups.setdefault(run['model'], []).append(run)
        for model, trials in groups.items():
            trials = sorted(trials, key=lambda run: run['run'])
            if len({run['run'] for run in trials}) != len(trials):
                raise ValueError('Duplicate model/run identity: ' + model)
            outcomes = [evaluation_label(evidence[run['id']].get('electrical_status', 'Not recorded'))
                        for run in trials]
            if all(outcome in ('PASS', 'FAIL') for outcome in outcomes):
                verdict = 'PASS' if all(outcome == 'PASS' for outcome in outcomes) else 'FAIL'
                result = (f'<span class="pass-badge pass-badge--{verdict.lower()}">'
                          f'{verdict} <span>{outcomes.count("PASS")} / {len(trials)}</span></span>')
            else:
                result = '<span class="unavailable">Not recorded</span>'
            times = [evidence[run['id']].get('design_model_calls_s') for run in trials]
            totals = [costs[run['id']]['total_cost_usd'] for run in trials]
            amounts = [decimal_cost(total) if total is not None else None for total in totals]
            trace_href = next((run['trace'] for run in trials if run.get('trace')), None)
            results.append({'task': task['id'], 'description': task['description'], 'model': model,
                            'result': result, 'time': summarize_metric(times), 'cost': summarize_metric(amounts),
                            'count': len(trials), 'trace': trace_href})
    return results


def render_result_table(results, view):
    scales = {kind: max((row[kind].maximum for row in results if row[kind].maximum is not None),
                        default=Decimal(0)) for kind in ('time', 'cost')}
    rows = []
    for row in results:
        label = html.escape(row['task' if view == 'model' else 'model'])
        if row['trace']:
            label = '<a href="' + html.escape(row['trace'], quote=True) + '">' + label + '</a>'
        cells = [row['result']] + [metric_cell(row[kind], scales[kind], kind, row['count'])
                                  for kind in ('time', 'cost')]
        rows.append('<tr><th scope="row">' + label + '</th>' +
                    ''.join('<td>' + cell + '</td>' for cell in cells) + '</tr>')
    table_class = 'summary-table results-table' + (' results-table--model' if view == 'model' else '')
    headers = ['Task' if view == 'model' else 'AI model', 'Pass', 'Model-call time', 'USD']
    return ('<table class="' + table_class + '"><thead><tr>' +
            ''.join('<th scope="col"><span class="column-label">' + label + '</span></th>' for label in headers) +
            '</tr></thead><tbody>' + '\n'.join(rows) + '</tbody></table>')


def render_index(root=ROOT, view='model', *, results=None):
    if view not in ('model', 'task'):
        raise ValueError('Unknown result view: ' + view)
    priorities = {kind: {label: rank for rank, label in enumerate(labels)}
                  for kind, labels in DISPLAY_ORDER.items()}
    secondary = 'task' if view == 'model' else 'model'
    rows = load_results(root) if results is None else results
    rows = sorted(rows, key=lambda row: tuple(priorities[kind].get(row[kind], len(priorities[kind]))
                                             for kind in (view, secondary)))
    groups = {}
    for row in rows:
        groups.setdefault(row[view], []).append(row)
    sections = []
    for label, results in groups.items():
        section_id = ('model-' + re.sub(r'[^a-z0-9]+', '-', label.lower()).strip('-')
                      if view == 'model' else label)
        section_id = html.escape(section_id, quote=True)
        section_class = 'task-section' + (' model-section' if view == 'model' else '')
        description = ('<p class="task-description">' + html.escape(results[0]['description']) + '</p>'
                       if view == 'task' else '')
        sections.append('<section class="' + section_class + '" aria-labelledby="' + section_id + '">'
                        '<h2 class="task-heading" id="' + section_id + '">' + html.escape(label) + '</h2>' +
                        description +
                        '<div class="table-scroll" tabindex="0" role="region" aria-labelledby="' + section_id + '">' +
                        render_result_table(results, view) + '</div></section>')
    content = '<main class="page-shell" data-view="' + view + '">\n' + '\n'.join(sections) + '\n</main>'
    head = '<link rel="stylesheet" href="' + asset_url('home.css', root=root) + '"/>'
    title = 'Analog Trace Bench' + (' — Tasks' if view == 'task' else '')
    return render_page(title, content, head, 'index.html', root, current_view=view)


def rendered_indexes(root=ROOT):
    """Render both views from one validated result snapshot."""
    results = load_results(root)
    return {filename: render_index(root, view=view, results=results)
            for filename, view in (('index.html', 'model'), ('tasks.html', 'task'))}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Fail when the committed index is stale.')
    parser.add_argument('--view', choices=('model', 'task'), help='Build only one result view.')
    args = parser.parse_args()
    pages = ({'index.html' if args.view == 'model' else 'tasks.html': render_index(view=args.view)}
             if args.view else rendered_indexes())
    for filename, content in pages.items():
        output = ROOT / 'site' / filename
        if args.check:
            if not output.is_file() or output.read_text() != content:
                raise SystemExit('Index is stale; run python3 tools/build_index.py')
            print(output.name + ' is current.')
        else:
            output.write_text(content)
            print('Generated site/' + output.name)


if __name__ == '__main__':
    main()
