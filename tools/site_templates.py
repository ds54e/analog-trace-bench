"""Shared page shell and asset URLs for the static website."""
import hashlib
import html
from pathlib import Path
from string import Template

ROOT = Path(__file__).resolve().parents[1]
FAILURE_STATUSES = ('MISS', 'MEASUREMENT_FAILURE', 'MEASUREMENT_INVALID', 'NOT_MEASURED')


def evaluation_label(status):
    return 'FAIL' if any(value in FAILURE_STATUSES
                         for value in status.split(' / ')) else status


def format_duration(seconds):
    seconds = int(round(seconds))
    return f'{seconds // 3600}:{seconds // 60 % 60:02d}:{seconds % 60:02d}'


def template(name, root=ROOT, **values):
    return Template((root / 'tools/templates' / name).read_text(encoding='utf-8')).substitute(values)


def asset_url(name, prefix='', root=ROOT):
    digest = hashlib.sha256((root / 'site/assets' / name).read_bytes()).hexdigest()[:12]
    return prefix + 'assets/' + name + '?v=' + digest


def render_page(title, content, head, home_href, root=ROOT, current_view=None):
    parent = Path(home_href).parent.as_posix()
    prefix = '' if parent == '.' else parent + '/'
    head = '<link rel="stylesheet" href="' + asset_url('site.css', prefix, root) + '"/>\n' + head
    navigation = '<nav class="site-nav" aria-label="Browse results">'
    for view, label, route in [('model', 'Model', 'index.html'), ('task', 'Task', 'tasks.html')]:
        current = ' aria-current="page"' if current_view == view else ''
        navigation += f'<a href="{prefix}{route}"{current}>{label}</a>'
    navigation += '</nav>'
    return template('page.html', root, title=html.escape(title), content=content,
                    head=head, home_href=html.escape(home_href, quote=True), navigation=navigation)
