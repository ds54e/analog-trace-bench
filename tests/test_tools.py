import hashlib
import io
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import check_site
import fetch_evidence


class EvidenceTests(unittest.TestCase):
    def entry(self, payload=b'expected'):
        return {'id': 'run-1', 'filename': 'run-1.tar.xz',
                'sha256': hashlib.sha256(payload).hexdigest(),
                'url': 'https://github.com/ds54e/analog-trace-bench-public/releases/download/v1/run-1.tar.xz'}

    def test_missing_asset_does_not_request_network(self):
        entry = self.entry()
        entry['url'] = None
        with tempfile.TemporaryDirectory() as directory, patch.object(fetch_evidence, 'urlopen') as request:
            with self.assertRaisesRegex(ValueError, 'not been uploaded'):
                fetch_evidence.fetch_entry(entry, 'ds54e/analog-trace-bench-public', directory)
            request.assert_not_called()

    def test_failed_hash_does_not_replace_existing_bytes(self):
        entry = self.entry()
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / entry['filename']
            output.write_bytes(b'existing')
            with patch.object(fetch_evidence, 'urlopen', return_value=io.BytesIO(b'wrong')):
                with self.assertRaisesRegex(ValueError, 'SHA-256 mismatch'):
                    fetch_evidence.fetch_entry(entry, 'ds54e/analog-trace-bench-public', directory)
            self.assertEqual(output.read_bytes(), b'existing')
            self.assertEqual(list(Path(directory).iterdir()), [output])

    def test_verified_download_is_reused_without_network(self):
        entry = self.entry()
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(fetch_evidence, 'urlopen', return_value=io.BytesIO(b'expected')):
                output = fetch_evidence.fetch_entry(entry, 'ds54e/analog-trace-bench-public', directory)
            with patch.object(fetch_evidence, 'urlopen') as request:
                self.assertEqual(fetch_evidence.fetch_entry(entry, 'ds54e/analog-trace-bench-public', directory), output)
                request.assert_not_called()

    def test_wrong_repository_or_filename_is_rejected(self):
        for url in ['https://github.com/another/repository/releases/download/v1/run-1.tar.xz',
                    'https://github.com/ds54e/analog-trace-bench-public/releases/download/v1/other.tar.xz']:
            with self.assertRaises(ValueError):
                fetch_evidence.validate_url(url, 'ds54e/analog-trace-bench-public', 'run-1.tar.xz')


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


if __name__ == '__main__':
    unittest.main()
