"""Attach reviewed, source-bound drawings without changing recorded fragments.

Only the reviewed structural X/R/C subset is accepted. This
is an ordered-pin/value check, not a topology isomorphism or simulation engine.
"""
from decimal import Decimal
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
    return Decimal(match[1]) * Decimal(10) ** SCALES.get((match[2] or '').lower(), 0)


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
        number(value)
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
                            {key: number(value) for key, value in item['parameters'].items()})
                       for ref, item in devices.items()}, {key: number(value) for key, value in definitions.items()}


def resolved_spice(text):
    """Comparison view only; retained artifacts still contain source expressions."""
    interface, devices = parse_spice(text)
    lines = ['.subckt ' + ' '.join(interface)]
    for item in devices.values():
        words = [item['reference'], *item['pins']]
        if item['reference'][0].lower() == 'x':
            words += [item['model'], *(key + '=' + value for key, value in item['parameters'].items())]
        else:
            words.append(item['parameters']['value'])
        lines.append(' '.join(words))
    return '\n'.join([*lines, '.ends ' + interface[0], ''])


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
        if (report['source_sha256'] != entry['source_sha256'] or report['generator'] != manifest['generator'] or
                (report['native_comparison']['status'] != 'match' and not
                 (report['native_comparison']['status'] == 'inconclusive' and
                  report.get('numeric_constants_checked') is True and
                  report.get('resolved_native_comparison', {}).get('status') == 'match')) or not report['native_reopen'] or
                not report['body_defaults_checked'] or not report['saved_display_values_checked'] or report['visible_wiring']['status'] != 'connected' or
                report['native_unrouted_connections'] != 0 or report['native_diagnostics']):
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
    return (
        '<figure class="submission-schematic" aria-label="Submitted circuit schematic">'
        '<div class="schematic-scroll" tabindex="0" role="region" aria-label="Circuit diagram; scroll horizontally to inspect">'
        '<img src="' + prefix + 'schematic.svg?v=' + entry['files']['schematic.svg'] + '" alt="' + escape(entry['title'], quote=True) +
        '. ' + escape(entry['description'], quote=True) + '" loading="eager"' + style + '/></div></figure>\n'
    )


def drawing_for_submission(trace, entry):
    if entry is None:
        return ''
    matches = list(re.finditer(SUBMISSION, trace, re.S))
    if len(matches) != 1 or html.unescape(matches[0][1]) != entry['source']:
        raise ValueError('Schematic does not describe the frozen final submission: ' + entry['run_id'])
    return render_drawing(entry)
