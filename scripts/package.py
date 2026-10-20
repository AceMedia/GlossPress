#!/usr/bin/env python3
"""Build a deterministic WordPress ZIP containing runtime files only."""
import hashlib, pathlib, re, zipfile
root = pathlib.Path(__file__).resolve().parents[1]
version = re.search(r'\* Version:\s*(\S+)', (root / 'acemedia-glossary.php').read_text()).group(1)
slug = 'acemedia-glossary'
files = [root / name for name in ('acemedia-glossary.php', 'readme.txt', 'LICENSE')]
files += sorted(p for directory in ('build', 'assets', 'includes', 'admin', 'templates', 'block-templates') for p in (root / directory).rglob('*') if p.is_file() and p.suffix in ('.php', '.js', '.css', '.json', '.svg', '.png', '.jpg', '.webp', '.woff2', '.mo', '.po', '.pot', '.html', '.txt', '.woff', '.ttf', '.eot'))
(root / 'dist').mkdir(exist_ok=True)
archive = root / 'dist' / (slug + '-' + version + '.zip')
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as z:
    for p in sorted(files):
        item = zipfile.ZipInfo(slug + '/' + p.relative_to(root).as_posix(), (2026, 1, 1, 0, 0, 0))
        item.compress_type = zipfile.ZIP_DEFLATED
        item.external_attr = 0o100644 << 16
        z.writestr(item, p.read_bytes())
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix('.zip.sha256').write_text(digest + '  ' + archive.name + '\n')
print(archive)
print(digest)
