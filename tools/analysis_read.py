#!/usr/bin/env python3
"""Read verified original records and stream chunks without executing evidence."""
import argparse
import json
from pathlib import Path
import sys

from atb_analysis_export import AnalysisSnapshot, expand, read


def load_record(snapshot, name):
    manifest = snapshot.load_manifest()
    if name in manifest['streams']:
        return b''.join((snapshot.destination / part).read_bytes()
                        for part in manifest['streams'][name]['parts'])
    if name not in manifest['files']:
        raise ValueError('Choose a recorded file or stream from --list')
    path = snapshot.destination / name
    if path.suffix != '.json':
        return path.read_bytes()
    shared = {}
    for item in manifest['files']:
        if item.startswith('shared/') and item.endswith('.json'):
            shared.update(read(snapshot.destination / item))
    return (json.dumps(expand(read(path), shared), ensure_ascii=False, indent=2) + '\n').encode()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('snapshot', type=Path, help='Unpacked package/analysis directory')
    parser.add_argument('--list', action='store_true')
    parser.add_argument('--file', help='Exact name from the verified manifest')
    args = parser.parse_args()
    snapshot = AnalysisSnapshot(args.snapshot)
    snapshot.verify()
    manifest = snapshot.load_manifest()
    if args.list:
        print('\n'.join(sorted(set(manifest['files']) | set(manifest['streams']))))
    elif args.file:
        sys.stdout.buffer.write(load_record(snapshot, args.file))
    else:
        print(json.dumps(manifest['trials'], ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
