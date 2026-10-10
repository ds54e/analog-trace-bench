"""Normalize captured public Codex, Claude and OpenCode events.

Producer semantics are checked against saved tools before shared rendering.
Private reasoning is counted as an omission and never enters public events.
"""
from collections import Counter
from dataclasses import dataclass, replace
import datetime as dt
import json
from pathlib import Path
import re

from rendering import require


@dataclass(frozen=True)
class Event:
    kind: str
    id: str
    timestamp: str | None
    name: str
    payload: object
    status: object = None


@dataclass
class Normalized:
    events: list[Event]
    tools: dict
    omissions: dict
    read_prefixes: int = 0


def tool_label(tool):
    fields = tool['input']
    if isinstance(fields, str):
        return 'Bash' if tool['name'] == 'command_execution' else tool['name']
    path = fields.get('file_path', fields.get('path'))
    return tool['name'] + (' · ' + Path(path).name if isinstance(path, str) else '')


def result_text(tool):
    result = tool['result']
    require(isinstance(result, str), 'Unsupported saved result schema: ' + tool['tool_call_id'])
    if tool['name'] == 'Read':
        # Restrict decoration stripping to the producer's documented Read format.
        result, removed = re.subn(r'(?m)^[ \t]*\d+\t', '', result)
        return result, removed
    return result, 0


def successful(status):
    return status == 0 or status in ('success', 'completed')


