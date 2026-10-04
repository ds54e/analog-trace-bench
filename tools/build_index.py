#!/usr/bin/env python3
"""Generate the static index from the committed run and evidence catalogs."""
import argparse
import html
import json
from pathlib import Path

from fetch_evidence import validate_entry, validate_url
from site_templates import asset_url, render_page

ROOT = Path(__file__).resolve().parents[1]


def render_index(root=ROOT):
    catalog = json.loads((root / 'site/data/runs.json').read_text())
    entries = json.loads((root / 'data/evidence.json').read_text())
    evidence = {entry['id']: entry for entry in entries['runs']}
    if len(evidence) != len(entries['runs']):
        raise ValueError('Duplicate evidence run IDs')
    sections = []
    seen = set()
    for task in catalog['tasks']:
        rows = []
        for run in task['runs']:
            if run['id'] in seen:
                raise ValueError('Duplicate catalog run ID: ' + run['id'])
            seen.add(run['id'])
            entry = evidence[run['id']]
            validate_entry(entry)
            if (entry['task'], entry['model'], entry['run']) != (task['id'], run['model'], run['run']):
                raise ValueError('Catalog and evidence identity disagree: ' + run['id'])
            url = entry['url']
            if url:
                validate_url(url, entries['repository'], entry['filename'])
                source = '<a href="' + html.escape(url, quote=True) + '">Download</a>'
            else:
                source = '<span class="unavailable">Not available yet</span>'
            trace = ('<a href="' + html.escape(run['trace'], quote=True) + '">Read trace</a>'
                     if run.get('trace') else '<span class="unavailable">Archive available</span>')
            outcome = html.escape(entry.get('electrical_status', 'Not recorded'))
            seconds = entry.get('design_model_calls_s')
            minutes = f'{seconds / 60:.1f}' if seconds is not None else 'Unknown'
            rows.append('<tr><td>' + html.escape(run['model']) + '</td><td>' + str(run['run']) +
                        '</td><td>' + outcome + '</td><td>' + minutes + '</td><td>' + trace +
                        '</td><td>' + source + '</td></tr>')
        sections.append('<section><h2>' + html.escape(task['id']) + '</h2><div class="table-wrap" tabindex="0">'
                        '<table><thead><tr><th scope="col">Model</th><th scope="col">Run</th>'
                        '<th scope="col">Evaluation</th><th scope="col">AI time (min)</th>'
                        '<th scope="col">Design trace</th><th scope="col">Evidence</th></tr></thead>'
                        '<tbody>' + '\n'.join(rows) + '</tbody></table></div></section>')
    content = '<main>\n'
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
