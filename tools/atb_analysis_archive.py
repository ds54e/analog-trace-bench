"""Pack, verify or unpack one self-contained analysis tar.xz without models or SPICE."""
import argparse
import hashlib
import io
import json
import lzma
import os
from pathlib import Path, PurePosixPath
import shutil
import tarfile
import tempfile

from atb_analysis_export import AnalysisSnapshot


FORMAT = 'atb-analysis-tar-xz-v1'
PROFILE = dict(format='xz', preset=9, extreme=True, dictionary_bytes=8 * 1024 * 1024,
               threads=1, check='sha256')
README = b'''# ATB trial analysis

This archive contains one completed, independently evaluated analysis snapshot.
Unsuccessful results and missing evidence remain explicit.

- manifest.json: package format, snapshot identity and SHA-256 file inventory.
- analysis/manifest.json: captured trial configuration and evidence indexes.
- analysis/: original schema-4 analysis files, preserved byte for byte.

Verify or unpack using Python's standard library and repository tools from main:

    python3 tools/atb_analysis_archive.py verify ATTEMPT.tar.xz
    python3 tools/atb_analysis_archive.py unpack ATTEMPT.tar.xz DESTINATION

The unpack command validates every file and the analysis schema before publishing
DESTINATION. Standard tar tools can also extract the archive; run the verifier
for integrity checks. No provider CLI, login, PDK or simulator is needed.

Read the unpacked snapshot with AnalysisSnapshot(Path("DESTINATION/analysis"))
from tools/atb_analysis_export.py. Expand $atb_ref values using the shared records
and concatenate stream chunks in manifest order. Availability records distinguish
missing evidence from recorded values; missing values are never measured zeros.

See data/README.md in the ATB repository for the analysis layout and reader example.
Captured code and task identities belong to each trial; the task Release tag only
identifies its dataset bucket. Raw waveforms, credentials, PDKs and simulator
binaries are excluded. Original source paths refer to the execution host.
'''


def sha(path):
    value = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            value.update(block)
    return value.hexdigest()


def inventory(root):
    result = {}
    for path in sorted(Path(root).rglob('*')):
        if path.is_symlink():
            raise ValueError('Symlink in analysis snapshot')
        if path.is_file():
            result[path.relative_to(root).as_posix()] = dict(bytes=path.stat().st_size, sha256=sha(path))
        elif not path.is_dir():
            raise ValueError('Nonregular analysis source')
    return result


def safe_name(name):
    path = PurePosixPath(name)
    return (bool(path.parts) and not path.is_absolute() and '..' not in path.parts and
            '\\' not in name and ':' not in name and path.as_posix() == name)


def validate_manifest(saved):
    if (saved.get('schema_version') != 1 or saved.get('format') != FORMAT or
            saved.get('compression') != PROFILE):
        raise ValueError('Unsupported analysis archive profile')
    files = saved['files']
    if (not isinstance(files, dict) or 'README.md' not in files or 'analysis/manifest.json' not in files or
            any(not safe_name(name) or (name != 'README.md' and not name.startswith('analysis/')) or
                not isinstance(record['bytes'], int) or record['bytes'] < 0 or
                len(record['sha256']) != 64 or any(c not in '0123456789abcdef' for c in record['sha256'])
                for name, record in files.items())):
        raise ValueError('Invalid analysis archive inventory')
    original = {n[9:]: v for n, v in files.items() if n.startswith('analysis/')}
    if (len(original) != saved['analysis_files'] or
            sum(v['bytes'] for v in original.values()) != saved['uncompressed_bytes'] or
            original['manifest.json']['sha256'] != saved['manifest_sha256']):
        raise ValueError('Analysis archive inventory differs')


def extract(package, destination):
    """Accept unique regular relative paths matching the embedded inventory exactly."""
    package, destination = Path(package), Path(destination)
    if package.is_symlink():
        raise ValueError('Symlink in analysis package')
    destination.mkdir()
    seen = set()
    saved = None
    try:
        with tarfile.open(package, 'r|xz') as archive:
            for entry in archive:
                if not entry.isfile() or not safe_name(entry.name) or entry.name in seen:
                    raise ValueError('Unsafe or duplicate archive member')
                seen.add(entry.name)
                if saved is None:
                    if entry.name != 'manifest.json' or entry.size > 16 * 1024 * 1024:
                        raise ValueError('Archive must begin with a bounded package manifest')
                    with archive.extractfile(entry) as stream:
                        data = stream.read()
                    saved = json.loads(data)
                    validate_manifest(saved)
                    (destination / 'manifest.json').write_bytes(data)
                    continue
                expected = saved['files'].get(entry.name)
                if expected is None or entry.size != expected['bytes']:
                    raise ValueError('Archive member exceeds or differs from inventory')
                target = destination / entry.name
                target.parent.mkdir(parents=True, exist_ok=True)
                with archive.extractfile(entry) as source, target.open('xb') as output:
                    shutil.copyfileobj(source, output, length=1024 * 1024)
                if sha(target) != expected['sha256']:
                    raise ValueError('Analysis archive file hash mismatch: ' + entry.name)
            # Consume XZ through its trailer: tar's end marker precedes the checksum.
            while archive.fileobj.read(1024 * 1024):
                pass
    except (tarfile.TarError, lzma.LZMAError, EOFError) as error:
        raise ValueError('Invalid or corrupt analysis archive') from error
    if saved is None or seen != {'manifest.json', *saved['files']}:
        raise ValueError('Analysis archive inventory differs')
    analysis = destination / 'analysis'
    if json.loads((analysis / 'manifest.json').read_text())['snapshot'] != saved['snapshot']:
        raise ValueError('Analysis snapshot identity differs')
    AnalysisSnapshot(analysis).verify()
    return saved


