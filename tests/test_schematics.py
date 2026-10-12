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
from site_templates import ROOT


class SubmittedSchematics(unittest.TestCase):
    def test_all_ota_runs_match_frozen_submissions_and_keep_spice_bytes(self):
        drawings = schematics.load_drawings(ROOT)
        catalog = json.loads((ROOT / 'site/data/runs.json').read_text())
        ota = {r['id'] for t in catalog['tasks'] if t['id'].upper().startswith('OTA-') for r in t['runs']}
        self.assertEqual(len(ota), 121)
        self.assertEqual(set(drawings), ota | {'ldo-core-sky130-sonnet-5-5-r1'})
        for run_id, entry in drawings.items():
            trace = (ROOT / 'content/traces' / run_id / 'trace.html').read_text()
            attached = schematics.attach_drawing(trace, entry)
            self.assertEqual(re.findall(schematics.SUBMISSION, trace, re.S),
                             re.findall(schematics.SUBMISSION, attached, re.S))
            self.assertLess(attached.index('<figure class="submission-schematic"'),
                            attached.index('<pre data-field="submitted-spice"'))
            self.assertEqual(attached.count('class="submission-schematic"'), 1)
            self.assertNotIn('<figcaption', attached[:attached.index('<pre data-field="submitted-spice"')])
            changed = dict(entry, source=entry['source'] + '\n')
            with self.assertRaisesRegex(ValueError, 'frozen final submission'):
                schematics.attach_drawing(trace, changed)
        self.assertEqual(schematics.attach_drawing('unselected trace', None), 'unselected trace')

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
