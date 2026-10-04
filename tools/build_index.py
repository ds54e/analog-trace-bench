#!/usr/bin/env python3
"""Generate the static index from the committed run and evidence catalogs."""
import argparse
import html
import json
from decimal import Decimal
from pathlib import Path

from fetch_evidence import validate_entry, validate_url
from site_templates import asset_url, evaluation_label, render_page
from token_costs import decimal_cost, load_token_costs

ROOT = Path(__file__).resolve().parents[1]


def mean_value(values):
    if not values or any(value is None for value in values):
        return None
    return sum((Decimal(str(value)) for value in values), Decimal(0)) / len(values)


def metric_cell(value, maximum, label, kind, count):
    if value is None:
        return '<span class="unavailable">Not recorded</span>'
    percent = value / maximum * 100 if maximum else Decimal(0)
    suffix = 's' if count != 1 else ''
    return (f'<div class="metric metric--{kind}" data-value="{value}" '
            f'title="Mean of {count} recorded run{suffix}">'
            '<span class="metric-track" aria-hidden="true">'
            f'<span class="metric-fill" style="width: {percent:.4f}%"></span></span>'
            f'<span class="metric-value">{label}</span></div>')


def render_index(root=ROOT):
    catalog = json.loads((root / 'site/data/runs.json').read_text())
    entries = json.loads((root / 'data/evidence.json').read_text())
    evidence = {entry['id']: entry for entry in entries['runs']}
    costs, _ = load_token_costs(root)
    if len(evidence) != len(entries['runs']):
        raise ValueError('Duplicate evidence run IDs')
    sections = []
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
        models = []
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
            model_label = html.escape(model)
            trace_href = next((run['trace'] for run in trials if run.get('trace')), None)
            if trace_href:
                model_label = '<a href="' + html.escape(trace_href, quote=True) + '">' + model_label + '</a>'
            models.append((model_label, result, mean_value(times), mean_value(amounts), len(trials)))
        max_time = max((time for _, _, time, _, _ in models if time is not None), default=Decimal(0))
        max_cost = max((cost for _, _, _, cost, _ in models if cost is not None), default=Decimal(0))
        rows = []
        for model_label, result, time, cost, count in models:
            cells = [result,
                     metric_cell(time, max_time, f'{time / 60:.1f} min' if time is not None else '', 'time', count),
                     metric_cell(cost, max_cost, f'${cost:.2f}' if cost is not None else '', 'cost', count)]
            rows.append('<tr><th scope="row">' + model_label + '</th>' +
                        ''.join('<td>' + cell + '</td>' for cell in cells) + '</tr>')
        task_id = html.escape(task['id'], quote=True)
        sections.append('<section class="task-section" aria-labelledby="' + task_id + '">'
                        '<h2 class="task-heading" id="' + task_id + '">' + task_id + '</h2>'
                        '<p class="task-description">' + html.escape(task['description']) + '</p>'
                        '<div class="table-scroll" tabindex="0" role="region" aria-labelledby="' + task_id + '">'
                        '<table class="summary-table results-table"><thead><tr><th scope="col">AI model</th>'
                        '<th scope="col">Pass</th><th scope="col">Model-call time</th>'
                        '<th scope="col">USD</th></tr></thead>'
                        '<tbody>' + '\n'.join(rows) + '</tbody></table></div></section>')
    content = '<main class="page-shell">\n'
    content += '\n'.join(sections)
    content += '\n</main>'
    head = '<link rel="stylesheet" href="' + asset_url('home.css', root=root) + '"/>'
    return render_page('Analog Trace Bench', content, head, 'index.html', root)



def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Fail when the committed index is stale.')
    args = parser.parse_args()
    content = render_index()
    output = ROOT / 'site/index.html'
    if args.check:
        if not output.is_file() or output.read_text() != content:
            raise SystemExit('Index is stale; run python3 tools/build_index.py')
        print('Index is current.')
    else:
        output.write_text(content)
        print('Generated site/index.html')


if __name__ == '__main__':
    main()
