"""
Build a simple JSON search index for the static site.
Writes `search_index.json` at repository root.

Usage:
  python build_search_index.py

It scans for all `.html` files (recursively), extracts the title and text content,
and writes a JSON array with objects: {"path": "relative/path.html", "title": "...", "text": "..."}

Excludes directories: `assets`, `.git`, and the output `search_index.json` itself.
"""
import os
import re
import json
from html import unescape

ROOT = os.path.dirname(__file__)
EXCLUDE_DIRS = {'assets', '.git'}
OUT = os.path.join(ROOT, 'search_index.json')

TAG_RE = re.compile(r'<[^>]+>')
TITLE_RE = re.compile(r'<title>(.*?)</title>', re.IGNORECASE|re.DOTALL)

def text_from_html(s):
    # remove scripts and styles
    s = re.sub(r'<(script|style)[\s\S]*?</\1>', ' ', s, flags=re.IGNORECASE)
    # remove tags
    s = TAG_RE.sub(' ', s)
    s = unescape(s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s

items = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    # skip excluded directories
    rel = os.path.relpath(dirpath, ROOT)
    parts = rel.split(os.sep)
    if any(p in EXCLUDE_DIRS for p in parts):
        continue
    for fn in filenames:
        if not fn.lower().endswith('.html'):
            continue
        full = os.path.join(dirpath, fn)
        # skip the generated index if present
        if os.path.abspath(full) == os.path.abspath(OUT):
            continue
        with open(full, 'r', encoding='utf-8') as f:
            html = f.read()
        title_m = TITLE_RE.search(html)
        title = title_m.group(1).strip() if title_m else ''
        text = text_from_html(html)
        # build path relative to ROOT with forward slashes
        path = os.path.relpath(full, ROOT).replace('\\', '/')
        items.append({'path': path, 'title': title, 'text': text})

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(items, f, ensure_ascii=False, indent=2)

print(f'Wrote {len(items)} pages to {OUT}')