def normalize(evidence):
    tools = {tool['tool_call_id']: tool for tool in evidence.tools}
    require(len(tools) == len(evidence.tools), 'Duplicate saved tool IDs')
    claude = any(row.get('type') == 'assistant' for row in evidence.transcript)
    opencode = any(isinstance(row.get('part'), dict) for row in evidence.transcript)
    events, actions, results, models = [], [], [], []
    omissions = Counter()
    prefixes = 0
    file_starts, file_completions = {}, {}

    def timestamp(value):
        if opencode and isinstance(value, (int, float)):
            return dt.datetime.fromtimestamp(value / 1000, dt.timezone.utc).isoformat()
        return value

    def action(id, source_input, name=None):
        require(id in tools, 'Transcript action has no saved tool: ' + id)
        tool = tools[id]
        require(source_input == tool['input'], 'Transcript/tool input disagreement: ' + id)
        require(name is None or name == tool['name'], 'Transcript/tool name disagreement: ' + id)
        events.append(Event('ACTION', id, timestamp(tool['start']), tool_label(tool), tool['input']))
        actions.append(id)

    def result(id, source_output, is_error=None, recorded_status=None, recorded_error=None):
        nonlocal prefixes
        tool = tools[id]
        require(source_output == tool['result'], 'Transcript/tool result disagreement: ' + id)
        require(is_error is None or bool(is_error) == (not successful(tool['exit_status'])),
                'Transcript/tool outcome disagreement: ' + id)
        status = tool['exit_status'] if tool['exit_status'] is not None else recorded_status
        if recorded_status == 'error':
            require(not successful(tool['exit_status']), 'Transcript/tool outcome disagreement: ' + id)
        if tool['result'] is None and recorded_status == 'error':
            require(isinstance(recorded_error, str), 'Missing recorded OpenCode error')
            output, removed = recorded_error, 0
        else:
            output, removed = result_text(tool)
        prefixes += removed
        results.append(id)
        if not output.strip() and successful(status):
            omissions['empty_successes'] += 1
            return
        events.append(Event('RESULT', id, timestamp(tool['end']), tool_label(tool), output, status))

    for row_index, row in enumerate(evidence.transcript):
        if opencode:
            kind = row.get('type')
            part = row.get('part', {})
            if kind in ('step_start', 'step_finish'):
                omissions['transport_rows'] += 1
            elif kind == 'reasoning':
                omissions['private_reasoning_blocks'] += 1
            elif kind == 'text' and part.get('type') == 'text':
                events.append(Event('MODEL', part['id'], timestamp(row['timestamp']), '', part['text']))
                models.append(part['id'])
            elif kind == 'tool_use' and part.get('type') == 'tool':
                state = part['state']
                require(state['status'] in ('completed', 'error'), 'Incomplete OpenCode tool event')
                action(part['id'], state['input'], part['tool'])
                result(part['id'], state.get('output'), recorded_status=state['status'],
                       recorded_error=state.get('error'))
            else:
                raise ValueError('Unsupported recorded OpenCode event: ' + str(kind))
        elif claude:
            kind = row.get('type')
            if kind not in ('assistant', 'user'):
                omissions['transport_rows'] += 1
                continue
            content = row.get('message', {}).get('content', [])
            if not isinstance(content, list):
                omissions['notifications'] += 1
                continue
            for index, block in enumerate(content):
                block_kind = block.get('type')
                if kind == 'assistant' and block_kind == 'text':
                    id = str(row_index) + '-' + str(index)
                    events.append(Event('MODEL', id, row.get('timestamp'), '', block['text']))
                    models.append(id)
                elif kind == 'assistant' and block_kind == 'tool_use':
                    action(block['id'], block['input'], block['name'])
                elif kind == 'assistant' and block_kind in ('thinking', 'redacted_thinking'):
                    omissions['private_reasoning_blocks'] += 1
                elif kind == 'user' and block_kind == 'tool_result' and block['tool_use_id'] in tools:
                    result(block['tool_use_id'], block['content'], block.get('is_error', False))
                elif kind == 'user':
                    omissions['notifications'] += 1
                else:
                    raise ValueError('Unsupported public transcript block: ' + str(block_kind))
        else:
            item = row.get('item', {})
            kind, event = item.get('type'), row.get('type')
            if kind == 'agent_message' and event == 'item.completed':
                events.append(Event('MODEL', item['id'], row.get('timestamp'), '', item['text']))
                models.append(item['id'])
            elif kind == 'command_execution' and event == 'item.started':
                action(item['id'], item['command'])
            elif kind == 'command_execution' and event == 'item.completed':
                require(item.get('exit_code') == tools[item['id']]['exit_status'],
                        'Transcript/tool exit code disagreement: ' + item['id'])
                result(item['id'], item['aggregated_output'])
            elif kind == 'file_change':
                id = item['id']
                if event == 'item.started':
                    require(id not in tools and id not in file_starts, 'Duplicate file-change ID')
                    file_starts[id] = item
                    events.append(Event('ACTION', id, row.get('timestamp'), 'File change',
                                        {'changes': item['changes'], 'status': item['status']}))
                elif event == 'item.completed':
                    require(id in file_starts and id not in file_completions, 'Unmatched file-change completion')
                    require(item['changes'] == file_starts[id]['changes'], 'File-change paths differ')
                    file_completions[id] = item
                    events.append(Event('RESULT', id, row.get('timestamp'), 'File change',
                                        json.dumps({'changes': item['changes'], 'status': item['status']},
                                                   ensure_ascii=False, indent=2), item['status']))
                else:
                    raise ValueError('Unsupported file-change event: ' + str(event))
            elif kind in (None, 'reasoning'):
                omissions['transport_rows' if kind is None else 'private_reasoning_blocks'] += 1
            else:
                raise ValueError('Unsupported recorded Codex item: ' + str(kind))
    require(len(models) == len(set(models)), 'Duplicate completed MODEL IDs')
    require(len(actions) == len(set(actions)) == len(tools) and set(actions) == set(tools),
            'Missing or duplicate saved tool action')
    missing = set(tools) - set(results)
    incomplete = {id for id in missing if not claude and not opencode
                  and tools[id]['name'] == 'command_execution'
                  and all(tools[id].get(key) is None for key in ('end', 'result', 'exit_status'))
                  and tools[id].get('timing_limitation') == 'CLI did not expose both boundaries'}
    require(len(results) == len(set(results)) and set(results) | incomplete == set(tools),
            'Missing or duplicate saved tool completion')
    if incomplete:
        omissions['tool_completions_not_recorded'] = len(incomplete)
        events = [replace(event, status='completion_not_recorded')
                  if event.kind == 'ACTION' and event.id in incomplete else event for event in events]
    require(set(file_starts) == set(file_completions), 'Incomplete file-change events')
    if file_starts:
        omissions['file_edits_without_patch_text'] = len(file_starts)
    return Normalized(events, tools, dict(omissions), prefixes)
