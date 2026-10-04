#!/usr/bin/env python3
"""Retrieve a declared Release asset and atomically install verified bytes."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile
from urllib.parse import unquote, urlsplit
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]


def validate_entry(entry):
    filename = entry['filename']
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]*\.tar\.xz', filename):
        raise ValueError('Invalid evidence filename')
    if not re.fullmatch(r'[0-9a-f]{64}', entry['sha256']):
        raise ValueError('Invalid evidence SHA-256')


def validate_url(url, repository, filename):
    parts = urlsplit(url)
    segments = [unquote(item) for item in parts.path.strip('/').split('/')]
    expected = repository.split('/') + ['releases', 'download']
    if (parts.scheme != 'https' or parts.netloc != 'github.com' or parts.query or parts.fragment
            or len(segments) != 6 or segments[:4] != expected or not segments[4]
            or segments[4] in ('.', '..', 'latest') or '/' in segments[4]
            or segments[5] != filename):
        raise ValueError('Expected an exact GitHub Release asset URL for this repository and filename')


def digest(path):
    result = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            result.update(chunk)
    return result.hexdigest()


def fetch_entry(entry, repository, destination):
    validate_entry(entry)
    destination = Path(destination)
    output = destination / entry['filename']
    if output.is_file() and digest(output) == entry['sha256']:
        return output
    if not entry['url']:
        raise ValueError('Evidence has not been uploaded; record its Release asset URL first: ' + entry['id'])
    validate_url(entry['url'], repository, entry['filename'])
    destination.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=destination, prefix='.download-', delete=False) as target:
            temporary = Path(target.name)
            with urlopen(entry['url'], timeout=60) as source:
                for chunk in iter(lambda: source.read(1024 * 1024), b''):
                    target.write(chunk)
        if digest(temporary) != entry['sha256']:
            raise ValueError('Evidence SHA-256 mismatch; downloaded bytes were not installed')
        os.replace(temporary, output)
        return output
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('run_id', nargs='?')
    parser.add_argument('--list', action='store_true')
    parser.add_argument('--destination', type=Path, default=ROOT / 'evidence')
    args = parser.parse_args()
    manifest = json.loads((ROOT / 'data/evidence.json').read_text())
    if args.list:
        for entry in manifest['runs']:
            print(entry['id'] + ' · ' + ('available' if entry['url'] else 'pending upload') + ' · ' + entry['filename'])
        return
    matches = [entry for entry in manifest['runs'] if entry['id'] == args.run_id]
    if len(matches) != 1:
        parser.error('Supply a known run ID; use --list to inspect entries.')
    try:
        output = fetch_entry(matches[0], manifest['repository'], args.destination)
    except (ValueError, OSError) as error:
        raise SystemExit(str(error)) from error
    print('Verified: ' + str(output))


if __name__ == '__main__':
    main()
