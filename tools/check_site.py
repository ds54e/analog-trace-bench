#!/usr/bin/env python3
"""Offline site/link checks and source-derived trace invariants."""
from collections import Counter
import hashlib
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit

from build_site import build as check_build
from build_traces import trace_paths
from fetch_evidence import validate_entry, validate_url

ROOT = Path(__file__).resolve().parents[1]


def require(condition, message):
    if not condition:
        raise ValueError(message)


class Document(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.ids = []
        self.links = []
        self.articles = []
        self.run_links = []
        self.code_boxes = []
        self.details = 0
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if 'id' in values:
            self.ids.append(values['id'])
        if tag in ('a', 'link', 'img', 'script'):
            field = 'href' if tag in ('a', 'link') else 'src'
            if values.get(field):
                self.links.append(values[field])
        if tag == 'article':
            self.articles.append(values)
        if 'run-tab' in values.get('class', '').split():
            self.run_links.append(values)
        if tag == 'pre':
            self.code_boxes.append(values)
        self.details += tag == 'details'


def check_links(site):
    site = site.resolve()
    documents = {path: Document(path.read_text()) for path in site.rglob('*.html')}
    for path, document in documents.items():
        require(len(document.ids) == len(set(document.ids)), f'Duplicate DOM IDs: {path}')
        for href in document.links:
            url = urlsplit(href)
            if url.scheme or url.netloc:
                require(url.scheme in ('https', 'http', 'mailto'), f'Unsupported link: {href}')
                continue
            require(not url.path.startswith('/'), f'Root-relative link breaks project-site hosting: {href}')
            target = (path.parent / unquote(url.path)).resolve() if url.path else path
            if target.is_dir():
                target /= 'index.html'
            require(target.is_relative_to(site), f'Link escapes deployed site: {href}')
            require(target.is_file(), f'Broken local link in {path.name}: {href}')
            if url.fragment:
                linked = documents.get(target)
                require(linked is not None and unquote(url.fragment) in linked.ids,
                        f'Broken fragment in {path.name}: {href}')
    return documents


def check_run_navigation(run, peers, document):
    """Reject a selector that opens another recorded run or mislabels the current one."""
    available = {peer['run']: peer for peer in peers if peer.get('trace')}
    selectors = document.run_links
    numbers = [str(number) for number in range(1, max(3, run['run'], *available.keys()) + 1)]
    require([link.get('data-run') for link in selectors] == numbers,
            'Run selector coverage differs: ' + run['id'])
    current = [link.get('data-run') for link in selectors if link.get('aria-current') == 'page']
    require(current == [str(run['run'])], 'Current run differs: ' + run['id'])
    for link in selectors:
        number = int(link['data-run'])
        if number == run['run']:
            href = f'#run-panel-{number}'
        elif number in available:
            href = Path(available[number]['trace']).name
        else:
            require(not link.get('href') and link.get('aria-disabled') == 'true',
                    'Unavailable run is selectable: ' + run['id'])
            continue
        require(link.get('href') == href and link.get('aria-disabled') != 'true',
                'Run selector link differs: ' + run['id'])


def check_trace(path, expected, document, root=ROOT):
    text = path.read_text()
    articles = document.articles
    actual = Counter(entry.get('data-kind') for entry in articles)
    for kind, count in expected['counts'].items():
        require(actual[kind] == count, f'Trace count differs: {path.name} {kind}')
    actions = [entry.get('data-tool-id') for entry in articles if entry.get('data-kind') == 'ACTION']
    results = [entry.get('data-tool-id') for entry in articles if entry.get('data-kind') == 'RESULT']
    require(all(actions) and len(set(actions)) == len(actions), f'Invalid action IDs: {path.name}')
    require(len(set(results)) == len(results) and set(results) <= set(actions), f'Invalid result IDs: {path.name}')
    require(len(re.findall(r'<template class="model-source">', text)) == actual['MODEL'],
            f'Missing MODEL source template: {path.name}')
    spices = re.findall(r'<pre data-field="submitted-spice"[^>]*><code>(.*?)</code></pre>', text, re.S)
    require(len(spices) == 1, f'Missing final SPICE: {path.name}')
    spice = html.unescape(spices[0]).encode('utf-8')
    require(len(spice) == expected['submitted_spice_bytes'] and
            hashlib.sha256(spice).hexdigest() == expected['submitted_spice_sha256'],
            f'Submitted SPICE differs: {path.name}')
    content, report_path = trace_paths(expected['id'], root)
    for name, digest in expected['content_sha256'].items():
        require(hashlib.sha256((content / name).read_bytes()).hexdigest() == digest,
                f'Recorded content differs: {path.name} {name}')
    require(hashlib.sha256(report_path.read_bytes()).hexdigest() == expected['evaluation_sha256'],
            f'Independent evaluation source differs: {path.name}')
    reports = json.loads(report_path.read_text(encoding='utf-8'))
    require('../data/evaluations/' + report_path.name in document.links,
            f'Missing independent evaluation link: {path.name}')
    for stage, count in expected['evaluation_row_counts'].items():
        report = reports[stage]
        require(len(report['rows']) == count, f'Evaluation row count differs: {path.name} {stage}')
        require(dict(Counter(row['verdict'] for row in report['rows'])) == report['counts'],
                f'Evaluation verdict count differs: {path.name} {stage}')
        if stage == 'robustness':
            # This campaign's aggregate row has no revision. Import verification
            # matches every native sample's variant, sizing and circuit hash;
            # retain those identities in the offline validation profile.
            proofs = expected['source_verification']['robustness_sample_circuits']
            require(len(proofs) == len(report['samples']) == report['robustness']['attempted'],
                    f'Robustness sample coverage differs: {path.name}')
            require(all(proof['revision'] == expected['revision'] and
                        proof['spice_sha256'] == expected['submitted_spice_sha256'] for proof in proofs),
                    f'Robustness circuit identity differs: {path.name}')
            require(all(row['metric'] == 'mismatch_pass_count_min' for row in report['rows']),
                    f'Unexpected revisionless aggregate: {path.name}')
        else:
            require(all(row['revision'] == expected['revision'] for row in report['rows']),
                    f'Evaluation revision differs: {path.name} {stage}')
    require(len(re.findall(r'<tr data-metric=', text)) == expected['evaluation_categories'],
            f'Evaluation category count differs: {path.name}')
    require(text.index('data-submission="final"') < text.index('data-evaluation="independent"'),
            f'Final section order differs: {path.name}')
    require(not document.details, f'Unexpected folding controls: {path.name}')
    require(all(box.get('tabindex') == '0' for box in document.code_boxes),
            f'Code box cannot receive keyboard focus: {path.name}')
    css = (root / 'site/assets/site.css').read_text(encoding='utf-8') + \
          (root / 'site/assets/trace.css').read_text(encoding='utf-8')
    require('.turn-group::before' in css and re.search(r'--trace-rail-width:\s*4px', css),
            f'Trace rail missing: {path.name}')
    require(re.search(r'scrollbar-width:\s*none', css), f'Hidden-scrollbar rule missing: {path.name}')
    require(not re.search(r'<style\b|<script\s*>', text), f'Duplicated presentation code: {path.name}')


def check(root=ROOT):
    site = root / 'site'
    check_build(root, check=True)
    documents = check_links(site)
    manifest = json.loads((root / 'data/evidence.json').read_text())
    for entry in manifest['runs']:
        validate_entry(entry)
        if entry['url']:
            validate_url(entry['url'], manifest['repository'], entry['filename'])
    checked_definitions = set()
    for entry in manifest['runs']:
        if not entry.get('task_definition'):
            continue
        folder = (root / entry['task_definition']).resolve()
        require(folder.is_relative_to((root / 'data/tasks').resolve()), 'Task definition escapes public data')
        definition = json.loads((folder / 'manifest.json').read_text())
        require(definition['task_id'] == entry['task'], 'Task definition identity differs')
        if folder in checked_definitions:
            continue
        for name, expected in definition['files'].items():
            path = folder / name
            require(not path.is_symlink() and path.resolve().is_relative_to(folder), 'Unsafe task definition file')
            data = path.read_bytes()
            require(len(data) == expected['bytes'] and hashlib.sha256(data).hexdigest() == expected['sha256'],
                    'Captured task definition differs: ' + name)
        inventory = json.dumps(definition['files'], sort_keys=True, separators=(',', ':')).encode()
        require(hashlib.sha256(inventory).hexdigest() == definition['definition_sha256'], 'Task inventory differs')
        checked_definitions.add(folder)
    profiles = json.loads((root / 'data/trace-validation.json').read_text())['traces']
    require(len({profile['id'] for profile in profiles}) == len(profiles), 'Duplicate validation IDs')
    catalog = json.loads((site / 'data/runs.json').read_text())
    for task in catalog['tasks']:
        for run in task['runs']:
            if run.get('trace'):
                peers = [peer for peer in task['runs'] if peer['model'] == run['model']]
                check_run_navigation(run, peers, documents[(site / run['trace']).resolve()])
    runs = {run['id']: run for task in catalog['tasks'] for run in task['runs']}
    require(len(runs) == sum(len(task['runs']) for task in catalog['tasks']), 'Duplicate catalog run IDs')
    require(set(runs) == {entry['id'] for entry in manifest['runs']}, 'Catalog and evidence run IDs differ')
    require({run['id'] for run in runs.values() if run.get('trace')} == {profile['id'] for profile in profiles},
            'Rendered traces and validation run IDs differ')
    for profile in profiles:
        require(profile['page'] == runs[profile['id']]['trace'], 'Catalog and validation paths differ')
        path = (site / profile['page']).resolve()
        require(path in documents, 'Trace page is missing')
        check_trace(path, profile, documents[path], root)
    for path in site.rglob('*'):
        require(not path.is_symlink(), 'Pages files must not be symlinks')
        require(not path.name.endswith(('.xz', '.zip', '.tar', '.tar.gz', '.tar.zst')),
                'Raw archive must not enter the Pages artifact')
    return len(documents), len(profiles)


if __name__ == '__main__':
    try:
        documents, traces = check()
    except (ValueError, KeyError, OSError) as error:
        raise SystemExit(str(error)) from error
    print(f'Validated {documents} HTML pages and {traces} recorded traces; no network or simulation used.')
