"""Regression cases for the recorded formats and failure semantics in this import."""
from collections import Counter
import datetime as dt
import json
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools/trace'))
import import_results as importer

START = '2026-10-03T00:00:00+00:00'


def tool(id='cmd', input='printf value', output='value\n', status=0, name='command_execution'):
    return dict(tool_call_id=id, name=name, input=input, result=output, exit_status=status,
                start=START, end=START)


def command_rows(t):
    return [dict(type='item.started', item=dict(type='command_execution', id=t['tool_call_id'], command=t['input'])),
            dict(type='item.completed', item=dict(type='command_execution', id=t['tool_call_id'],
                                                  aggregated_output=t['result'], exit_code=t['exit_status']))]


class TranscriptTests(unittest.TestCase):
    def test_opencode_completed_tools_errors_and_public_text(self):
        clock = 1_791_072_000_000
        read = tool('read', {'path': '/workspace/TASK.md'}, '1: Original line\n', None, 'read')
        failed = tool('denied', {'path': '/external/file'}, None, None, 'read')
        shell = tool('shell', {'command': 'saved command'}, '', 2, 'shell')
        empty = tool('write', {'path': '/workspace/file', 'content': 'complete\n'}, '', None, 'write')
        saved = [read, failed, shell, empty]
        for item in saved:
            item.update(start=clock, end=clock+1)
        rows = [dict(type='step_start', part={'type': 'step-start'}),
                dict(type='reasoning', part={'type': 'reasoning', 'text': 'PRIVATE'}),
                dict(type='text', timestamp=clock, part={'type': 'text', 'id': 'text', 'text': 'Public\n'})]
        for item in saved:
            state = dict(status='error' if item is failed else 'completed', input=item['input'])
            state.update(error='Permission denied' if item is failed else None)
            if item is not failed:
                state['output'] = item['result']
            rows.append(dict(type='tool_use', part={'type': 'tool', 'id': item['tool_call_id'],
                                                   'tool': item['name'], 'state': state}))
        result = importer.normalize(SimpleNamespace(tools=saved, transcript=rows))
        results = [e for e in result.events if e.kind == 'RESULT']
        self.assertEqual([e.payload for e in results], ['1: Original line\n', 'Permission denied', ''])
        self.assertEqual([e.status for e in results], ['completed', 'error', 2])
        self.assertEqual(result.events[0].timestamp, '2026-10-04T00:00:00+00:00')
        self.assertEqual(result.omissions['empty_successes'], 1)
        self.assertEqual(result.read_prefixes, 0)
        self.assertNotIn('PRIVATE', str(result.events))
        rows[3]['part']['state']['output'] = 'different'
        with self.assertRaisesRegex(ValueError, 'result disagreement'):
            importer.normalize(SimpleNamespace(tools=saved, transcript=rows))

    def test_opencode_rejects_unknown_public_and_incomplete_tool_events(self):
        rows = [dict(type='unknown', part={})]
        with self.assertRaisesRegex(ValueError, 'Unsupported recorded OpenCode'):
            importer.normalize(SimpleNamespace(tools=[], transcript=rows))
        item = tool('read', {}, '', None, 'read')
        rows = [dict(type='tool_use', part={'type': 'tool', 'id': 'read', 'tool': 'read',
                                           'state': {'status': 'running', 'input': {}, 'output': ''}})]
        with self.assertRaisesRegex(ValueError, 'Incomplete OpenCode'):
            importer.normalize(SimpleNamespace(tools=[item], transcript=rows))

    def test_empty_success_is_omitted_but_failed_empty_output_and_file_edits_remain(self):
        success, failed = tool(output=''), tool('failed', output='', status=2)
        edits = [dict(type='item.started', item=dict(id='edit', type='file_change',
                                                   changes=[dict(path='/workspace/dut.spice', kind='add')], status='in_progress')),
                 dict(type='item.completed', item=dict(id='edit', type='file_change',
                                                     changes=[dict(path='/workspace/dut.spice', kind='add')], status='completed'))]
        evidence = SimpleNamespace(tools=[success, failed], transcript=command_rows(success)+edits+command_rows(failed))
        result = importer.normalize(evidence)
        self.assertEqual([e.kind for e in result.events], ['ACTION', 'ACTION', 'RESULT', 'ACTION', 'RESULT'])
        self.assertEqual(result.events[-1].status, 2)
        self.assertEqual(result.events[1].payload['changes'], [dict(path='/workspace/dut.spice', kind='add')])
        self.assertEqual(result.omissions['empty_successes'], 1)
        self.assertEqual(result.omissions['file_edits_without_patch_text'], 1)
        self.assertIsNone(result.events[1].timestamp)

    def test_conflicting_tool_output_is_rejected(self):
        t=tool()
        rows=command_rows(t)
        rows[1]['item']['aggregated_output']='different result'
        with self.assertRaisesRegex(ValueError, 'result disagreement'):
            importer.normalize(SimpleNamespace(tools=[t],transcript=rows))

    def test_claude_private_blocks_streams_and_async_delivery(self):
        t=tool('read',input={'file_path':'/workspace/TASK.md','offset':2},output='2\tline one\n3\t123 numeric content\n',
               status='success',name='Read')
        rows=[dict(type='stream_event',event={'delta':{'text':'partial'}}),
              dict(type='assistant',timestamp=START,message={'content':[
                  {'type':'thinking','thinking':'PRIVATE'}, {'type':'text','text':'Public\n'},
                  {'type':'tool_use','id':'read','name':'Read','input':t['input']}]}),
              dict(type='assistant',timestamp=START,message={'content':[{'type':'text','text':'While waiting\n'}]}),
              dict(type='user',message={'content':[{'type':'tool_result','tool_use_id':'read','content':t['result']} ]})]
        result=importer.normalize(SimpleNamespace(tools=[t],transcript=rows))
        self.assertEqual([e.kind for e in result.events],['MODEL','ACTION','MODEL','RESULT'])
        self.assertEqual(result.events[-1].payload,'line one\n123 numeric content\n')
        self.assertEqual(result.read_prefixes,2)
        self.assertEqual(result.omissions['private_reasoning_blocks'],1)
        self.assertNotIn('PRIVATE',str(result.events))

    def test_rendered_payload_change_is_detected(self):
        t=tool(input='a\n  b\n',output='x\n  y\n')
        evidence=SimpleNamespace(tools=[t],transcript=command_rows(t),submitted_spice='SPICE\n',
                                 published={},hidden={},timing={'independent_evaluation':{}},extra_reports={})
        normalized=importer.normalize(evidence)
        timing=SimpleNamespace(start=dt.datetime.fromisoformat(START))
        with patch.object(importer.shared,'render_model_markdown',return_value={}):
            trace=importer.render_history(normalized,timing)+importer.shared.render_submission(evidence.submitted_spice)
        report=json.dumps(importer.report_source(evidence))
        importer.verify_payloads(trace,normalized,evidence,report)
        with self.assertRaisesRegex(ValueError,'ACTION payload changed'):
            importer.verify_payloads(trace.replace('a\n  b\n','a\nb\n'),normalized,evidence,report)


