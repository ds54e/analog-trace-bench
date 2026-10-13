"""Attach reviewed, source-bound drawings without changing recorded fragments.

Only the reviewed structural X/R/C subset is accepted. This
is an ordered-pin/value check, not a topology isomorphism or simulation engine.
"""
import ast
from decimal import Decimal
from fractions import Fraction
import hashlib
import html
import json
import re

FILES = ('schematic.svg', 'project.icproj.json', 'submitted.spice', 'exported.spice', 'verification.json')
SUBMISSION = r'<pre data-field="submitted-spice"[^>]*><code>(.*?)</code></pre>'
SCALES = {'t': 12, 'g': 9, 'meg': 6, 'k': 3, 'm': -3, 'u': -6, 'n': -9, 'p': -12, 'f': -15}


def number(value):
    match = re.fullmatch(r'([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)(meg|[tgkmunpf])?', value, re.I)
    if not match:
        raise ValueError('Unsupported schematic numeric value: ' + value)
    literal = Decimal(match[1]).as_tuple()
    scale = SCALES.get((match[2] or '').lower(), 0)
    # Decimal arithmetic obeys the caller's precision context, including a
    # multiplication by one. Adjust the stored exponent instead so source
    # literals retain every submitted digit before any contract comparison.
    return Decimal((literal.sign, literal.digits, literal.exponent + scale))


def constant_value(value):
    """Compare literal arithmetic exactly, without evaluating arbitrary SPICE.

    The LDO input-translation network uses three brace-wrapped numeric
    expressions. Restrict support to decimal literals and +, -, *, /; names,
    calls, powers and unit suffixes inside arithmetic remain unsupported.
    Fractions avoid silently accepting a rounded export of a repeating value.
    """
    if not (value.startswith('{') and value.endswith('}')):
        return number(value)
    expression = value[1:-1].strip()
    if len(expression) > 256 or not re.fullmatch(r'[0-9eE.+*/()\-\s]+', expression):
        raise ValueError('Unsupported schematic constant expression: ' + value)
    try:
        tree = ast.parse(expression, mode='eval')
        if sum(1 for _ in ast.walk(tree)) > 100:
            raise ValueError('Schematic constant expression is too complex')
        def bounded(result):
            if max(result.numerator.bit_length(), result.denominator.bit_length()) > 512:
                raise ValueError('Schematic constant expression is too large')
            return result
        def evaluate(node):
            if isinstance(node, ast.Constant) and type(node.value) in (int, float):
                literal = ast.get_source_segment(expression, node)
                match = re.fullmatch(r'(\d+(?:\.\d*)?|\.\d+)(?:[eE]([+-]?\d+))?', literal)
                if not match or len(match[1]) > 64 or abs(int(match[2] or '0')) > 64:
                    raise ValueError('Schematic constant literal is too large or unsupported')
                return bounded(Fraction(Decimal(literal)))
            if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
                operand = evaluate(node.operand)
                return operand if isinstance(node.op, ast.UAdd) else -operand
            if isinstance(node, ast.BinOp):
                left, right = evaluate(node.left), evaluate(node.right)
                if isinstance(node.op, ast.Add):
                    return bounded(left + right)
                if isinstance(node.op, ast.Sub):
                    return bounded(left - right)
                if isinstance(node.op, ast.Mult):
                    return bounded(left * right)
                if isinstance(node.op, ast.Div):
                    return bounded(left / right)
            raise ValueError('Unsupported schematic constant expression: ' + value)
        return evaluate(tree.body)
    except (SyntaxError, ZeroDivisionError, OverflowError, RecursionError) as exc:
        raise ValueError('Invalid schematic constant expression: ' + value) from exc


def display_value(value):
    numeric = number(value)
    for exponent, suffix in [(6, 'M'), (3, 'k'), (0, ''), (-3, 'm'), (-6, 'u'), (-9, 'n'), (-12, 'p'), (-15, 'f')]:
        if abs(numeric) >= Decimal(10) ** exponent:
            text = format(numeric / Decimal(10) ** exponent, 'f')
            if '.' in text:
                text = text.rstrip('0').rstrip('.')
            return text + suffix
    raise ValueError('Unsupported zero or sub-femto schematic value')


