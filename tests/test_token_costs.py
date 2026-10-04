from copy import deepcopy
from decimal import Decimal
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import atb_analysis_archive
import atb_analysis_export
import build_index
import import_token_costs
import token_costs


PRICING = {'models': {'gpt-6-astra': {'usd_per_million':
           {'input': '10', 'cache_read': '1', 'cache_write': '12.5', 'output': '50'}}}}
ENTRY = {'id': 'run-1', 'configuration': {'model': 'gpt-6-astra'}}


def usage():
    return {'expected_model_id': 'gpt-6-astra', 'model_identity_status': 'NOT_EXPOSED',
            'normalized': {'input_tokens': 2_000_000, 'cache_read_tokens': 1_000_000,
                           'cache_write_tokens': 0, 'output_tokens': 100_000, 'reasoning_tokens': 50_000,
                           'input_semantics': 'input includes cached input',
                           'output_semantics': 'provider output; do not add reasoning again'},
            'final_total_reconciliation': {'input': {'equal': True}}, 'raw_final_usage': []}


class TokenCostTests(unittest.TestCase):
    def test_cached_input_and_reasoning_are_not_double_charged(self):
        record = token_costs.make_cost_record(ENTRY, usage(), PRICING)
        self.assertEqual(record['uncached_input_tokens'], 1_000_000)
        self.assertEqual(Decimal(record['total_cost_usd']), Decimal('16'))
        self.assertEqual(token_costs.format_token_cost(record), '$16.00')

    def test_cumulative_run_tokens_do_not_trigger_long_context_pricing(self):
        value = usage()
        value['normalized']['input_tokens'] = 20_000_000
        value['normalized']['cache_read_tokens'] = 19_000_000
        record = token_costs.make_cost_record(ENTRY, value, PRICING)
        self.assertEqual(Decimal(record['total_cost_usd']), Decimal('34'))
        self.assertEqual(record['cost_basis'], 'list_price_calculation')

    def test_provider_total_is_preserved_and_not_summed_with_duplicate_observations(self):
        value = usage()
        value['normalized']['input_semantics'] = 'uncached input excludes cache read/write'
        value['normalized']['input_tokens'] = 24
        value['normalized']['cache_write_tokens'] = 89_864
        value['raw_final_usage'] = [{'cost_usd': '2.0084728'}, {'cost_usd': '2.0084728'}]
        record = token_costs.make_cost_record(ENTRY, value, {'models': {}})
        self.assertEqual(record['uncached_input_tokens'], 24)
        self.assertEqual(record['total_cost_usd'], '2.0084728')
        self.assertEqual(token_costs.format_token_cost(record), '$2.01')

    def test_list_price_total_keeps_reported_cost_as_separate_evidence(self):
        value = usage()
        value['raw_final_usage'] = [{'cost_usd': '99.5'}]
        record = token_costs.make_cost_record(ENTRY, value, PRICING)
        self.assertEqual(Decimal(record['total_cost_usd']), Decimal('16'))
        self.assertEqual(record['reported_cost_usd'], '99.5')

    def test_cache_write_durations_use_their_own_rates(self):
        value = usage()
        value['normalized'].update(input_semantics='uncached input excludes cache read/write',
                                   cache_write_tokens=300_000, cache_write_ttl_tokens={
                                       'ephemeral_5m_input_tokens': 100_000,
                                       'ephemeral_1h_input_tokens': 200_000})
        pricing = deepcopy(PRICING)
        pricing['models']['gpt-6-astra']['usd_per_million']['cache_write_1h'] = '20'
        record = token_costs.make_cost_record(ENTRY, value, pricing)
        self.assertEqual(Decimal(record['total_cost_usd']), Decimal('31.25'))
        value['normalized']['cache_write_ttl_tokens']['ephemeral_1h_input_tokens'] -= 1
        with self.assertRaisesRegex(ValueError, 'durations do not reconcile'):
            token_costs.make_cost_record(ENTRY, value, pricing)

    def test_missing_usage_is_unknown_but_recorded_zero_is_zero(self):
        value = usage()
        value['normalized']['cache_read_tokens'] = None
        self.assertIsNone(token_costs.make_cost_record(ENTRY, value, PRICING)['total_cost_usd'])
        value = usage()
        for key in token_costs.TOKEN_FIELDS:
            value['normalized'][key] = 0
        value['normalized']['reasoning_tokens'] = None
        self.assertEqual(Decimal(token_costs.make_cost_record(ENTRY, value, PRICING)['total_cost_usd']), 0)

    def test_invalid_usage_and_ambiguous_totals_are_rejected(self):
        mutations = [lambda v: v['normalized'].update(input_tokens=-1),
                     lambda v: v['normalized'].update(cache_read_tokens=3_000_000),
                     lambda v: v['normalized'].update(reasoning_tokens=200_000),
                     lambda v: v['normalized'].update(input_semantics='unknown'),
                     lambda v: v['final_total_reconciliation']['input'].update(equal=False),
                     lambda v: v.update(raw_final_usage=[{'cost_usd': '1'}, {'cost_usd': '2'}])]
        for mutate in mutations:
            value = usage()
            mutate(value)
            with self.assertRaises(ValueError):
                token_costs.make_cost_record(ENTRY, value, PRICING)

    def test_modified_usage_cannot_be_imported_from_an_unchanged_archive(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            folder = root / 'evidence/unpacked/run-1/analysis'
            folder.mkdir(parents=True)
            record = atb_analysis_export.encode(usage())
            target = folder / 'slot/evidence/usage.json'
            target.parent.mkdir(parents=True)
            target.write_bytes(record)
            definition = {'indexes': {}, 'trials': [{'run_id': 'slot', 'participant_campaign': 'attempt',
                                                    'configuration': ENTRY['configuration']}]}
            (folder / 'manifest.json').write_bytes(atb_analysis_export.encode(definition))
            files = {
                'README.md': {'bytes': 0, 'sha256': hashlib.sha256(b'').hexdigest()},
                'analysis/manifest.json': {'bytes': (folder / 'manifest.json').stat().st_size,
                                           'sha256': atb_analysis_archive.sha(folder / 'manifest.json')},
                'analysis/slot/evidence/usage.json': {'bytes': len(record), 'sha256': hashlib.sha256(record).hexdigest()},
            }
            manifest = {'schema_version': 1, 'format': atb_analysis_archive.FORMAT,
                        'compression': atb_analysis_archive.PROFILE, 'analysis_files': 2,
                        'uncompressed_bytes': sum(v['bytes'] for k, v in files.items() if k.startswith('analysis/')),
                        'manifest_sha256': files['analysis/manifest.json']['sha256'], 'files': files}
            entry = {**ENTRY, 'filename': 'source.tar.xz', 'sha256': 'archive-sha', 'slot': 'slot',
                     'attempt_id': 'attempt', 'analysis_manifest_sha256': manifest['manifest_sha256']}
            (folder / 'manifest.json').write_bytes(atb_analysis_export.encode(definition))
            target.write_bytes(record.replace(b'2000000', b'2000001'))
            fake_archive = unittest.mock.MagicMock()
            member = unittest.mock.Mock(name='member')
            member.name, member.size = 'manifest.json', 100
            member.isfile.return_value = True
            fake_archive.__iter__.return_value = iter([member])
            import io
            fake_archive.extractfile.return_value = io.BytesIO(json.dumps(manifest).encode())
            with patch.object(import_token_costs, 'sha', return_value='archive-sha'), \
                    patch.object(import_token_costs.tarfile, 'open') as opener, \
                    patch.object(import_token_costs.AnalysisSnapshot, 'load_manifest', return_value={**definition,
                                  'files': {'slot/evidence/usage.json': files['analysis/slot/evidence/usage.json']}}):
                opener.return_value.__enter__.return_value = fake_archive
                with self.assertRaisesRegex(ValueError, 'Token source file hash differs'):
                    import_token_costs.verified_usage(entry, root)


class IndexRunTests(unittest.TestCase):
    def test_three_runs_keep_individual_values_and_links_without_a_run_column(self):
        root = build_index.ROOT
        catalog = json.loads((root / 'site/data/runs.json').read_text())
        evidence = json.loads((root / 'data/evidence.json').read_text())
        records, pricing = token_costs.load_token_costs()
        task = deepcopy(catalog['tasks'][0])
        task['runs'] = [task['runs'][0]]
        entry = deepcopy(evidence['runs'][0])
        evidence['runs'] = [entry]
        records = {entry['id']: deepcopy(records[entry['id']])}
        for number, seconds, status, cost in [(2, 60, 'MISS', '1.00'), (3, 120, 'PASS', '3.00')]:
            run = {**task['runs'][0], 'id': 'extra-' + str(number), 'run': number,
                   'trace': 'traces/extra-' + str(number) + '.html'}
            task['runs'].append(run)
            other = {**entry, 'id': run['id'], 'run': number, 'design_model_calls_s': seconds,
                     'electrical_status': status}
            evidence['runs'].append(other)
            records[run['id']] = {**records[entry['id']], 'total_cost_usd': cost}
        with tempfile.TemporaryDirectory() as directory:
            fixture = Path(directory)
            (fixture / 'site/data').mkdir(parents=True)
            (fixture / 'data').mkdir()
            (fixture / 'site/data/runs.json').write_text(json.dumps({'tasks': [task]}))
            (fixture / 'data/evidence.json').write_text(json.dumps(evidence))
            with patch.object(build_index, 'load_token_costs', return_value=(records, pricing)), \
                    patch.object(build_index, 'asset_url', return_value='home.css'), \
                    patch.object(build_index, 'render_page', side_effect=lambda title, content, *args: content):
                page = build_index.render_index(fixture)
        self.assertNotIn('<th scope="col">Run</th>', page)
        self.assertEqual(page.count('<tr><th scope="row">'), 1)
        self.assertIn('Run 2</span> FAIL', page)
        self.assertIn('Run 3</span> PASS', page)
        self.assertIn('Run 2</span> 0:01:00', page)
        self.assertIn('Run 3</span> 0:02:00', page)
        self.assertIn('Run 2</span> $1.00', page)
        self.assertIn('Run 3</span> $3.00', page)
        for run in task['runs']:
            self.assertIn('href="' + run['trace'] + '"', page)
        self.assertLess(page.index('>Model-call time<'), page.index('>Cost<'))
        self.assertLess(page.index('>Cost<'), page.index('>Design<'))


if __name__ == '__main__':
    unittest.main()
