from copy import deepcopy
from decimal import Decimal
import hashlib
import html
import json
from pathlib import Path
import sys
import re
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
    def test_direct_api_usage_reconciles_without_invented_cache_writes(self):
        value = usage()
        value.pop('final_total_reconciliation')
        value.update(provider='opencode-deepseek', expected_model_id='deepseek-flash')
        value['normalized'].update(input_semantics='prompt includes cached input',
                                   output_semantics='completion includes reasoning; never add twice',
                                   cache_write_tokens=None)
        raw = {'prompt_tokens': 2_000_000, 'prompt_cache_hit_tokens': 1_000_000,
               'prompt_cache_miss_tokens': 1_000_000, 'completion_tokens': 100_000,
               'total_tokens': 2_100_000, 'completion_tokens_details': {'reasoning_tokens': 50_000}}
        value['requests'] = [{'request_id': 'api/1', 'usage': raw,
                              'forwarded_settings': {'model': 'deepseek-flash'},
                              'models': ['deepseek-flash'],
                              'normalized': {k: value['normalized'][k] for k in token_costs.TOKEN_FIELDS}}]
        pricing = {'models': {'deepseek-flash': {'usd_per_million':
                   {'input': '0.15', 'cache_read': '0.003', 'output': '0.60'}}}}
        entry = {'id': 'deepseek', 'configuration': {'model': 'deepseek-flash'}}
        record = token_costs.make_cost_record(entry, value, pricing)
        self.assertIsNone(record['cache_write_tokens'])
        self.assertEqual(Decimal(record['total_cost_usd']), Decimal('0.213'))
        markup = token_costs.render_token_summary(record, pricing)
        self.assertNotIn('Cache write', markup)
        self.assertNotIn('Reasoning', markup)
        self.assertIn('$0.003 / 1M', markup)
        self.assertIn('$0.21', markup)
        value['requests'][0]['usage']['prompt_cache_miss_tokens'] -= 1
        with self.assertRaisesRegex(ValueError, 'cached input does not reconcile'):
            token_costs.make_cost_record(entry, value, pricing)
        value['requests'][0]['usage']['prompt_cache_miss_tokens'] += 1
        value['normalized']['input_tokens'] += 1
        with self.assertRaisesRegex(ValueError, 'totals do not reconcile'):
            token_costs.make_cost_record(entry, value, pricing)
        value['normalized']['input_tokens'] = None
        value['requests'][0]['normalized']['input_tokens'] = None
        raw.update(prompt_tokens=None, prompt_cache_miss_tokens=None, total_tokens=None)
        self.assertIsNone(token_costs.make_cost_record(entry, value, pricing)['total_cost_usd'])
        value['requests'][0]['models'] = ['other-model']
        with self.assertRaisesRegex(ValueError, 'model differs'):
            token_costs.make_cost_record(entry, value, pricing)

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
    def test_three_runs_show_pass_fraction_means_and_a_model_trace_link(self):
        root = build_index.ROOT
        catalog = json.loads((root / 'site/data/runs.json').read_text())
        evidence = json.loads((root / 'data/evidence.json').read_text())
        records, pricing = token_costs.load_token_costs()
        task = deepcopy(catalog['tasks'][0])
        task['runs'] = [task['runs'][0]]
        entry = deepcopy(evidence['runs'][0])
        evidence['runs'] = [entry]
        records = {entry['id']: deepcopy(records[entry['id']])}
        for number, seconds, status, cost in [(2, 60, 'MISS', '1.00'), (3, 120, 'MISS', '3.00')]:
            run = {**task['runs'][0], 'id': 'extra-' + str(number), 'run': number,
                   'trace': 'traces/extra-' + str(number) + '.html'}
            task['runs'].append(run)
            other = {**entry, 'id': run['id'], 'run': number, 'design_model_calls_s': seconds,
                     'electrical_status': status}
            evidence['runs'].append(other)
            records[run['id']] = {**records[entry['id']], 'total_cost_usd': cost}
        task['runs'].reverse()
        with tempfile.TemporaryDirectory() as directory:
            fixture = Path(directory)
            (fixture / 'site/data').mkdir(parents=True)
            (fixture / 'data').mkdir()
            (fixture / 'site/data/runs.json').write_text(json.dumps({'tasks': [task]}))
            (fixture / 'data/evidence.json').write_text(json.dumps(evidence))
            with patch.object(build_index, 'load_token_costs', return_value=(records, pricing)), \
                    patch.object(build_index, 'asset_url', return_value='home.css'), \
                    patch.object(build_index, 'render_page', side_effect=lambda title, content, *args, **kwargs: content):
                page = build_index.render_index(fixture, view='task')
                model_page = build_index.render_index(fixture)
        self.assertNotIn('<th scope="col">Run</th>', page)
        self.assertNotIn('<th scope="col">Archive</th>', page)
        self.assertNotIn('<th scope="col">Design</th>', page)
        self.assertEqual(page.count('<tr><th scope="row">'), 1)
        cells = re.findall(r'<td>(.*?)</td>', page, re.S)
        self.assertEqual(len(cells), 3)
        visible = [html.unescape(re.sub(r'<[^>]+>', '', cell)) for cell in cells]
        self.assertEqual(visible[0], 'FAIL 1 / 3')
        expected_time = (Decimal(str(entry['design_model_calls_s'])) + 60 + 120) / 3
        expected_cost = (Decimal(records[entry['id']]['total_cost_usd']) + 1 + 3) / 3
        self.assertEqual(visible[1], f'{expected_time / 60:.1f} min')
        self.assertEqual(visible[2], f'${expected_cost:.2f}')
        self.assertIn(f'data-value="{expected_time}"', cells[1])
        self.assertIn(f'data-value="{expected_cost}"', cells[2])
        self.assertIn('width: 100.0000%', cells[1])
        self.assertIn('Mean of 3 recorded runs', cells[2])
        for cell in cells[:3]:
            self.assertNotIn('run-label', cell)
        first = next(run for run in task['runs'] if run['run'] == 1)
        self.assertIn('<th scope="row"><a href="' + first['trace'] + '">' + first['model'] + '</a></th>', page)
        self.assertEqual(page.count('<a href='), 1)
        self.assertLess(page.index('>Model-call time<'), page.index('>USD<'))
        self.assertEqual(re.findall(r'<td>(.*?)</td>', model_page, re.S), cells)
        self.assertIn('<th scope="row"><a href="' + first['trace'] + '">' + task['id'] + '</a></th>', model_page)
        self.assertIn('>' + first['model'] + '</h2>', model_page)

    def test_both_views_cover_the_same_trials_in_their_respective_groups(self):
        catalog = json.loads((build_index.ROOT / 'site/data/runs.json').read_text())
        expected = {(task['id'], run['model']): run['trace']
                    for task in catalog['tasks'] for run in sorted(task['runs'], key=lambda run: -run['run'])}
        for view in ('model', 'task'):
            page = build_index.render_index(view=view)
            actual = {}
            for section in re.findall(r'<section\b.*?</section>', page, re.S):
                heading = html.unescape(re.search(r'<h2[^>]*>(.*?)</h2>', section)[1])
                for href, label in re.findall(r'<th scope="row"><a href="([^"]+)">(.*?)</a></th>', section):
                    label = html.unescape(label)
                    pair = (label, heading) if view == 'model' else (heading, label)
                    self.assertNotIn(pair, actual)
                    actual[pair] = html.unescape(href)
            self.assertEqual(actual, expected)
            current = 'index.html' if view == 'model' else 'tasks.html'
            self.assertIn('href="' + current + '" aria-current="page"', page)
            self.assertEqual(page.count('aria-current="page"'), 1)

    def test_means_use_unrounded_values_and_keep_missing_values_unknown(self):
        self.assertEqual(build_index.mean_value([Decimal('9'), Decimal('10'), Decimal('2')]), 7)
        self.assertEqual(build_index.mean_value([Decimal('2')]), 2)
        self.assertEqual(build_index.mean_value([Decimal('0')]), 0)
        self.assertEqual(build_index.mean_value([Decimal('1.004'), Decimal('1.014')]), Decimal('1.009'))
        self.assertEqual(build_index.mean_value([0.1, 0.2]), Decimal('0.15'))
        self.assertIsNone(build_index.mean_value([Decimal('2'), None]))
        self.assertIsNone(build_index.mean_value([]))

    def test_bars_scale_to_the_task_max_and_handle_zero_and_unknown(self):
        rendered = build_index.metric_cell(Decimal('2'), Decimal('8'), '$2.00', 'cost', 2)
        self.assertIn('width: 25.0000%', rendered)
        self.assertIn('aria-hidden="true"', rendered)
        self.assertIn('width: 0.0000%', build_index.metric_cell(Decimal(0), Decimal(0), '$0.00', 'cost', 1))
        self.assertIn('Not recorded', build_index.metric_cell(None, Decimal('8'), '', 'cost', 1))
        self.assertNotIn('metric-fill', build_index.metric_cell(None, Decimal('8'), '', 'cost', 1))


if __name__ == '__main__':
    unittest.main()