def parse_spice(text, *, include_parameters=False):
    interface = None
    devices = {}
    ended = False
    definitions = {}
    def declare(assignments):
        for assignment in assignments:
            if '=' not in assignment:
                raise ValueError('Unsupported schematic parameter declaration')
            key, value = assignment.split('=', 1)
            key = key.lower()
            if not re.fullmatch(r'[a-z][a-z0-9_]*', key) or key in definitions:
                raise ValueError('Invalid or duplicate schematic declaration')
            number(value)
            definitions[key] = value
    def literal(value):
        match = re.fullmatch(r'\{([a-z][a-z0-9_]*)\}', value, re.I)
        if match:
            if match[1].lower() not in definitions:
                raise ValueError('Undefined schematic parameter')
            return definitions[match[1].lower()]
        constant_value(value)
        return value
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith('*'):
            continue
        words = line.split()
        kind = words[0].lower()
        if kind == '.subckt':
            if interface or ended or len(words) < 3:
                raise ValueError('Expected one schematic subcircuit')
            param_index = next((i for i, word in enumerate(words) if word.lower() == 'params:'), len(words))
            interface = tuple(word.lower() for word in words[1:param_index])
            declare(words[param_index + 1:])
        elif kind == '.param':
            if not interface or ended:
                raise ValueError('Declaration outside schematic subcircuit')
            declare(words[1:])
        elif kind == '.ends':
            if not interface or ended or (len(words) > 1 and words[1].lower() != interface[0]):
                raise ValueError('Invalid schematic subcircuit end')
            ended = True
        else:
            if not interface or ended:
                raise ValueError('Device outside schematic subcircuit')
            ref = words[0]
            parameters = {}
            if ref[0].lower() == 'x' and len(words) >= 6:
                pins, model = words[1:5], words[5]
                if model.lower() not in ('sky130_fd_pr__nfet_01v8', 'sky130_fd_pr__pfet_01v8'):
                    raise ValueError('Unsupported schematic device model: ' + model)
                for assignment in words[6:]:
                    if '=' not in assignment:
                        raise ValueError('Unsupported schematic parameter')
                    key, value = assignment.split('=', 1)
                    if key.lower() in parameters:
                        raise ValueError('Duplicate schematic parameter')
                    parameters[key.lower()] = literal(value)
                if not {'w', 'l'} <= parameters.keys():
                    raise ValueError('Incomplete MOS geometry')
                parameters.setdefault('nf', '1')
                parameters.setdefault('m', '1')
            elif ref[0].lower() in ('r', 'c') and len(words) == 4:
                pins, model = words[1:3], ref[0].upper()
                parameters = {'value': literal(words[3])}
            else:
                raise ValueError('Unsupported schematic statement: ' + words[0])
            if ref.lower() in devices:
                raise ValueError('Duplicate schematic reference: ' + ref)
            devices[ref.lower()] = {'reference': ref, 'pins': pins, 'model': model, 'parameters': parameters}
    if not interface or not ended or not devices:
        raise ValueError('Incomplete schematic SPICE')
    if include_parameters:
        return interface, devices, definitions
    return interface, devices


def contract(text):
    interface, devices, definitions = parse_spice(text, include_parameters=True)
    return interface, {ref: (tuple(pin.lower() for pin in item['pins']), item['model'].lower(),
                            {key: constant_value(value) for key, value in item['parameters'].items()})
                       for ref, item in devices.items()}, {key: number(value) for key, value in definitions.items()}


def resolved_spice(text):
    """Comparison view only; retained artifacts still contain source expressions."""
    interface, devices = parse_spice(text)
    lines = ['.subckt ' + ' '.join(interface)]
    def resolved(value):
        exact = constant_value(value)
        if isinstance(exact, Fraction):
            return str(Decimal(exact.numerator) / Decimal(exact.denominator))
        return value
    for item in devices.values():
        words = [item['reference'], *item['pins']]
        if item['reference'][0].lower() == 'x':
            words += [item['model'], *(key + '=' + resolved(value) for key, value in item['parameters'].items())]
        else:
            words.append(resolved(item['parameters']['value']))
        lines.append(' '.join(words))
    return '\n'.join([*lines, '.ends ' + interface[0], ''])


