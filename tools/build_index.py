#!/usr/bin/env python3
"""Generate the static index from the committed run and evidence catalogs."""
import argparse
import html
import json
from pathlib import Path

from fetch_evidence import validate_entry, validate_url
from site_templates import asset_url, evaluation_label, format_duration, render_page
from token_costs import format_token_cost, load_token_costs

ROOT = Path(__file__).resolve().parents[1]


def run_values(runs, formatter):
    values = []
    for run in runs:
        number = run['run']
        label = f'<span class="run-label">Run {number}</span> ' if len(runs) > 1 else ''
        values.append(f'<span class="run-value" data-run="{number}" title="Run {number}">' +
                      label + formatter(run) + '</span>')
    return ' · '.join(values)


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
        rows = []
        for model, trials in groups.items():
            trials = sorted(trials, key=lambda run: run['run'])
            if len({run['run'] for run in trials}) != len(trials):
                raise ValueError('Duplicate model/run identity: ' + model)
            def outcome(run):
                return html.escape(evaluation_label(evidence[run['id']].get('electrical_status', 'Not recorded')))
            def duration(run):
                seconds = evidence[run['id']].get('design_model_calls_s')
                return format_duration(seconds) if seconds is not None else 'Not recorded'
            def trace(run):
                return ('<a href="' + html.escape(run['trace'], quote=True) + '">Read trace</a>'
                        if run.get('trace') else '<span class="unavailable">Not available yet</span>')
            def source(run):
                url = evidence[run['id']]['url']
                return ('<a href="' + html.escape(url, quote=True) + '">Download</a>'
                        if url else '<span class="unavailable">Not available yet</span>')
            cells = [run_values(trials, formatter) for formatter in (
                outcome, duration, lambda run: format_token_cost(costs[run['id']]), trace, source)]
            rows.append('<tr><th scope="row">' + html.escape(model) + '</th>' +
                        ''.join('<td>' + cell + '</td>' for cell in cells) + '</tr>')
        task_id = html.escape(task['id'], quote=True)
        sections.append('<section class="task-section" aria-labelledby="' + task_id + '">'
                        '<h2 class="task-heading" id="' + task_id + '">' + task_id + '</h2>'
                        '<p class="task-description">' + html.escape(task['description']) + '</p>'
                        '<div class="table-scroll" tabindex="0" role="region" aria-labelledby="' + task_id + '">'
                        '<table class="summary-table results-table"><thead><tr><th scope="col">AI model</th>'
                        '<th scope="col">Evaluation result</th><th scope="col">Model-call time</th>'
                        '<th scope="col">Total token cost</th>'
                        '<th scope="col">Design trace</th><th scope="col">Evidence archive</th></tr></thead>'
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
