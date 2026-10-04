#!/usr/bin/env python3
"""Portable example for the saved Sonnet OTA fixture. See docs/TRACE_GUIDE.md."""
import argparse
from pathlib import Path
import gzip
import hashlib
import html
import json
import re
import sys
import tarfile

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
import build_astra_page as shared

parser = argparse.ArgumentParser(description='Rebuild the saved Sonnet 5.5 OTA fixture; not a general importer.')
parser.add_argument('source', type=Path)
parser.add_argument('--output', type=Path, help='Write a diagnostic page instead of importing website content.')
arguments = parser.parse_args()
SOURCE = arguments.source
OUTPUT = arguments.output
PREFIX = 'analysis/sonnet-01/evidence/'

with tarfile.open(SOURCE) as archive:
    def read(name):
        return json.load(archive.extractfile(PREFIX + name))
    transcript, events = [], []
    for member in sorted(archive.getmembers(), key=lambda item: item.name):
        if not member.isfile():
            continue
        target = (transcript if member.name.startswith(PREFIX + 'transcript/') else
                  events if member.name.startswith(PREFIX + 'events/') else None)
        if target is not None:
            target.extend(json.loads(line) for line in archive.extractfile(member).read().splitlines() if line.strip())
    submitted = archive.extractfile(PREFIX + 'submitted.spice').read()
    evidence = shared.Evidence(
        read('tools.json'), read('launch.json')['configuration'], read('submission.json'),
        submitted.decode('utf-8'), read('measurement-timing.json'), read('submission-timing.json'),
        read('model-call-timing.json'), read('published.json'), read('hidden.json'), transcript, events,
    )

assert evidence.submitted_spice == evidence.submission['design']['netlist']
timing = shared.calculate_timing(evidence)
tool_map = {tool['tool_call_id']: tool for tool in evidence.tools}
models = [dict(id=row['uuid'] + '-' + str(index), text=block['text'], timestamp=row['timestamp'])
          for row in transcript if row['type'] == 'assistant'
          for index, block in enumerate(row['message']['content']) if block['type'] == 'text']
rendered = shared.render_model_markdown(models)
model_ids = iter(model['id'] for model in models)


def action_body(tool):
    fields = tool['input']
    pieces = []
    if fields.get('description'):
        pieces.append('<div class="raw-field"><p class="action-description" data-field="description">' +
                      shared.escape(fields['description']) + '</p></div>')
    for name in ['command', 'file_path', 'path', 'content']:
        if name in fields:
            label = '<div class="raw-field-label">content</div>' if name == 'content' else ''
            pieces.append('<div class="raw-field">' + label + shared.codebox(fields[name], name) + '</div>')
    options = {key: value for key, value in fields.items()
               if key not in {'command', 'file_path', 'path', 'content', 'description', 'timeout'}}
    if options:
        pieces.append('<div class="raw-field">' +
                      shared.codebox(json.dumps(options, indent=2, ensure_ascii=False), 'options') + '</div>')
    return ''.join(pieces)


def tool_label(tool):
    path = tool['input'].get('file_path', tool['input'].get('path'))
    return tool['name'] + (' · ' + Path(path).name if path else '')


# Ignore stream fragments and transport notifications; complete text and tool
# messages retain their original order, including asynchronous result delivery.
groups, current = [], []
last_kind = None
expected_models, expected_results, expected_commands = [], [], []
action_ids, result_ids = [], []
read_prefixes_removed = 0
for row in transcript:
    if row['type'] not in ('assistant', 'user'):
        continue
    content = row.get('message', {}).get('content', [])
    if not isinstance(content, list):
        continue
    for block in content:
        if row['type'] == 'assistant' and block['type'] == 'text':
            if current:
                groups.append(current)
                current = []
            model_id = next(model_ids)
            markup = rendered[model_id]
            markup = re.sub(r'<table>(.*?)</table>',
                            r'<div class="ai-table-wrap"><table class="ai-table">\1</table></div>', markup, flags=re.S)
            body = '<div class="ai-text raw-model">' + markup + '</div>'
            body += '<template class="model-source">' + shared.escape(block['text']) + '</template>'
            current.append(shared.render_article('MODEL', '', body, timing.start, row['timestamp']))
            expected_models.append(block['text'])
            last_kind = 'MODEL'
        elif row['type'] == 'assistant' and block['type'] == 'tool_use':
            tool = tool_map[block['id']]
            assert tool['input'] == block['input'] and tool['name'] == block['name']
            if current and last_kind != 'MODEL':
                groups.append(current)
                current = []
            current.append(shared.render_article('ACTION', block['id'], action_body(tool),
                           timing.start, tool['start'], tool_label(tool)))
            action_ids.append(block['id'])
            if tool['name'] == 'Bash':
                expected_commands.append(tool['input']['command'])
            last_kind = 'ACTION'
        elif row['type'] == 'user' and block['type'] == 'tool_result' and block['tool_use_id'] in tool_map:
            tool = tool_map[block['tool_use_id']]
            assert block['content'] == tool['result']
            output = tool['result']
            if tool['name'] == 'Read':
                output, removed = re.subn(r'(?m)^[ \t]*\d+\t', '', output)
                read_prefixes_removed += removed
            assert output.strip()
            current.append(shared.render_article('RESULT', tool['tool_call_id'], shared.codebox(output, ''),
                           timing.start, tool['end'], tool_label(tool)))
            expected_results.append(output)
            result_ids.append(tool['tool_call_id'])
            last_kind = 'RESULT'