def diagnostics_match_source(report, source, run_id, project):
    """Retain the one reviewed source-open warning without permitting new ERC."""
    diagnostics = report['native_diagnostics']
    bound = report.get('source_bound_diagnostics', [])
    if run_id != 'ldo-low-voltage-sky130-deepseek-r2':
        return not diagnostics and not bound
    expected_bound = [{
        'code': 'ERC_UNCONNECTED_PIN', 'reference': 'XM5', 'pin': 'D', 'net': 'S1',
        'reason': 'The submitted drain net S1 has one non-body terminal; the native drawing preserves this source-open terminal.',
    }]
    if bound != expected_bound:
        return False
    interface, devices = parse_spice(source)
    pins = [(item['reference'], pin) for item in devices.values()
            for pin, net in zip(('D', 'G', 'S', 'B') if item['reference'].lower().startswith('x') else ('1', '2'), item['pins'])
            if net.lower() == 's1']
    if pins != [('XM5', 'D')] or 's1' in interface[1:]:
        return False
    document = next(d for d in project['documents'] if d['id'] == project['topDocumentId'])
    net_ids = {e['netId'] for e in document['connectivityEvidence']
               if e['kind'] == 'net-name-hint' and e['sourceName'].lower() == 's1'}
    if len(net_ids) != 1:
        return False
    net_id = net_ids.pop()
    context = {'documentId': document['id'], 'hierarchyPath': []}
    expected = [{
        'id': 'erc:unconnected-pin:' + document['id'] + ':XM5:D',
        'domain': 'erc', 'code': 'ERC_UNCONNECTED_PIN', 'severity': 'warning',
        'confidence': 'high', 'gateEligible': False,
        'message': 'Pin XM5.D is the only endpoint on net ' + net_id,
        'primary': {**context, 'kind': 'terminal', 'objectId': 'XM5:D',
                    'endpoint': {'kind': 'terminal', 'instanceId': 'XM5', 'pinName': 'D'}},
        'related': [{**context, 'kind': 'net', 'objectId': net_id}],
        'parameters': {'instanceId': 'XM5', 'pinName': 'D', 'netId': net_id},
    }]
    return diagnostics == expected


def load_drawings(root):
    path = root / 'site/schematics/index.json'
    if not path.is_file():
        return {}
    manifest = json.loads(path.read_text(encoding='utf-8'))
    if manifest['schema'] != 1:
        raise ValueError('Unsupported schematic manifest')
    drawings = {}
    for entry in manifest['drawings']:
        run_id = entry['run_id']
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', run_id) or run_id in drawings:
            raise ValueError('Invalid or duplicate schematic run ID')
        folder = root / 'site/schematics' / run_id
        if set(entry['files']) != set(FILES):
            raise ValueError('Incomplete schematic artifacts: ' + run_id)
        for name in FILES:
            if hashlib.sha256((folder / name).read_bytes()).hexdigest() != entry['files'][name]:
                raise ValueError('Schematic artifact differs: ' + run_id + ' / ' + name)
        source = (folder / 'submitted.spice').read_text(encoding='utf-8')
        if hashlib.sha256(source.encode()).hexdigest() != entry['source_sha256']:
            raise ValueError('Schematic source hash differs: ' + run_id)
        if contract(source) != contract((folder / 'exported.spice').read_text(encoding='utf-8')):
            raise ValueError('Schematic ordered pins or values differ: ' + run_id)
        report = json.loads((folder / 'verification.json').read_text(encoding='utf-8'))
        project = json.loads((folder / 'project.icproj.json').read_text(encoding='utf-8'))
        if (report['source_sha256'] != entry['source_sha256'] or report['generator'] != manifest['generator'] or
                (report['native_comparison']['status'] != 'match' and not
                 (report['native_comparison']['status'] == 'inconclusive' and
                  report.get('numeric_constants_checked') is True and
                  report.get('resolved_native_comparison', {}).get('status') == 'match')) or not report['native_reopen'] or
                not report['body_defaults_checked'] or not report['saved_display_values_checked'] or report['visible_wiring']['status'] != 'connected' or
                report['native_unrouted_connections'] != 0 or
                not diagnostics_match_source(report, source, run_id, project)):
            raise ValueError('Schematic verification incomplete: ' + run_id)
        drawings[run_id] = {**entry, 'source': source}
    return drawings


def render_drawing(entry):
    escape = html.escape
    prefix = '../schematics/' + entry['run_id'] + '/'
    width = entry.get('reading_min_width')
    if width is not None and (type(width) is not int or not 408 <= width <= 10000):
        raise ValueError('Invalid schematic reading width')
    style = ' style="min-width:' + str(width) + 'px"' if width else ''
    svg = prefix + 'schematic.svg?v=' + entry['files']['schematic.svg']
    image = ('<img src="' + svg + '" alt="' + escape(entry['title'], quote=True) +
             '. ' + escape(entry['description'], quote=True) + '" loading="eager"' + style + '/>')
    image = '<a class="schematic-fullsize" href="' + svg + '" target="_blank" rel="noopener">' + image + '</a>'
    return (
        '<figure class="submission-schematic" aria-label="Submitted circuit schematic">'
        '<div class="schematic-scroll" tabindex="0" role="region" aria-label="Circuit diagram; scroll horizontally to inspect">'
        + image + '</div></figure>\n'
    )


def drawing_for_submission(trace, entry):
    if entry is None:
        return ''
    matches = list(re.finditer(SUBMISSION, trace, re.S))
    if len(matches) != 1 or html.unescape(matches[0][1]) != entry['source']:
        raise ValueError('Schematic does not describe the frozen final submission: ' + entry['run_id'])
    return render_drawing(entry)
