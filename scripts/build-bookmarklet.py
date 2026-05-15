"""
Read scripts/lesson-scraper-bookmarklet.js, strip comments and superfluous
whitespace, URL-encode, and print a single-line `javascript:` URL you can
paste as the URL of a browser bookmark.

Usage:
    python scripts/build-bookmarklet.py
    # → prints the URL; copy and paste into a new bookmark.

Re-run whenever you tweak the .js source.
"""

from __future__ import annotations

import os
import re
import urllib.parse

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, 'lesson-scraper-bookmarklet.js')


def minify(src: str) -> str:
    # Remove /* … */ block comments.
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.DOTALL)
    # Remove // line comments (very conservative: only when // is at the start
    # of a token; avoids stripping URLs inside string literals).
    src = re.sub(r'(?m)^\s*//.*$', '', src)
    # Collapse runs of whitespace that aren't inside string literals.
    # Cheap heuristic: scan char by char, track quote state.
    out = []
    quote = None
    i = 0
    while i < len(src):
        c = src[i]
        if quote:
            out.append(c)
            if c == '\\' and i + 1 < len(src):
                out.append(src[i + 1])
                i += 2
                continue
            if c == quote:
                quote = None
            i += 1
            continue
        if c in ('"', "'", '`'):
            quote = c
            out.append(c)
            i += 1
            continue
        if c.isspace():
            # collapse whitespace to a single space
            out.append(' ')
            while i + 1 < len(src) and src[i + 1].isspace():
                i += 1
            i += 1
            continue
        out.append(c)
        i += 1
    return ''.join(out).strip()


def main() -> int:
    with open(SRC, 'r', encoding='utf-8') as f:
        src = f.read()
    mini = minify(src)
    # Strip the outermost (function(){…})() so we have a body to wrap in
    # void(…); — but keeping the IIFE is fine and slightly safer.
    encoded = urllib.parse.quote(mini, safe='')
    url = 'javascript:' + encoded
    print(url)
    print('', flush=True)
    print(f'# length: {len(url)} chars (most browsers accept up to ~64k)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
