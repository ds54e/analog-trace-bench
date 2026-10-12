import hashlib
import json
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


class SubmittedSchematics(unittest.TestCase):
    def test_all_ota_runs_match_frozen_submissions_and_keep_spice_bytes(self):
        drawings = schematics.load_drawings(ROOT)
        catalog = json.loads((ROOT / 'site/data/runs.json').read_text())
        ota = {r['id'] for t in catalog['tasks'] if t['id'].upper().startswith('OTA-') for r in t['runs']}
        self.assertEqual(len(ota), 121)
        self.assertEqual(set(drawings), ota | {'ldo-core-sky130-sonnet-5-5-r1'})
        pages = rendered_traces(ROOT)
        routes = {r['id']: r['trace'] for t in catalog['tasks'] for r in t['runs']}
        for run_id, entry in drawings.items():
            trace = (ROOT / 'content/traces' / run_id / 'trace.html').read_text()
            drawing = schematics.drawing_for_submission(trace, entry)
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

    def test_vss_ports_are_horizontal_in_saved_projects(self):
        for entry in schematics.load_drawings(ROOT).values():
            project = json.loads((ROOT / 'site/schematics' / entry['run_id'] / 'project.icproj.json').read_text())
            document = project['documents'][0]
            terminal = next(t for t in document['netlist']['terminals'] if t['name'].lower() == 'vss')
            port = next(i for i in document['instances'] if i['id'] in terminal['interfaceInstanceIds'])
            self.assertEqual(port.get('rotation', 0) % 180, 0, entry['run_id'])

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


if __name__ == '__main__':
    unittest.main()
