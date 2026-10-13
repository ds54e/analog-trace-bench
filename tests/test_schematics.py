import copy
from decimal import Decimal, localcontext
import hashlib
import html
import json
from fractions import Fraction
import math
from pathlib import Path
import re
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import schematics
from build_traces import rendered_traces
from site_templates import ROOT


def endpoint_key(endpoint):
    return tuple(endpoint['terminal']) if 'terminal' in endpoint else (endpoint['junction'],)


def endpoint_positions(project, document):
    symbols = {item['symbol']['id']: item['symbol'] for item in project['componentDefinitions']}
    positions = {(j['id'],): tuple(j['coordinate']) for j in document['junctions']}
    for instance in document['instances']:
        instance = {**project['defaults'].get('instance', {}),
                    **project['defaults']['instancesByType'].get(instance['type'], {}), **instance}
        symbol = symbols[instance['type']]
        rotation = instance.get('rotation', 0) % 360
        if rotation not in (0, 90, 180, 270):
            raise ValueError('Unsupported saved instance rotation')
        mirror = instance.get('mirror', 'none')
        if mirror not in ('none', 'horizontal', 'vertical', 'both'):
            raise ValueError('Unsupported saved instance mirror')
        for pin in symbol['pins']:
            x, y = pin['at']['x'], pin['at']['y']
            for _ in range(rotation // 90):
                x, y = -y, x
            if mirror in ('horizontal', 'both'):
                x = -x
            if mirror in ('vertical', 'both'):
                y = -y
            positions[(instance['id'], pin['name'])] = (x + instance['coordinate'][0], y + instance['coordinate'][1])
    return positions


def physical_graph(document, project):
    """Use saved authored routes only, never import hints or name connections."""
    graph = {}
    positions = endpoint_positions(project, document)
    def edge(a, b):
        graph.setdefault(a, set()).add(b)
        graph.setdefault(b, set()).add(a)
    for route in document['routes']:
        a = endpoint_key(route['start'])
        b = endpoint_key(route.get('end') or route['legs'][-1])
        legs = route.get('legs', [route.get('end')])
        points = [positions[a]] + [tuple(leg['coordinate']) if 'coordinate' in leg else positions[endpoint_key(leg)]
                                   for leg in legs]
        if not all(math.isfinite(value) for point in points for value in point):
            raise ValueError('Non-finite saved route coordinate')
        if any(x != nx and y != ny for (x, y), (nx, ny) in zip(points, points[1:])):
            raise ValueError('Non-orthogonal saved route: ' + route['id'])
        edge(a, b)
    for contact in document['connections']['contacts']:
        keys = [endpoint_key(endpoint) for endpoint in contact]
        if len({positions[key] for key in keys}) != 1:
            raise ValueError('Saved contact joins non-coincident endpoints')
        for key in keys[1:]:
            edge(keys[0], key)
    return graph


def reachable(graph, start):
    seen, todo = set(), [start]
    while todo:
        node = todo.pop()
        if node not in seen:
            seen.add(node)
            todo.extend(graph.get(node, ()))
    return seen


def source_endpoints(devices):
    endpoints = {}
    for item in devices.values():
        pins = ['D', 'G', 'S'] if item['reference'].lower().startswith('x') else ['1', '2']
        for pin, net in zip(pins, item['pins']):
            endpoints.setdefault(net.lower(), set()).add((item['reference'], pin))
    return endpoints


class SubmittedSchematics(unittest.TestCase):
    def test_all_ota_and_ldo_runs_match_frozen_submissions_and_keep_spice_bytes(self):
        drawings = schematics.load_drawings(ROOT)
        catalog = json.loads((ROOT / 'site/data/runs.json').read_text())
        ota = {r['id'] for t in catalog['tasks'] if t['id'].upper().startswith('OTA-') for r in t['runs']}
        ldo = {r['id'] for t in catalog['tasks'] if t['id'].upper().startswith('LDO-') for r in t['runs']}
        self.assertEqual(len(ota), 121)
        self.assertEqual(len(ldo), 98)
        self.assertEqual(set(drawings), ota | ldo)
        pages = rendered_traces(ROOT)
        routes = {r['id']: r['trace'] for t in catalog['tasks'] for r in t['runs']}
        for run_id, entry in drawings.items():
            trace = (ROOT / 'content/traces' / run_id / 'trace.html').read_text()
            drawing = schematics.drawing_for_submission(trace, entry)
            self.assertEqual(re.search(r'href="([^"]+)"', drawing)[1],
                             re.search(r'src="([^"]+)"', drawing)[1])
            attached = pages[routes[run_id]]
            self.assertEqual(re.findall(schematics.SUBMISSION, trace, re.S),
                             re.findall(schematics.SUBMISSION, attached, re.S))
            self.assertLess(attached.index('class="run-tabs"'), attached.index('<figure class="submission-schematic"'))
            self.assertLess(attached.index('<figure class="submission-schematic"'), attached.index('aria-label="Run summary"'))
            self.assertLess(attached.index('aria-label="Run summary"'), attached.index('<pre data-field="submitted-spice"'))
            self.assertEqual(attached.count('class="submission-schematic"'), 1)
            self.assertNotIn('<figcaption', drawing)
            self.assertNotIn('submission-schematic', re.search(r'<article[^>]*aria-label="Final submitted SPICE"[^>]*>(.*?)</article>', attached, re.S)[1])
            changed = dict(entry, source=entry['source'] + '\n')
            with self.assertRaisesRegex(ValueError, 'frozen final submission'):
                schematics.drawing_for_submission(trace, changed)
        self.assertEqual(schematics.drawing_for_submission('unselected trace', None), '')

    def test_power_ports_are_horizontal_in_saved_projects(self):
        for entry in schematics.load_drawings(ROOT).values():
            project = json.loads((ROOT / 'site/schematics' / entry['run_id'] / 'project.icproj.json').read_text())
            document = project['documents'][0]
            power = {'vss', 'vdd'}
            if entry.get('layout_strategy') == 'connected-ldo':
                power.add('vin')
            for terminal in document['netlist']['terminals']:
                if terminal['name'].lower() in power:
                    port = next(i for i in document['instances'] if i['id'] in terminal['interfaceInstanceIds'])
                    self.assertEqual(port.get('rotation', 0) % 180, 0, (entry['run_id'], terminal['name']))

    def test_saved_projects_preserve_source_models_interfaces_and_body_defaults(self):
        for entry in schematics.load_drawings(ROOT).values():
            with self.subTest(run_id=entry['run_id']):
                project = json.loads((ROOT / 'site/schematics' / entry['run_id'] / 'project.icproj.json').read_text())
                document = next(d for d in project['documents'] if d['id'] == project['topDocumentId'])
                interface, devices, constants = schematics.parse_spice(entry['source'], include_parameters=True)
                embedded = next(f for f in project['source']['files'] if f['path'] == 'submitted.spice')
                self.assertEqual(embedded['content']['text'], entry['source'])
                self.assertEqual(embedded['hash'], 'sha256:' + entry['source_sha256'])
                self.assertEqual(tuple([document['netlist']['name'].lower()] +
                                      [t['name'].lower() for t in document['netlist']['terminals']]), interface)
                self.assertEqual({p['name'].lower(): schematics.number(p['defaultValue'])
                                  for p in document['netlist']['formalParameters']},
                                 {name: schematics.number(value) for name, value in constants.items()})
                instances = {i['name'].lower(): i for i in document['instances'] if 'name' in i}
                self.assertEqual(set(instances), set(devices))
                net_names = {e['netId']: e['sourceName'].lower() for e in document['connectivityEvidence']
                             if e['kind'] == 'net-name-hint'}
                definitions = {d['id']: d for d in project['externalSubcircuitDefinitions']}
                components = {d['symbol']['id']: d for d in project['componentDefinitions']}
                for ref, item in devices.items():
                    instance = instances[ref]
                    parameters = {p['name']: p['defaultValue'] for p in components[instance['type']]['electrical']['parameters']}
                    parameters.update(project['defaults']['instancesByType'].get(instance['type'], {}).get('parameters', {}))
                    parameters.update(instance.get('parameters', {}))
                    if not ref.startswith('x'):
                        self.assertEqual(schematics.constant_value(parameters['value']),
                                         schematics.constant_value(item['parameters']['value']), ref)
                        continue
                    target = instance.get('target') or project['defaults']['instancesByType'][instance['type']]['target']
                    model = definitions[target['definitionId']]
                    self.assertEqual(model['name'].lower(), item['model'].lower(), ref)
                    self.assertEqual([t['name'] for t in model['terminals']], ['D', 'G', 'S', 'B'], ref)
                    self.assertEqual(net_names[document['mosBulkDefaults'][instance['type'] + 'NetId']],
                                     item['pins'][3].lower(), ref)
                    for parameter in ('nf', 'm'):
                        self.assertEqual(schematics.number(parameters[parameter]),
                                         schematics.number(item['parameters'][parameter]), (ref, parameter))
                    for parameter in ('w', 'l'):
                        value = parameters[parameter]
                        scaled_constant = re.fullmatch(r'\{\(([a-z][a-z0-9_]*)\) \* 1u\}', value, re.I)
                        actual = (schematics.number(constants[scaled_constant[1].lower()]) * schematics.number('1u')
                                  if scaled_constant else schematics.number(value))
                        self.assertEqual(actual, schematics.number(item['parameters'][parameter]) * schematics.number('1u'),
                                         (ref, parameter))

    def test_saved_physical_routes_do_not_short_source_nets_or_detach_ports(self):
        for entry in schematics.load_drawings(ROOT).values():
            with self.subTest(run_id=entry['run_id']):
                project = json.loads((ROOT / 'site/schematics' / entry['run_id'] / 'project.icproj.json').read_text())
                document = project['documents'][0]
                _, devices = schematics.parse_spice(entry['source'])
                endpoints = source_endpoints(devices)
                graph = physical_graph(document, project)
                for terminal in document['netlist']['terminals']:
                    port = (terminal['interfaceInstanceIds'][0], 'P')
                    name = terminal['name'].lower()
                    self.assertTrue(endpoints[name] & reachable(graph, port), ('detached port', name))
                    endpoints[name].add(port)
                owners = {pin: net for net, pins in endpoints.items() for pin in pins}
                visited = set()
                for start in graph:
                    if start in visited:
                        continue
                    component = reachable(graph, start)
                    visited.update(component)
                    nets = {owners[pin] for pin in component if pin in owners}
                    self.assertLessEqual(len(nets), 1, ('physical short', sorted(nets), sorted(component)))

    def test_new_ldo_feedback_bias_and_compensation_are_physically_continuous(self):
        entries = [e for e in schematics.load_drawings(ROOT).values() if e.get('layout_strategy') == 'connected-ldo']
        self.assertEqual(len(entries), 97)
        for entry in entries:
            with self.subTest(run_id=entry['run_id']):
                folder = ROOT / 'site/schematics' / entry['run_id']
                project = json.loads((folder / 'project.icproj.json').read_text())
                document = project['documents'][0]
                report = json.loads((folder / 'verification.json').read_text())
                _, devices = schematics.parse_spice(entry['source'])
                endpoints = source_endpoints(devices)
                # Derive the required set from the submission, not the report:
                # a forgotten feedback/buffer/bias net must not weaken this test.
                continuous = set(endpoints) - {'vin', 'vss'}
                self.assertEqual(set(report['visible_wiring']['continuous_signal_nets']), continuous)
                graph = physical_graph(document, project)
                for terminal in document['netlist']['terminals']:
                    endpoints[terminal['name'].lower()].add((terminal['interfaceInstanceIds'][0], 'P'))
                for net in continuous:
                    pins = endpoints[net]
                    self.assertLessEqual(pins, reachable(graph, next(iter(pins))), net)
                for item in devices.values():
                    if item['reference'].lower().startswith('x') and item['pins'][0].lower() == item['pins'][1].lower():
                        ref = item['reference']
                        self.assertIn((ref, 'G'), reachable(graph, (ref, 'D')), ('local diode', ref))
                for node, adjacent in graph.items():
                    if len(node) == 1:
                        self.assertLessEqual(len(adjacent), 3, ('four-way join', node))
                self.assertIs(report['simulation_run'], False)

    def test_free_ports_and_reviewed_load_mirrors_have_physical_routes(self):
        mirrors = {
            'sonnet-5-5-r1': [('XM3', 'D'), ('XM3', 'G'), ('XM4', 'G')],
            'haiku-r3': [('XM3', 'D'), ('XM3', 'G'), ('XM4', 'G')],
            'luna-6-r3': [('XLOADD', 'D'), ('XLOADD', 'G'), ('XLOADM', 'G')],
            'luna-6-r2': [('XMPREF', 'D'), ('XMPREF', 'G'), ('XMPLOAD', 'G')],
            'sol-6-1-r2': [('XPCD', 'D'), ('XPD', 'G'), ('XPM', 'G')],
            'deepseek-r3': [('XM5', 'D'), ('XM3', 'G'), ('XM4', 'G')],
            'opus-5-5-r2': [('XMNB', 'D'), ('XMNB', 'G'), ('XMNA', 'G')],
            'opus-5-5-r3': [('XM7', 'D'), ('XM7', 'G'), ('XM8', 'G')],
            'sonnet-5-5-r3': [('XM5', 'D'), ('XM9', 'G'), ('XM10', 'G')],
            'sol-6-r1': [('XNML', 'D'), ('XNML', 'G'), ('XNMR', 'G')],
            'sol-6-r3': [('XNM1', 'D'), ('XNM1', 'G'), ('XNM2', 'G')],
        }
        for path in (ROOT / 'site/schematics').glob('ota-free-*/project.icproj.json'):
            doc = json.loads(path.read_text())['documents'][0]
            graph = {}
            def key(endpoint):
                return tuple(endpoint['terminal']) if 'terminal' in endpoint else (endpoint['junction'],)
            for route in doc['routes']:
                a, b = key(route['start']), key(route.get('end') or route['legs'][-1])
                graph.setdefault(a, set()).add(b)
                graph.setdefault(b, set()).add(a)
            def reachable(start):
                seen, todo = set(), [start]
                while todo:
                    current = todo.pop()
                    if current in seen:
                        continue
                    seen.add(current)
                    todo.extend(graph.get(current, ()))
                return seen
            refs = {i['id'] for i in doc['instances'] if 'name' in i}
            for terminal in doc['netlist']['terminals']:
                port = terminal['interfaceInstanceIds'][0]
                self.assertTrue(any(len(k) == 2 and k[0] in refs for k in reachable((port, 'P'))),
                                (path.parent.name, terminal['name']))
            case = path.parent.name.removeprefix('ota-free-sky130-')
            if case in mirrors:
                endpoints = mirrors[case]
                self.assertTrue(set(endpoints) <= reachable(endpoints[0]), (case, endpoints))

    def test_reviewed_free_overview_opens_its_same_verified_svg(self):
        entries = [e for e in schematics.load_drawings(ROOT).values() if e.get('layout_strategy') == 'reviewed-free']
        self.assertEqual(len(entries), 11)
        for entry in entries:
            self.assertNotIn('reading_min_width', entry)
            html = schematics.render_drawing(entry)
            self.assertEqual(re.search(r'href="([^"]+)"', html)[1],
                             re.search(r'src="([^"]+)"', html)[1])
            self.assertNotIn('<figcaption', html)
            self.assertNotIn('min-width', html)

    def test_expanded_ota_signal_routes_do_not_depend_on_net_labels(self):
        drawings = schematics.load_drawings(ROOT)
        entries = [e for e in drawings.values() if e.get('layout_strategy') == 'connected-stages']
        self.assertEqual(len(entries), 61)
        for entry in entries:
            folder = ROOT / 'site/schematics' / entry['run_id']
            doc = json.loads((folder / 'project.icproj.json').read_text())['documents'][0]
            report = json.loads((folder / 'verification.json').read_text())
            continuous = report['visible_wiring']['continuous_signal_nets']
            self.assertTrue({'vinp', 'vinn', 'vout'} <= set(continuous), entry['run_id'])
            graph = {}
            def key(endpoint):
                return tuple(endpoint['terminal']) if 'terminal' in endpoint else (endpoint['junction'],)
            for route in doc['routes']:
                a, b = key(route['start']), key(route.get('end') or route['legs'][-1])
                graph.setdefault(a, set()).add(b)
                graph.setdefault(b, set()).add(a)
            def reachable(start):
                seen, todo = set(), [start]
                while todo:
                    node = todo.pop()
                    if node not in seen:
                        seen.add(node)
                        todo.extend(graph.get(node, ()))
                return seen
            for node, adjacent in graph.items():
                if len(node) == 1:
                    self.assertLessEqual(len(adjacent), 3, (entry['run_id'], node))
            _, devices = schematics.parse_spice(entry['source'])
            endpoints = {}
            for item in devices.values():
                ref, pins = item['reference'], item['pins']
                names = ['D', 'G', 'S'] if ref.lower().startswith('x') else ['1', '2']
                for pin, net in zip(names, pins):
                    endpoints.setdefault(net.lower(), []).append((ref, pin))
                if len(pins) == 4 and pins[0].lower() == pins[1].lower():
                    self.assertIn((ref, 'G'), reachable((ref, 'D')), (entry['run_id'], ref))
            for terminal in doc['netlist']['terminals']:
                port = (terminal['interfaceInstanceIds'][0], 'P')
                name = terminal['name'].lower()
                self.assertTrue(set(endpoints[name]) & reachable(port), (entry['run_id'], name))
                endpoints[name].append(port)
            for net in continuous:
                pins = endpoints[net]
                self.assertTrue(set(pins) <= reachable(pins[0]), (entry['run_id'], net))
            html = schematics.render_drawing(entry)
            self.assertEqual(re.search(r'href="([^"]+)"', html)[1],
                             re.search(r'src="([^"]+)"', html)[1])
            self.assertNotIn('reading_min_width', entry)

    def test_numeric_constants_and_mos_defaults_preserve_the_contract(self):
        source = (ROOT / 'site/schematics/ota-drive-sky130-sonnet-5-5-r3/submitted.spice').read_text()
        exported = (ROOT / 'site/schematics/ota-drive-sky130-sonnet-5-5-r3/exported.spice').read_text()
        self.assertEqual(schematics.contract(source), schematics.contract(exported))
        literal = schematics.resolved_spice(source)
        self.assertNotIn('{', literal)
        self.assertNotIn('.param', literal)
        self.assertEqual(schematics.contract(literal)[:2], schematics.contract(source)[:2])
        self.assertNotEqual(schematics.contract(source), schematics.contract(source.replace('lm=0.25', 'lm=0.26')))
        mos = '.subckt DUT D G S\nX1 D G S S sky130_fd_pr__nfet_01v8 w=1 l=1\n.ends DUT\n'
        self.assertEqual(schematics.contract(mos), schematics.contract(mos.replace('l=1', 'l=1 nf=1 m=1')))
        self.assertNotEqual(schematics.contract(mos), schematics.contract(mos.replace('l=1', 'l=1 m=2')))

    def test_numeric_contract_keeps_all_literal_digits_independent_of_decimal_context(self):
        value = '123456789012345678901234567890.1'
        distinct = '123456789012345678901234567890.2'
        source = '.subckt DUT A B\nR1 A B ' + value + '\n.ends DUT\n'
        with localcontext() as context:
            context.prec = 6
            self.assertEqual(schematics.number(value), Decimal(value))
            self.assertEqual(schematics.number(value + 'p'), Decimal('123456789012345678.9012345678901'))
            self.assertNotEqual(schematics.contract(source), schematics.contract(source.replace(value, distinct)))
            self.assertEqual(schematics.contract(source),
                             schematics.contract(source.replace(value, '{1234567890123456789012345678901/10}')))
            self.assertNotEqual(schematics.contract(source),
                                schematics.contract(source.replace(value, '{1234567890123456789012345678902/10}')))

    def test_ldo_literal_arithmetic_is_exact_and_never_replaces_source_expressions(self):
        trace = (ROOT / 'content/traces/ldo-low-voltage-sky130-astra-r1/trace.html').read_text()
        source = html.unescape(re.search(schematics.SUBMISSION, trace, re.S)[1])
        _, devices = schematics.parse_spice(source)
        self.assertEqual(schematics.constant_value(devices['rfbv']['parameters']['value']), Fraction(550000, 3))
        self.assertEqual(schematics.constant_value(devices['rfbo']['parameters']['value']), Fraction(125000000, 630))
        self.assertEqual(schematics.constant_value(devices['rfbg']['parameters']['value']), Fraction(137500000, 1057))
        self.assertEqual(schematics.constant_value('{ 1 / (2 + 3) }'), Fraction(1, 5))
        self.assertEqual(schematics.contract(source), schematics.contract(source.replace('{550000/3}', '{1100000/6}')))
        for replacement in ('183333.3333333333', '{550001/3}', '{550000*3}'):
            self.assertNotEqual(schematics.contract(source), schematics.contract(source.replace('{550000/3}', replacement)))
        literal = schematics.resolved_spice(source)
        self.assertNotIn('{', literal)
        # Repeating fractions may be approximated only in the separate native
        # comparison view; the authoritative source/export check remains exact.
        self.assertNotEqual(schematics.contract(source), schematics.contract(literal))

    def test_only_the_proven_submitted_open_drain_diagnostic_is_accepted(self):
        run_id = 'ldo-low-voltage-sky130-deepseek-r2'
        folder = ROOT / 'site/schematics' / run_id
        source = (folder / 'submitted.spice').read_text()
        project = json.loads((folder / 'project.icproj.json').read_text())
        report = json.loads((folder / 'verification.json').read_text())
        self.assertTrue(schematics.diagnostics_match_source(report, source, run_id, project))
        self.assertEqual(len(report['native_diagnostics']), 1)
        graph = physical_graph(project['documents'][0], project)
        self.assertTrue(graph.get(('XM5', 'D')), 'The submitted open drain needs its visible S1 stub')
        for key, value in [('id', 'unreviewed-diagnostic'), ('code', 'ERC_OTHER'), ('severity', 'error'),
                           ('parameters', {'instanceId': 'XM5', 'pinName': 'S', 'netId': 'wrong-net'})]:
            changed = copy.deepcopy(report)
            changed['native_diagnostics'][0][key] = value
            with self.subTest(key=key):
                self.assertFalse(schematics.diagnostics_match_source(changed, source, run_id, project))
        for key in ('native_diagnostics', 'source_bound_diagnostics'):
            changed = {**report, key: []}
            self.assertFalse(schematics.diagnostics_match_source(changed, source, run_id, project))
        self.assertFalse(schematics.diagnostics_match_source(report, source, 'another-run', project))
        connected_source = source.replace('.ends DUT', 'REPAIR S1 VIN 1k\n.ends DUT')
        self.assertFalse(schematics.diagnostics_match_source(report, connected_source, run_id, project))

    def test_pin_order_body_values_and_interface_are_part_of_contract(self):
        source = (ROOT / 'site/schematics/ldo-core-sky130-sonnet-5-5-r1/submitted.spice').read_text()
        for before, after in [('XMP VOUT G VIN VIN', 'XMP VIN G VOUT VIN'),
                              ('XMP VOUT G VIN VIN', 'XMP VOUT G VIN VSS'),
                              ('m=2', 'm=3'), ('nf=1', 'nf=2'),
                              ('DUT VIN VOUT VSS VREF', 'DUT VOUT VIN VSS VREF'),
                              ('150000.0', '150001.0')]:
            with self.subTest(after=after):
                self.assertNotEqual(schematics.contract(source), schematics.contract(source.replace(before, after, 1)))
        self.assertEqual(schematics.contract(source),
                         schematics.contract(source.replace('150000.0', '150k').replace('2000000.0', '2meg')))
        self.assertEqual(schematics.display_value('2000000.0'), '2M')
        self.assertEqual(schematics.display_value('1M'), '1m')  # SPICE M means milli.
        self.assertEqual(schematics.display_value('1.5e-12'), '1.5p')

    def test_artifact_tampering_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            shutil.copytree(ROOT / 'site/schematics', root / 'site/schematics')
            target = root / 'site/schematics/ldo-core-sky130-sonnet-5-5-r1/schematic.svg'
            target.write_text(target.read_text() + '\n')
            with self.assertRaisesRegex(ValueError, 'artifact differs'):
                schematics.load_drawings(root)

    def test_changed_export_fails_even_if_its_artifact_hash_is_updated(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            shutil.copytree(ROOT / 'site/schematics', root / 'site/schematics')
            target = root / 'site/schematics/ldo-core-sky130-sonnet-5-5-r1/exported.spice'
            target.write_text(target.read_text().replace('m=2', 'm=3'))
            index = root / 'site/schematics/index.json'
            manifest = json.loads(index.read_text())
            entry = next(e for e in manifest['drawings'] if e['run_id'].startswith('ldo-'))
            entry['files']['exported.spice'] = hashlib.sha256(target.read_bytes()).hexdigest()
            index.write_text(json.dumps(manifest))
            with self.assertRaisesRegex(ValueError, 'pins or values differ'):
                schematics.load_drawings(root)

    def test_unsupported_constructs_do_not_silently_pass(self):
        for text in ['.subckt DUT A B\nV1 A B 1\n.ends DUT\n',
                     '.subckt DUT A B\nR1 A B {r}\n.ends DUT\n',
                     '.subckt DUT A B\n.param r=1k\nR1 A B {r*2}\n.ends DUT\n',
                     '.subckt DUT A B\n.param r={s}\nR1 A B {r}\n.ends DUT\n',
                     '.subckt DUT A B\n.param r=1k r=2k\nR1 A B {r}\n.ends DUT\n',
                     '.subckt DUT A B\nR1 A B 1k\nR1 A B 2k\n.ends DUT\n']:
            with self.subTest(text=text), self.assertRaises(ValueError):
                schematics.contract(text)
        for value in ('{1/0}', '{2**3}', '{5//2}', '{abs(2)}', '{1k/2}', '{True}', '{1+}', '{1<<2}',
                      '{1e999999999}', '{1e-999999999}', '{1e60*1e60*1e60}', '{' + '1' * 65 + '}'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                schematics.contract('.subckt DUT A B\nR1 A B ' + value + '\n.ends DUT\n')


if __name__ == '__main__':
    unittest.main()
