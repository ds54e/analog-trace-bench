import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import analysis_read
import atb_analysis_archive as archive
import atb_analysis_export as export


class AnalysisRecords(unittest.TestCase):
    def fixture(self, root):
        root.mkdir()
        original = {'missing': None, 'observed_zero': 0, 'description': 'original record'}
        key = export.digest(export.canonical(original))
        payloads = {
            'shared/ab.json': export.encode({key: original}),
            'r/evidence/experiment.json': export.encode({'records': [{'$atb_ref': key}]}),
            'r/evidence/transcript/0001.jsonl': b'{"text":"one"}\n',
            'r/evidence/transcript/0002.jsonl': b'{"text":"two"}\n',
        }
        files = {name: {'bytes': len(data), 'sha256': export.digest(data)} for name, data in payloads.items()}
        indexes = {'source_files': {}, 'files': files,
                   'case_records': {'r/evidence/experiment.json': {'cases': 1}},
                   'streams': {'r/evidence/transcript.jsonl': {
                       'parts': ['r/evidence/transcript/0001.jsonl', 'r/evidence/transcript/0002.jsonl'],
                       'bytes': len(payloads['r/evidence/transcript/0001.jsonl']) + len(payloads['r/evidence/transcript/0002.jsonl'])}}}
        manifest = {'schema_version': 4, 'snapshot': 'fixture', 'trials': [], 'indexes': {}}
        for name, index in indexes.items():
            path = 'indexes/' + name + '.json'
            payloads[path] = export.encode(index)
            manifest['indexes'][name] = [{'path': path}]
        payloads['manifest.json'] = export.encode(manifest)
        for name, data in payloads.items():
            path = root / name; path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(data)
        return export.AnalysisSnapshot(root), original

    def test_archive_restoration_and_reference_expansion_preserve_unknown_and_zero(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            snapshot, original = self.fixture(root / 'source')
            package = root / 'fixture.tar.xz'
            archive.pack(snapshot.destination, package)
            archive.unpack(package, root / 'restored')
            restored = export.AnalysisSnapshot(root / 'restored/analysis')
            self.assertTrue(restored.verify()['verified'])
            record = json.loads(analysis_read.load_record(restored, 'r/evidence/experiment.json'))
            self.assertEqual(record, {'records': [original]})
            self.assertEqual(archive.inventory(snapshot.destination), archive.inventory(restored.destination))

    def test_stream_order_and_unlisted_path_refusal(self):
        with tempfile.TemporaryDirectory() as directory:
            snapshot, _ = self.fixture(Path(directory) / 'source')
            snapshot.verify()
            self.assertEqual(analysis_read.load_record(snapshot, 'r/evidence/transcript.jsonl'),
                             b'{"text":"one"}\n{"text":"two"}\n')
            with self.assertRaises(ValueError):
                analysis_read.load_record(snapshot, '../../private.json')
            (snapshot.destination / 'r/evidence/experiment.json').write_text('{}')
            with self.assertRaisesRegex(ValueError, 'hash mismatch'):
                snapshot.verify()
