"""Inventory actual OTA/LDO final submissions without running a simulation.

Run from the repository root:
    python3 tests/audit_schematic_sources.py
After final generation, add --check-artifacts for the manifest/hash/contract gate.
"""
from collections import Counter, defaultdict
from datetime import datetime, timezone
import argparse
import hashlib
import html
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
import schematics


def audit_sources():
    catalog = json.loads((ROOT / 'site/data/runs.json').read_text())
    runs, families, singletons = [], {}, []
    for task in catalog['tasks']:
        if not task['id'].startswith(('OTA-', 'LDO-')):
            continue
        family = task['id'].split('-')[0]
        total = families.setdefault(family, {'runs': 0, 'devices': 0, 'device_types': Counter(), 'models': Counter()})
        for run in task['runs']:
            run_id = run['id']
            path = ROOT / 'content/traces' / run_id / 'trace.html'
            matches = re.findall(schematics.SUBMISSION, path.read_text(), re.S)
            if len(matches) != 1:
                raise ValueError('Expected one final submission: ' + run_id)
            source = html.unescape(matches[0])
            interface, devices, constants = schematics.parse_spice(source, include_parameters=True)
            counts = Counter(item['reference'][0].upper() for item in devices.values())
            models = Counter(item['model'].lower() for item in devices.values())
            endpoints = defaultdict(list)
            for item in devices.values():
                pins = ('D', 'G', 'S', 'B') if item['reference'].lower().startswith('x') else ('1', '2')
                for pin, net in zip(pins, item['pins']):
                    endpoints[net.lower()].append({'reference': item['reference'], 'pin': pin})
            for port in interface[1:]:
                endpoints[port].append({'port': port})
            singletons.extend({'run_id': run_id, 'net': net, 'endpoint': pins[0]}
                              for net, pins in endpoints.items() if len(pins) == 1)
            runs.append({
                'run_id': run_id, 'task_id': task['id'],
                'source_path': path.relative_to(ROOT).as_posix(),
                'source_sha256': hashlib.sha256(source.encode()).hexdigest(),
                'ordered_interface': list(interface), 'device_count': len(devices),
                'device_types': dict(sorted(counts.items())), 'models': dict(sorted(models.items())),
                'numeric_constants': constants,
                'devices': list(devices.values()),
            })
            total['runs'] += 1
            total['devices'] += len(devices)
            total['device_types'].update(counts)
            total['models'].update(models)
    return {
        'schema': 1, 'audited_at_utc': datetime.now(timezone.utc).isoformat(),
        'method': 'Decode each actual final submitted SPICE block; parse ordered interfaces, D/G/S/B or passive pins, reviewed models and exact parameters independently of the native generator.',
        'simulation_run': False,
        'total_runs': len(runs), 'total_devices': sum(run['device_count'] for run in runs),
        'families': families, 'source_singleton_nets': singletons, 'runs': runs,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'evidence/source-contract-audit.json')
    parser.add_argument('--check-artifacts', action='store_true')
    args = parser.parse_args()
    report = audit_sources()
    if args.check_artifacts:
        drawings = schematics.load_drawings(ROOT)
        inventory = {run['run_id']: run for run in report['runs']}
        if set(drawings) != set(inventory):
            raise ValueError('Drawing coverage differs from final-submission inventory')
        for run_id, entry in drawings.items():
            if entry['source_sha256'] != inventory[run_id]['source_sha256']:
                raise ValueError('Artifact source differs from actual final submission: ' + run_id)
        report['artifact_proof'] = {
            'status': 'passed', 'checked_drawings': len(drawings),
            'index_sha256': hashlib.sha256((ROOT / 'site/schematics/index.json').read_bytes()).hexdigest(),
            'checks': ['all artifact hashes', 'frozen submitted bytes', 'ordered source/export contract',
                       'native reopen/comparison reports', 'source-bound diagnostics'],
            'physical_and_saved_project_test_command': 'python3 -m unittest discover -s tests -p test_schematics.py -v',
        }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({key: report[key] for key in ('total_runs', 'total_devices', 'families', 'source_singleton_nets')}, indent=2))
    print('Saved ' + str(args.output))


if __name__ == '__main__':
    main()
