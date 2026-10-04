#!/usr/bin/env python3
"""Import token usage from hash-verified Release evidence; never execute records."""
import argparse
import hashlib
import json
from pathlib import Path
import tarfile

from atb_analysis_archive import sha, validate_manifest
from atb_analysis_export import AnalysisSnapshot, expand
from site_templates import ROOT
from token_costs import make_cost_record


def verified_usage(entry, root=ROOT):
    package = root / 'evidence' / entry['filename']
    if sha(package) != entry['sha256']:
        raise ValueError('Token source archive hash differs: ' + entry['id'])
    with tarfile.open(package, 'r|xz') as archive:
        first = next(iter(archive))
        if first.name != 'manifest.json' or not first.isfile() or first.size > 16 * 1024 * 1024:
            raise ValueError('Invalid package manifest')
        manifest = json.loads(archive.extractfile(first).read())
    validate_manifest(manifest)
    folder = root / 'evidence/unpacked' / entry['id'] / 'analysis'

    def verified(name):
        path = folder / name
        if path.is_symlink() or not path.resolve().is_relative_to(folder.resolve()):
            raise ValueError('Unsafe token source path')
        data = path.read_bytes()
        expected = manifest['files']['analysis/' + name]
        if len(data) != expected['bytes'] or hashlib.sha256(data).hexdigest() != expected['sha256']:
            raise ValueError('Token source file hash differs: ' + name)
        return json.loads(data)

    definition = verified('manifest.json')
    if manifest['manifest_sha256'] != entry['analysis_manifest_sha256']:
        raise ValueError('Analysis source identity differs')
    for indexes in definition['indexes'].values():
        for index in indexes:
            verified(index['path'])
    snapshot = AnalysisSnapshot(folder).load_manifest()
    trials = snapshot['trials']
    if (len(trials) != 1 or trials[0]['run_id'] != entry['slot'] or
            trials[0]['participant_campaign'] != entry['attempt_id'] or
            trials[0]['configuration'] != entry['configuration']):
        raise ValueError('Token source trial identity differs')
    shared = {}
    for name in snapshot['files']:
        if name.startswith('shared/') and name.endswith('.json'):
            shared.update(verified(name))
    name = entry['slot'] + '/evidence/usage.json'
    usage = expand(verified(name), shared)
    source = {
        'archive_sha256': entry['sha256'], 'analysis_manifest_sha256': entry['analysis_manifest_sha256'],
        'usage_path': name, 'usage_sha256': manifest['files']['analysis/' + name]['sha256'],
        'expanded_usage_sha256': hashlib.sha256(
            json.dumps(usage, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest(),
        'observations_sha256': usage['source_sha256'],
    }
    return usage, source


def import_costs(root=ROOT):
    entries = json.loads((root / 'data/evidence.json').read_text())['runs']
    pricing = json.loads((root / 'data/token-pricing.json').read_text())
    records = []
    for entry in entries:
        usage, source = verified_usage(entry, root)
        records.append({**make_cost_record(entry, usage, pricing), 'source': source})
    return {'schema_version': 1, 'currency': 'USD', 'pricing': pricing, 'runs': records}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Source-verify committed usage and costs without writing.')
    args = parser.parse_args()
    data = import_costs()
    target = ROOT / 'site/data/token-costs.json'
    if args.check:
        if json.loads(target.read_text()) != data:
            raise SystemExit('Token usage/cost data differs from evidence; run tools/import_token_costs.py')
    else:
        target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(f'{"Source-verified" if args.check else "Imported"} token usage and costs for {len(data["runs"])} runs.')


if __name__ == '__main__':
    main()