def stats(package, saved):
    return dict(format=FORMAT, snapshot=saved['snapshot'], compression=PROFILE,
                files=saved['analysis_files'], uncompressed_bytes=saved['uncompressed_bytes'],
                manifest_sha256=saved['manifest_sha256'], archive_bytes=Path(package).stat().st_size,
                archive_sha256=sha(package), verified=True)


def verify(package):
    with tempfile.TemporaryDirectory(prefix='atb-analysis-verify-') as temporary:
        saved = extract(package, Path(temporary) / 'package')
    return stats(package, saved)


def sync_directory(path):
    if not hasattr(os, 'O_DIRECTORY'):
        return
    fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def publish_directory(staging, destination):
    for path in staging.rglob('*'):
        if path.is_file():
            with path.open('rb') as stream:
                os.fsync(stream.fileno())
    directories = [staging] + [p for p in staging.rglob('*') if p.is_dir()]
    for directory in sorted(directories, key=lambda p: len(p.parts), reverse=True):
        sync_directory(directory)
    staging.rename(destination)
    sync_directory(destination.parent)


def add_member(output, name, stream, size):
    entry = tarfile.TarInfo(name)
    entry.size = size
    entry.mode = 0o644
    output.addfile(entry, stream)


def pack(snapshot, destination):
    snapshot, destination = Path(snapshot), Path(destination)
    if destination.exists() or destination.is_symlink():
        raise ValueError('Archive destination already exists')
    if not destination.name.endswith('.tar.xz'):
        raise ValueError('Archive destination must end with .tar.xz')
    if snapshot.is_symlink() or destination.resolve().is_relative_to(snapshot.resolve()):
        raise ValueError('Unsafe archive destination or source')
    AnalysisSnapshot(snapshot).verify()
    before = inventory(snapshot)
    files = {'README.md': dict(bytes=len(README), sha256=hashlib.sha256(README).hexdigest()),
             **{'analysis/' + n: v for n, v in before.items()}}
    saved = dict(schema_version=1, format=FORMAT,
                 snapshot=json.loads((snapshot / 'manifest.json').read_text())['snapshot'],
                 compression=PROFILE, analysis_files=len(before),
                 uncompressed_bytes=sum(v['bytes'] for v in before.values()),
                 manifest_sha256=before['manifest.json']['sha256'], files=files)
    encoded = (json.dumps(saved, separators=(',', ':')) + '\n').encode()
    validate_manifest(saved)
    if len(encoded) > 16 * 1024 * 1024:
        raise ValueError('Package manifest exceeds supported size')
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.analysis-pack-', dir=destination.parent) as temporary:
        staging = Path(temporary) / 'asset.tar.xz'
        filters = [dict(id=lzma.FILTER_LZMA2, preset=9 | lzma.PRESET_EXTREME,
                        dict_size=PROFILE['dictionary_bytes'])]
        with lzma.open(staging, 'wb', filters=filters, check=lzma.CHECK_SHA256) as compressed:
            with tarfile.open(fileobj=compressed, mode='w|', format=tarfile.PAX_FORMAT) as output:
                add_member(output, 'manifest.json', io.BytesIO(encoded), len(encoded))
                add_member(output, 'README.md', io.BytesIO(README), len(README))
                for name, record in before.items():
                    with (snapshot / name).open('rb') as stream:
                        add_member(output, 'analysis/' + name, stream, record['bytes'])
        restored = Path(temporary) / 'restored'
        extract(staging, restored)
        if inventory(restored / 'analysis') != before or inventory(snapshot) != before:
            raise ValueError('Analysis source changed or archive round trip differs')
        with staging.open('rb') as stream:
            os.fsync(stream.fileno())
        os.link(staging, destination)
        sync_directory(destination.parent)
    return stats(destination, saved)


def unpack(package, destination):
    package, destination = Path(package), Path(destination)
    if destination.exists() or destination.is_symlink():
        raise ValueError('Unpack destination already exists')
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.analysis-unpack-', dir=destination.parent) as temporary:
        staging = Path(temporary) / 'package'
        saved = extract(package, staging)
        publish_directory(staging, destination)
    return dict(stats(package, saved), path=str(destination), analysis_path=str(destination / 'analysis'))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    packing = commands.add_parser('pack')
    packing.add_argument('snapshot', type=Path)
    packing.add_argument('destination', type=Path)
    checking = commands.add_parser('verify')
    checking.add_argument('package', type=Path)
    unpacking = commands.add_parser('unpack')
    unpacking.add_argument('package', type=Path)
    unpacking.add_argument('destination', type=Path)
    arguments = parser.parse_args()
    if arguments.command == 'pack':
        result = pack(arguments.snapshot, arguments.destination)
    elif arguments.command == 'verify':
        result = verify(arguments.package)
    else:
        result = unpack(arguments.package, arguments.destination)
    print(json.dumps(result))


if __name__ == '__main__':
    main()
