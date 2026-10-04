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

from build_index import render_index
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
        self.tabs = []
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
        if values.get('role') == 'tab':
            self.tabs.append(values)
        if tag == 'pre':
            self.code_boxes.append(values)
        self.details += tag == 'details'


def check_links(site):
    site = site.resolve()
    documents = {path: Document(path.read_text()) for path in site.rglob('*.html')}
    for path, document in documents.items():
        require(len(document.ids) == len(set(document.ids)), f'Duplicate DOM IDs: {path}')
        for tab in document.tabs:
            require(tab.get('aria-controls') in document.ids, f'Broken tab target: {path}')
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


def check_trace(path, expected, document):
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
    saved = re.findall(r'<script type="application/json" id="independent-evaluation-data">(.*?)</script>', text, re.S)
    require(len(saved) == 1, f'Missing independent evaluation: {path.name}')
    reports = json.loads(saved[0])
    for stage, count in expected['evaluation_row_counts'].items():
        report = reports[stage]
        require(len(report['rows']) == count, f'Evaluation row count differs: {path.name} {stage}')
        require(dict(Counter(row['verdict'] for row in report['rows'])) == report['counts'],
                f'Evaluation verdict count differs: {path.name} {stage}')
        require(all(row['revision'] == expected['revision'] for row in report['rows']),
                f'Evaluation revision differs: {path.name} {stage}')
    require(len(re.findall(r'<tr data-metric=', text)) == expected['evaluation_categories'],
            f'Evaluation category count differs: {path.name}')
    require(text.index('data-submission="final"') < text.index('data-evaluation="independent"'),
            f'Final section order differs: {path.name}')
    require(not document.details, f'Unexpected folding controls: {path.name}')
    require(all(box.get('tabindex') == '0' for box in document.code_boxes),
            f'Code box cannot receive keyboard focus: {path.name}')
    require('.turn-group::before' in text and re.search(r'--trace-rail-width:\s*4px', text),
            f'Trace rail missing: {path.name}')
    require(re.search(r'scrollbar-width:\s*none', text), f'Hidden-scrollbar rule missing: {path.name}')


def check(root=ROOT):
    site = root / 'site'
    require((site / 'index.html').read_text() == render_index(root), 'Index is stale; run tools/build_index.py')
    documents = check_links(site)
    manifest = json.loads((root / 'data/evidence.json').read_text())
    for entry in manifest['runs']:
        validate_entry(entry)
        if entry['url']:
            validate_url(entry['url'], manifest['repository'], entry['filename'])
    profiles = json.loads((root / 'data/trace-validation.json').read_text())['traces']
    require(len({profile['id'] for profile in profiles}) == len(profiles), 'Duplicate validation IDs')
    catalog = json.loads((site / 'data/runs.json').read_text())
    runs = {run['id']: run for task in catalog['tasks'] for run in task['runs']}
    require(set(runs) == {profile['id'] for profile in profiles} == {entry['id'] for entry in manifest['runs']},
            'Catalog, evidence and validation run IDs differ')
    for profile in profiles:
        require(profile['page'] == runs[profile['id']]['trace'], 'Catalog and validation paths differ')
        path = (site / profile['page']).resolve()
        require(path in documents, 'Trace page is missing')
        check_trace(path, profile, documents[path])
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
