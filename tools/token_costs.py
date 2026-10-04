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


def cost_components(counts, rates):
    rows = [('Uncached input', counts['uncached_input_tokens'], rates['input']),
            ('Cached input', counts['cache_read_tokens'], rates['cache_read'])]
    writes = counts['cache_write_tokens']
    if 'cache_write_1h' in rates and writes not in (None, 0):
        ttl = counts.get('cache_write_ttl_tokens') or {}
        short, long = ttl.get('ephemeral_5m_input_tokens'), ttl.get('ephemeral_1h_input_tokens')
        if (type(short) is not int or type(long) is not int or min(short, long) < 0 or
                short + long != writes):
            raise ValueError('Cache-write durations do not reconcile')
        rows.extend((label, count, rate) for label, count, rate in [
            ('Cache write (5m)', short, rates['cache_write']),
            ('Cache write (1h)', long, rates['cache_write_1h'])] if count)
    else:
        rows.append(('Cache write', writes, rates['cache_write']))
    return rows + [('Output', counts['output_tokens'], rates['output'])]


def estimate_cost(counts, rates):
    components = cost_components(counts, rates)
    if any(count is None for _, count, _ in components):
        return None
    # Reasoning is a subset of output, not an additional billable category.
    return sum(Decimal(count) * decimal_cost(rate)
               for _, count, rate in components) / Decimal(1_000_000)


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
    reported_cost = reported.pop() if reported else None
    if model in pricing['models']:
        cost = estimate_cost({**counts, 'cache_write_ttl_tokens': usage['normalized'].get('cache_write_ttl_tokens')},
                             pricing['models'][model]['usd_per_million'])
        basis = 'list_price_calculation'
    elif reported_cost is not None:
        cost, basis = reported_cost, 'provider_reported'
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
        'reported_cost_usd': str(reported_cost) if reported_cost is not None else None,
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
        if basis == 'list_price_calculation':
            expected = estimate_cost(record, pricing['models'][record['model_id']]['usd_per_million'])
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
    return '$' + format(decimal_cost(record['total_cost_usd']), '.2f')


def render_token_summary(record, pricing):
    rates = pricing['models'][record['model_id']]['usd_per_million']
    components = cost_components(record, rates)
    if record['model_id'].startswith('claude-'):
        writes = [(count, rate) for label, count, rate in components if label.startswith('Cache write')]
        quantity = record['cache_write_tokens']
        # A single visible cache-write row retains its duration-specific rate.
        write_rate = writes[0][1]
        if len(writes) > 1:
            write_rate = sum(Decimal(count) * decimal_cost(rate) for count, rate in writes) / Decimal(quantity)
            write_rate = format(write_rate.quantize(Decimal('0.000001')), 'f')
        rows = [('Uncached input', record['uncached_input_tokens'], rates['input']),
                ('Cached input', record['cache_read_tokens'], rates['cache_read']),
                ('Cache write', quantity, write_rate),
                ('Output', record['output_tokens'], rates['output'])]
    else:
        rows = [row for row in components if not row[0].startswith('Cache write')]
    markup = '<table class="summary-table token-cost-table"><caption>Token cost</caption>\n'
    markup += '<thead><tr><th scope="col">Type</th><th scope="col">Tokens</th><th scope="col">Cost</th></tr></thead>\n<tbody>\n'
    for label, count, rate in rows:
        quantity = f'{count:,}' if count is not None else 'Not recorded'
        price = '$' + format(decimal_cost(rate), 'f') + ' / 1M' if rate is not None else 'Included'
        markup += '<tr><th scope="row">' + html.escape(label) + '</th><td class="mono-value">' + quantity + \
                  '</td><td class="mono-value">' + price + '</td></tr>\n'
    return markup + '</tbody><tfoot><tr><th scope="row">Total token cost</th><td></td><td class="mono-value">' + \
           format_token_cost(record) + '</td></tr></tfoot></table>\n'
