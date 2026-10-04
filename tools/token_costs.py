"""Source-derived token usage, decimal cost arithmetic, and shared presentation."""
from decimal import Decimal
import html
import json

from site_templates import ROOT

TOKEN_FIELDS = ('input_tokens', 'cache_read_tokens', 'cache_write_tokens',
                'output_tokens', 'reasoning_tokens')


def decimal_cost(value):
    cost = Decimal(str(value))
    if not cost.is_finite() or cost < 0:
        raise ValueError('Invalid token cost')
    return cost


def token_counts(normalized):
    result = {key: normalized[key] for key in TOKEN_FIELDS}
    if any(value is not None and (type(value) is not int or value < 0)
           for value in result.values()):
        raise ValueError('Invalid token count')
    semantics = normalized['input_semantics']
    if semantics == 'input includes cached input':
        # The captured OpenAI provider exposes no cache writes. Do not guess
        # whether a future producer includes writes in its input total.
        if result['cache_write_tokens'] not in (None, 0):
            raise ValueError('Unreviewed cached-write input accounting')
        uncached = (result['input_tokens'] - result['cache_read_tokens']
                    if result['input_tokens'] is not None and result['cache_read_tokens'] is not None else None)
    elif semantics == 'uncached input excludes cache read/write':
        uncached = result['input_tokens']
    else:
        raise ValueError('Unknown input-token accounting')
    if uncached is not None and uncached < 0:
        raise ValueError('Cached input exceeds input total')
    if (result['reasoning_tokens'] is not None and result['output_tokens'] is not None and
            result['reasoning_tokens'] > result['output_tokens']):
        raise ValueError('Reasoning count exceeds output total')
    if normalized['output_semantics'] != 'provider output; do not add reasoning again':
        raise ValueError('Unknown output-token accounting')
    return {**result, 'uncached_input_tokens': uncached}


def estimate_cost(counts, rates):
    fields = {'input': 'uncached_input_tokens', 'cache_read': 'cache_read_tokens',
              'cache_write': 'cache_write_tokens', 'output': 'output_tokens'}
    if any(counts[field] is None for field in fields.values()):
        return None
    # Reasoning is a subset of output, not an additional billable category.
    return sum(Decimal(counts[field]) * decimal_cost(rates[kind])
               for kind, field in fields.items()) / Decimal(1_000_000)


def make_cost_record(entry, usage, pricing):
    model = entry['configuration']['model']
    if usage['expected_model_id'] != model:
        raise ValueError('Token usage model differs from catalog')
    if any(value.get('equal') is False for value in usage['final_total_reconciliation'].values()):
        raise ValueError('Recorded token totals do not reconcile')
    counts = token_counts(usage['normalized'])
    reported = {decimal_cost(item['cost_usd']) for item in usage.get('raw_final_usage', [])
                if item.get('cost_usd') is not None}
    if len(reported) > 1:
        raise ValueError('Ambiguous provider cost totals')
    if reported:
        cost, basis = reported.pop(), 'provider_reported'
    elif model in pricing['models']:
        cost = estimate_cost(counts, pricing['models'][model]['usd_per_million'])
        basis = 'standard_short_context_estimate'
    else:
        cost, basis = None, 'unavailable'
    return {
        'id': entry['id'], 'model_id': model, **counts,
        'input_semantics': usage['normalized']['input_semantics'],
        'output_semantics': usage['normalized']['output_semantics'],
        'cache_write_ttl_tokens': usage['normalized'].get('cache_write_ttl_tokens'),
        'effective_service_tier': usage['normalized'].get('effective_service_tier'),
        'model_identity_status': usage['model_identity_status'],
        'cost_basis': basis, 'total_cost_usd': str(cost) if cost is not None else None,
        'reported_cost_usd': str(cost) if basis == 'provider_reported' else None,
    }


def load_token_costs(root=ROOT):
    data = json.loads((root / 'site/data/token-costs.json').read_text())
    pricing = json.loads((root / 'data/token-pricing.json').read_text())
    if data['schema_version'] != 1 or data['pricing'] != pricing:
        raise ValueError('Token pricing is stale; run tools/import_token_costs.py')
    evidence = json.loads((root / 'data/evidence.json').read_text())['runs']
    records = {record['id']: record for record in data['runs']}
    if len(records) != len(data['runs']) or set(records) != {e['id'] for e in evidence}:
        raise ValueError('Token usage and evidence run IDs differ')
    for entry in evidence:
        record = records[entry['id']]
        source = record['source']
        if (record['model_id'] != entry['configuration']['model'] or
                source['archive_sha256'] != entry['sha256'] or
                source['analysis_manifest_sha256'] != entry['analysis_manifest_sha256'] or
                source['usage_path'] != entry['slot'] + '/evidence/usage.json'):
            raise ValueError('Token usage source differs: ' + entry['id'])
        counts = token_counts(record)
        if counts['uncached_input_tokens'] != record['uncached_input_tokens']:
            raise ValueError('Uncached token count differs: ' + entry['id'])
        basis = record['cost_basis']
        if basis == 'standard_short_context_estimate':
            expected = estimate_cost(counts, pricing['models'][record['model_id']]['usd_per_million'])
        elif basis == 'provider_reported':
            expected = decimal_cost(record['reported_cost_usd'])
        elif basis == 'unavailable':
            expected = None
        else:
            raise ValueError('Unknown token cost basis')
        actual = decimal_cost(record['total_cost_usd']) if record['total_cost_usd'] is not None else None
        if expected != actual:
            raise ValueError('Token cost arithmetic differs: ' + entry['id'])
    return records, pricing


def format_token_cost(record):
    if record['total_cost_usd'] is None:
        return 'Not recorded'
    prefix = '≈ ' if record['cost_basis'] == 'standard_short_context_estimate' else ''
    return prefix + '$' + format(decimal_cost(record['total_cost_usd']), '.2f')


def render_token_summary(record, pricing):
    def count(field):
        return f'{record[field]:,}' if record[field] is not None else 'Not recorded'
    rows = [
        ('Input tokens (uncached)', count('uncached_input_tokens')),
        ('Cache read tokens', count('cache_read_tokens')),
        ('Cache write tokens', count('cache_write_tokens')),
        ('Output tokens', count('output_tokens')),
        ('Reasoning tokens (included in output)', count('reasoning_tokens')),
    ]
    markup = ''.join('<tr' + (' class="summary-group-start"' if i == 0 else '') +
                     '><th>' + label + '</th><td class="mono-value">' + value + '</td></tr>\n'
                     for i, (label, value) in enumerate(rows))
    if record['cost_basis'] == 'standard_short_context_estimate':
        model = pricing['models'][record['model_id']]
        rates = model['usd_per_million']
        basis = ('<a href="' + html.escape(model['source_url'], quote=True) + '">Standard short-context estimate</a>'
                 ' · per 1M tokens: input $' + rates['input'] + ', cache read $' + rates['cache_read'] +
                 ', cache write $' + rates['cache_write'] + ', output $' + rates['output'])
        basis += '<span class="cost-note">Actual request context and billing tier are not recorded.</span>'
    else:
        basis = 'Provider-reported cost' if record['cost_basis'] == 'provider_reported' else 'Not recorded'
    markup += '<tr><th>Token pricing</th><td>' + basis + '</td></tr>\n'
    return markup + '<tr><th>Total token cost</th><td class="mono-value">' + format_token_cost(record) + '</td></tr>\n'
