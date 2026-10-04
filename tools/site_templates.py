"""Shared page shell and asset URLs for the static website."""
import hashlib
import html
from pathlib import Path
from string import Template

ROOT = Path(__file__).resolve().parents[1]


def template(name, root=ROOT, **values):
    return Template((root / 'tools/templates' / name).read_text(encoding='utf-8')).substitute(values)


def asset_url(name, prefix='', root=ROOT):
    digest = hashlib.sha256((root / 'site/assets' / name).read_bytes()).hexdigest()[:12]
    return prefix + 'assets/' + name + '?v=' + digest


def render_page(title, content, head, home_href, root=ROOT):
    return template('page.html', root, title=html.escape(title), content=content,
                    head=head, home_href=html.escape(home_href, quote=True))
