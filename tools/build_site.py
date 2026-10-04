#!/usr/bin/env python3
"""Build the static website; rendering requires only Python's standard library."""
import argparse
from pathlib import Path
import shutil

from build_index import render_index
from build_traces import rendered_traces
from site_templates import ROOT


def generated_pages(root=ROOT):
    return {'index.html': render_index(root), 'tasks.html': render_index(root, view='task'),
            **rendered_traces(root)}


def build(root=ROOT, output=None, check=False):
    root = Path(root).resolve()
    site = root / 'site'
    output = Path(output).resolve() if output else site
    if output != site and output.is_relative_to(site):
        raise ValueError('Export directory must be outside site/')
    pages = generated_pages(root)
    if check:
        for name, content in pages.items():
            path = output / name
            if not path.is_file() or path.read_text(encoding='utf-8') != content:
                raise ValueError('Generated page is stale: ' + name + '; run python3 tools/build_site.py')
        expected = {Path(name) for name in pages if name.startswith('traces/')}
        actual = {path.relative_to(output) for path in (output / 'traces').glob('*.html')}
        if expected != actual:
            raise ValueError('Unexpected generated trace pages; run python3 tools/build_site.py')
        return len(pages)
    if output != site.resolve():
        # An export includes dependencies so it can be reviewed as a complete site.
        for source in site.rglob('*'):
            if source.is_file() and source.suffix != '.html':
                target = output / source.relative_to(site)
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source, target)
    for name, content in pages.items():
        path = output / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding='utf-8')
    expected = {Path(name) for name in pages if name.startswith('traces/')}
    for path in (output / 'traces').glob('*.html'):
        if path.relative_to(output) not in expected:
            path.unlink()
    return len(pages)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Check deterministic output without writing.')
    parser.add_argument('--output', type=Path, help='Export a complete site to another directory.')
    args = parser.parse_args()
    try:
        count = build(output=args.output, check=args.check)
    except (ValueError, OSError, KeyError) as error:
        raise SystemExit(str(error)) from error
    print(f'{"Checked" if args.check else "Built"} {count} static pages.')


if __name__ == '__main__':
    main()
