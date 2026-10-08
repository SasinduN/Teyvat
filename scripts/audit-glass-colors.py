"""Audit fixed CSS token contrast, including the brightest reflection endpoint.

This is mathematical evidence for declared colors, not rendered/photo contrast.
Uses the already-installed tinycss2 parser; installs no dependencies.
"""
import json
from pathlib import Path
import re

import tinycss2

palette = tinycss2.parse_stylesheet(Path('src/styles/palette.css').read_text(), skip_comments=True, skip_whitespace=True)
themes = {'light': {}, 'dark': {}}
for rule in palette:
    if rule.type != 'qualified-rule':
        continue
    selector = tinycss2.serialize(rule.prelude).strip()
    if selector not in [':root', ':root[data-theme="dark"]']:
        continue
    declarations = tinycss2.parse_declaration_list(rule.content, skip_comments=True, skip_whitespace=True)
    values = {d.name: tinycss2.serialize(d.value).strip() for d in declarations if d.type == 'declaration'}
    if selector == ':root':
        themes['light'].update(values)
        themes['dark'].update(values)
    else:
        themes['dark'].update(values)


def resolve(value, tokens):
    for _ in range(20):
        if 'var(' not in value:
            return value
        value = re.sub(r'var\((--[\w-]+)\)', lambda m: tokens[m[1]], value)
    raise ValueError('Unresolved CSS token: ' + value)


def color(value):
    if value.startswith('#'):
        return [int(value[i:i+2], 16) for i in [1, 3, 5]] + [1.0]
    match = re.fullmatch(r'rgb\(([\d\s.]+)(?:/\s*([\d.]+))?\)', value)
    if not match:
        raise ValueError('Unsupported color: ' + value)
    return list(map(float, match[1].split())) + [float(match[2] or 1)]


def composite(front, back):
    return [front[i] * front[3] + back[i] * (1-front[3]) for i in range(3)] + [1]


def luminance(value):
    channels = [v/255 for v in value[:3]]
    return sum(w*(v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4) for w, v in zip([.2126, .7152, .0722], channels))


def contrast(a, b):
    low, high = sorted([luminance(a), luminance(b)])
    return (high+.05)/(low+.05)


checks = []
for theme, tokens in themes.items():
    get = lambda key: color(resolve(tokens[key], tokens))
    pairs = [('main text', '--text-primary', '--background'), ('secondary text', '--text-secondary', '--background'),
             ('secondary on raised surface', '--text-secondary', '--surface'),
             ('primary default', '--button-primary-text', '--button-primary-bg'),
             ('primary hover', '--button-primary-text', '--button-primary-hover'),
             ('photo primary', '--photo-button-text', '--photo-button-bg'),
             ('photo primary hover', '--photo-button-text', '--photo-button-hover'),
             ('secondary default', '--button-secondary-text', '--button-secondary-bg'),
             ('secondary hover', '--button-secondary-text', '--button-secondary-hover'),
             ('outline default', '--button-outline-text', '--background'),
             ('outline hover', '--button-outline-text', '--button-secondary-hover')]
    for label, foreground, background in pairs:
        bg = composite(get(background), get('--surface' if label.startswith('secondary') else '--background'))
        if label in ['primary default', 'primary hover', 'secondary default', 'secondary hover', 'outline default', 'outline hover', 'photo primary', 'photo primary hover']:
            # Maximum reflection is conservative: assume both endpoints coincide.
            reflection = .025 if label.startswith(('primary', 'photo primary')) else .12
            sheen = .025 if label.startswith(('primary', 'photo primary')) else .16
            bg = composite([255, 255, 255, reflection], bg)
            bg = composite([255, 255, 255, sheen * (.8 if 'hover' in label else .45)], bg)
        ratio = contrast(get(foreground), bg)
        checks.append({'theme': theme, 'pair': label, 'ratio': round(ratio, 2), 'pass': ratio >= 4.5})

report = {'scope': 'Declared fixed color math with conservative reflection endpoint; no photo/browser claim', 'checks': checks}
out = Path('docs/qa-results/glass-ui/color-contrast.json')
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(report, indent=2), encoding='utf-8')
print(f'{sum(c["pass"] for c in checks)}/{len(checks)} declared color pairs meet 4.5:1')
for check in checks:
    if not check['pass']:
        print(check)
if any(not c['pass'] for c in checks):
    raise SystemExit(1)
