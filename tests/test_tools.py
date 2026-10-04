import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import shutil

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import check_site
import fetch_evidence
import build_site
import build_traces


class EvidenceTests(unittest.TestCase):
    def entry(self, payload=b'expected'):
        return {'id': 'run-1', 'filename': 'run-1.tar.xz',
                'sha256': hashlib.sha256(payload).hexdigest(),
                'url': 'https://github.com/ds54e/analog-trace-bench/releases/download/v1/run-1.tar.xz'}

    def test_missing_asset_does_not_request_network(self):
        entry = self.entry()
        entry['url'] = None
        with tempfile.TemporaryDirectory() as directory, patch.object(fetch_evidence, 'urlopen') as request:
            with self.assertRaisesRegex(ValueError, 'not been uploaded'):
                fetch_evidence.fetch_entry(entry, 'ds54e/analog-trace-bench', directory)
            request.assert_not_called()

    def test_failed_hash_does_not_replace_existing_bytes(self):
        entry = self.entry()
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / entry['filename']
            output.write_bytes(b'existing')
            with patch.object(fetch_evidence, 'urlopen', return_value=io.BytesIO(b'wrong')):
                with self.assertRaisesRegex(ValueError, 'SHA-256 mismatch'):
                    fetch_evidence.fetch_entry(entry, 'ds54e/analog-trace-bench', directory)
            self.assertEqual(output.read_bytes(), b'existing')
            self.assertEqual(list(Path(directory).iterdir()), [output])

    def test_verified_download_is_reused_without_network(self):
        entry = self.entry()
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(fetch_evidence, 'urlopen', return_value=io.BytesIO(b'expected')):
                output = fetch_evidence.fetch_entry(entry, 'ds54e/analog-trace-bench', directory)
            with patch.object(fetch_evidence, 'urlopen') as request:
                self.assertEqual(fetch_evidence.fetch_entry(entry, 'ds54e/analog-trace-bench', directory), output)
                request.assert_not_called()

    def test_wrong_repository_or_filename_is_rejected(self):
        for url in ['https://github.com/another/repository/releases/download/v1/run-1.tar.xz',
                    'https://github.com/ds54e/analog-trace-bench/releases/download/v1/other.tar.xz']:
            with self.assertRaises(ValueError):
                fetch_evidence.validate_url(url, 'ds54e/analog-trace-bench', 'run-1.tar.xz')


class LinkTests(unittest.TestCase):
    def test_relative_navigation_works_beneath_project_path(self):
        with tempfile.TemporaryDirectory() as directory:
            site = Path(directory)
            (site / 'traces').mkdir()
            (site / 'index.html').write_text('<h1 id="top">Home</h1><a href="traces/run.html">Run</a>')
            (site / 'traces/run.html').write_text('<a href="../index.html#top">Home</a>')
            self.assertEqual(len(check_site.check_links(site)), 2)

    def test_missing_page_or_fragment_fails(self):
        for href in ['missing.html', '#missing']:
            with tempfile.TemporaryDirectory() as directory:
                site = Path(directory)
                (site / 'index.html').write_text('<a href="' + href + '">Broken</a>')
                with self.assertRaisesRegex(ValueError, 'Broken'):
                    check_site.check_links(site)


class SiteBuildTests(unittest.TestCase):
    def test_changed_captured_task_definition_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in ('site', 'content', 'data', 'tools/templates'):
                shutil.copytree(check_site.ROOT / name, root / name)
            catalog=json.loads((root/'data/evidence.json').read_text())
            folder=root/catalog['runs'][0]['task_definition']
            definition=json.loads((folder/'manifest.json').read_text())
            file=folder/next(iter(definition['files']))
            file.write_bytes(file.read_bytes()+b'\nChanged definition\n')
            build_site.build(root)
            with self.assertRaisesRegex(ValueError,'Captured task definition differs'):
                check_site.check(root)

    def test_export_contains_dependencies_and_preserves_payloads(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'preview'
            self.assertEqual(build_site.build(output=output), 5)
            self.assertEqual(len(check_site.check_links(output)), 5)
            profiles = json.loads((check_site.ROOT / 'data/trace-validation.json').read_text())['traces']
            for profile in profiles:
                path = output / profile['page']
                check_site.check_trace(path, profile, check_site.Document(path.read_text()))
            self.assertTrue((output / 'assets/trace.js').is_file())
            self.assertTrue((output / '.nojekyll').is_file())
            self.assertEqual(build_site.build(output=output, check=True), 5)

    def test_changed_command_fails_even_after_regeneration(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in ('site', 'content', 'data', 'tools/templates'):
                shutil.copytree(check_site.ROOT / name, root / name)
            trace = root / 'content/traces/ota-wide-sky130-astra-r1/trace.html'
            content = trace.read_text()
            self.assertIn('/bin/bash -lc', content)
            trace.write_text(content.replace('/bin/bash -lc', '/bin/bash -c', 1))
            build_site.build(root)
            with self.assertRaisesRegex(ValueError, 'Recorded content differs'):
                check_site.check(root)

    def test_missing_report_fails_before_generating_pages(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'site/data').mkdir(parents=True)
            shutil.copyfile(check_site.ROOT / 'site/data/runs.json', root / 'site/data/runs.json')
            with self.assertRaisesRegex(ValueError, 'Missing evaluation source'):
                build_traces.rendered_traces(root)

    def test_export_detects_stale_output(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            build_site.build(output=output)
            (output / 'index.html').write_text('stale')
            with self.assertRaisesRegex(ValueError, 'Generated page is stale'):
                build_site.build(output=output, check=True)

    def test_export_rejects_a_directory_inside_its_source(self):
        with self.assertRaisesRegex(ValueError, 'outside site/'):
            build_site.build(output=check_site.ROOT / 'site/nested-preview')


if __name__ == '__main__':
    unittest.main()