def row(metric='overhead_a',limit=2e-6,value=1e-6,stage='published',case='dc_low',**extra):
    return dict(metric=metric,limit=limit,measured=value,measurement_valid=True,verdict='PASS',direction='<=',
                unit='A',cload_f=1e-8,case_id=case,pvt='N',stage=stage,experiment_id='experiment',revision='frozen',**extra)


def report(rows,stage):
    return dict(stage=stage,rows=rows,counts=dict(Counter(r['verdict'] for r in rows)),groups=[],expected_groups=0,
                execution_complete=True)


def evaluation(rows):
    return SimpleNamespace(submission={'revision':'frozen'},published=report(rows,'published'),
                           hidden=report([],'hidden'),extra_reports={},timing={'independent_evaluation':{'finished_at':START}})


class EvaluationTests(unittest.TestCase):
    def render(self, rows):
        return importer.render_evaluation(evaluation(rows),SimpleNamespace(start=dt.datetime.fromisoformat(START)))

    def test_light_and_other_load_current_limits_are_never_merged(self):
        markup=self.render([row(),row(limit=1e-5,value=8e-6,case='dc_high')])
        self.assertEqual(markup.count('<tr data-metric="overhead_a">'),2)
        self.assertIn('Light-load overhead current',markup)
        self.assertIn('Overhead current · other loads',markup)
        self.assertIn('≤ 2 µA',markup)
        self.assertIn('≤ 10 µA',markup)

    def test_unrecovered_measurement_is_a_lower_bound_not_invalid_or_zero(self):
        r=row(metric='recovery_1_s',limit=5e-7,value=None,measured_lower_bound=2.1e-6)
        r.update(verdict='MISS',unit='s')
        markup=self.render([r])
        self.assertIn('≥ 2.1 µs · 1 windows exceeded',markup)
        self.assertNotIn('measurements invalid',markup)
        self.assertIn('MISS',markup)

    def test_missing_balanced_point_is_displayed_as_measurement_failure(self):
        r=dict(metric='cmrr_valid_measurement',measured=None,verdict='MEASUREMENT_FAILURE',cload_f=2e-12,
               pvt='SLH',stage='published',experiment_id='failed-cmrr',revision='frozen')
        markup=self.render([r])
        self.assertIn('CMRR measurement validity',markup)
        self.assertIn('Unavailable',markup)
        self.assertIn('Balanced operating point required',markup)
        self.assertIn('MEASUREMENT_FAILURE',markup)
        evidence=evaluation([r])
        evidence.submitted_spice='SPICE\n'
        evidence.robustness_circuits=[]
        profile=importer.validation_profile(
            {'id':'run-1','trace':'traces/run-1.html','sha256':'archive'}, markup, '',
            json.dumps(importer.report_source(evidence)), importer.Normalized([],{},{}), evidence)
        self.assertEqual(profile['source_verification']['unavailable_measurement_rows'],
                         {'published':1,'hidden':0})
        self.assertEqual(profile['source_verification']['window_exceeded_rows'],
                         {'published':0,'hidden':0})

    def test_stale_evaluation_revision_is_rejected(self):
        r=row();r['revision']='stale'
        with self.assertRaisesRegex(ValueError,'revision differs'):
            self.render([r])

    def test_fixed_boolean_limit_and_categorical_load_scope(self):
        r=row(metric='no_0db_recross_min',limit=1,value=1)
        r.update(unit='boolean',direction='>=',cload_f='bias')
        markup=self.render([r])
        self.assertIn('No recross',markup)
        self.assertIn('bias operating point',markup)
        self.assertNotIn('1 boolean',markup)


if __name__ == '__main__':
    unittest.main()