if current:
    groups.append(current)
assert len(action_ids) == len(result_ids) == len(tool_map) == 83
assert set(action_ids) == set(result_ids) == set(tool_map)
assert len(expected_models) == 12
trace = '\n'.join(f'<div class="turn-group" data-turn="{index}">\n' +
                  '\n'.join(group) + '\n</div>' for index, group in enumerate(groups, 1))
trace += '\n' + shared.render_submission(evidence.submitted_spice)
trace += '\n' + shared.render_evaluation(evidence, timing)

summary = shared.render_summary(evidence, timing)
values = {
    'Architecture': ('Architecture', 'Single-stage OTA · complementary NMOS / PMOS input · folded cascode'),
    'Output stage': ('Output stage', 'Folded-cascode output · wide-swing cascoded NMOS current mirror'),
    'Compensation': ('Compensation', 'Load-dominant pole · CL = 2–5 pF'),
    'Input network': ('Biasing', 'Replica-device cascode bias · 12.9 kΩ PMOS / 25.8 kΩ NMOS source resistors'),
}
for label, (new_label, value) in values.items():
    summary, count = re.subn(r'<th>' + re.escape(label) + r'</th><td>.*?</td>',
                            '<th>' + shared.escape(new_label) + '</th><td>' + shared.escape(value) + '</td>',
                            summary, count=1, flags=re.S)
    assert count == 1
page = shared.render_trace_page('OTA-WIDE-SKY130', 'Sonnet 5.5', summary, trace)

# Compare displayed payloads with the exact source, applying only the approved
# removal of Read's line-number prefixes.
checked_trace = shared.Trace(trace, expected_models, expected_commands, expected_results, 83, 83, len(groups))
shared.validate_page(page, evidence, checked_trace)
for tool in evidence.tools:
    article = next(match for match in re.findall(r'<article[^>]*data-kind="ACTION"[^>]*>.*?</article>', page, re.S)
                   if 'data-tool-id="' + tool['tool_call_id'] + '"' in match)
    for key, value in tool['input'].items():
        if key == 'timeout':
            continue
        if key in {'command', 'file_path', 'path', 'content'}:
            actual = html.unescape(re.search(r'<pre data-field="' + key + r'"[^>]*><code>(.*?)</code></pre>', article, re.S)[1])
            assert actual == value
        elif key == 'description':
            actual = html.unescape(re.search(r'<p[^>]*data-field="description"[^>]*>(.*?)</p>', article, re.S)[1])
            assert actual == value
        else:
            actual = json.loads(html.unescape(re.search(r'<pre data-field="options"[^>]*><code>(.*?)</code></pre>', article, re.S)[1]))
            assert actual[key] == value
assert 'Statement timestamp is not recorded' not in page
assert 'raw-trace-note' not in page and 'evaluation-summary' not in page
if OUTPUT:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(page, encoding='utf-8')
else:
    shared.write_run_sources('ota-wide-sky130-sonnet-5-5-r1', summary, trace)
    shared.build_site()
    OUTPUT = ROOT.parents[1] / 'site/traces/ota-wide-sky130-sonnet-5-5-raw.html'
print(json.dumps({
    'output': str(OUTPUT), 'html_bytes': OUTPUT.stat().st_size,
    'gzip_bytes': len(gzip.compress(OUTPUT.read_bytes(), mtime=0)),
    'models': len(expected_models), 'actions': len(action_ids), 'results': len(result_ids),
    'read_line_number_prefixes_removed': read_prefixes_removed, 'groups': len(groups),
    'wall_s': timing.wall_s, 'model_s': timing.model_s, 'measurement_s': timing.measurement_s,
    'overlap_s': timing.overlap_s, 'outside_s': timing.outside_s,
    'submitted_spice_bytes': len(submitted), 'submitted_spice_sha256': hashlib.sha256(submitted).hexdigest(),
    'independent_evaluation_metrics': 657, 'payloads_verified': True,
}, ensure_ascii=False))
