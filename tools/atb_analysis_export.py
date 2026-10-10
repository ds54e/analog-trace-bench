"""Read, verify, and export compact recorded circuit-design evidence.

No controller, solver, model, compaction or participant operation is performed.
Original model text is evidence; no analyst interpretations are added.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import tempfile
from collections import Counter, defaultdict

FILES = ('submission.json', 'published.json', 'hidden.json', 'robustness.json', 'characterization.json',
    'fine.json', 'numerical-policy.json', 'audit.json', 'storage-link-audit.json', 'usage.json',
    'submission-timing.json', 'measurement-timing.json', 'events.jsonl', 'tools.json', 'transcript.jsonl',
    'launch.json', 'exit-evidence.json', 'prompt.json', 'model_final.txt',
    'participant_final_review.md', 'submitted.spice', 'submitted_circuit_manifest.json',
    'request-counts.json', 'visibility_observations.json')
MODEL_TIMING_FILES=('model-timing.jsonl','model-timing.health.json','model-call-timing.json')
FILES += MODEL_TIMING_FILES
CAMPAIGN_EVIDENCE = ('execution-environment.json', 'host-resources.jsonl', 'host-resource-summary.json',
                     'execution-timing.json', 'campaign-events.jsonl', 'storage-timing.jsonl')
SECRET = re.compile(rb'(?:sk-(?:ant-)?[A-Za-z0-9_-]{24,}|'
    rb'gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|'
    rb'Bearer\s+[A-Za-z0-9_.-]{24,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read(path):
    return json.loads(path.read_text())


def encode(value):
    return (json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n').encode()


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()


def factor_records(records):
    """Replace repeated dictionaries by content IDs; preserve every JSON value."""
    counts = Counter()

    def count(value):
        if isinstance(value, dict):
            if set(value) == {'$atb_ref'}:
                raise ValueError('Reserved reference key in source')
            data = canonical(value)
            if len(data) >= 180:
                key = digest(data)
                counts[key] += 1
            for item in value.values():
                count(item)
        elif isinstance(value, list):
            for item in value:
                count(item)


    for value in records.values():
        count(value)
    shared = {}

    def pack(value, allow_ref=True):
        if isinstance(value, dict):
            key = digest(canonical(value))
            if allow_ref and counts[key] > 1:
                if key not in shared:
                    shared[key] = pack(value, False)
                return {'$atb_ref': key}
            return {k: pack(v) for k, v in value.items()}
        if isinstance(value, list):
            return [pack(v) for v in value]
        return value

    packed = {path: pack(value) for path, value in records.items()}
    for path, value in packed.items():
        if canonical(expand(value, shared)) != canonical(records[path]):
            raise ValueError('Round-trip mismatch: ' + path)
    return packed, shared


def expand(value, shared):
    if isinstance(value, dict):
        if set(value) == {'$atb_ref'}:
            return expand(shared[value['$atb_ref']], shared)
        return {k: expand(v, shared) for k, v in value.items()}
    if isinstance(value, list):
        return [expand(v, shared) for v in value]
    return value


class AnalysisSnapshot:
    """Read and verify an exported snapshot without its source campaign."""

    def __init__(self, destination):
        self.destination = Path(destination)

    def load_manifest(self):
        manifest = read(self.destination / 'manifest.json')
        if set(manifest['indexes']) != {'source_files', 'files', 'case_records', 'streams'}:
            raise ValueError('Invalid export indexes')
        for section, indexes in manifest['indexes'].items():
            manifest[section] = {}
            for item in indexes:
                path = self.destination / item['path']
                if path.is_symlink() or not path.resolve().is_relative_to(self.destination.resolve()):
                    raise ValueError('Unsafe index path')
                data = path.read_bytes()
                values = json.loads(data)
                if manifest[section].keys() & values.keys():
                    raise ValueError('Duplicate index entry')
                manifest[section].update(values)
        return manifest


    def verify(self):
        manifest = self.load_manifest()
        if manifest.get('schema_version') != 4:
            raise ValueError('Unsupported analysis schema; rebuild generated data')
        for trial in manifest['trials']:
            if trial['evidence_parts'] != ['evidence']:
                raise ValueError('Nonuniform evidence layout')
            base = trial['run_id'] + '/evidence/'
            queue_name='campaigns/'+trial['evaluation_campaign']+'/queue.json'
            if queue_name not in manifest['files']:raise ValueError('Missing captured evaluation policy')
            queue=read(self.destination/queue_name)
            for name in FILES + ('availability.json', 'requests.json', 'revisions.json'):
                if name in MODEL_TIMING_FILES and not any(r.get('model_seconds') for r in queue.get('runs',[])):
                    continue
                # The field was introduced by fixed-grid-v1. Frozen earlier
                # exports retain their own evidence layout and original hashes.
                if name=='numerical-policy.json' and not queue.get('verification_policy','').endswith('-fixed-grid-v1'):
                    continue
                section = manifest['streams'] if name.endswith('.jsonl') else manifest['files']
                if base + name not in section:
                    raise ValueError('Missing required evidence slot: ' + base + name)
        for name, expected in manifest['files'].items():
            path = self.destination / name
            if path.is_symlink() or not path.resolve().is_relative_to(self.destination.resolve()):
                raise ValueError('Unsafe exported path')
            data = path.read_bytes()
            if len(data) != expected['bytes'] or digest(data) != expected['sha256']:
                raise ValueError('Export hash mismatch: ' + name)
            if SECRET.search(data):
                raise ValueError('Potential credential in export: ' + name)
            if path.suffix == '.json':
                json.loads(data)
            elif path.suffix == '.jsonl':
                for line in data.splitlines():
                    if line.strip():
                        json.loads(line)
        shared = {}
        for name in manifest['files']:
            if name.startswith('shared/') and name.endswith('.json'):
                shared.update(read(self.destination / name))
        for key, value in shared.items():
            if digest(canonical(expand(value, shared))) != key:
                raise ValueError('Shared content identity mismatch: ' + key)
        for path, expected in manifest['case_records'].items():
            if path not in manifest['files']:
                raise ValueError('Case path is not an exported payload')
            original = expand(read(self.destination / path), shared)
            if len(original['records']) != expected['cases']:
                raise ValueError('Case reconstruction mismatch: ' + path)
        for name, stream in manifest['streams'].items():
            if any(part not in manifest['files'] for part in stream['parts']):
                raise ValueError('Stream part is not an exported payload')
            data = b''.join((self.destination / part).read_bytes() for part in stream['parts'])
            if len(data) != stream['bytes']:
                raise ValueError('Stream reconstruction mismatch: ' + name)
        files = [p for p in self.destination.rglob('*') if p.is_file()]
        return dict(trials=len(manifest['trials']), files=len(files),
                             bytes=sum(p.stat().st_size for p in files),
                             largest_file_bytes=max(p.stat().st_size for p in files), verified=True)



if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Verify an unpacked analysis snapshot")
    parser.add_argument("--snapshot", type=Path, required=True)
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    print(json.dumps(AnalysisSnapshot(args.snapshot).verify(), indent=2))
