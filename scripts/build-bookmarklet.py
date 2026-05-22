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
    """
    Single-pass scanner: tracks string and regex-literal state so that //
    comments are only stripped when they appear in real code positions.
    Block comments and inline whitespace runs are collapsed at the same
    time.

    Regex literals are detected with the conventional "previous non-space
    token would expect an expression" heuristic — good enough for our
    bookmarklet source.
    """
    out: list[str] = []
    quote: str | None = None
    in_regex = False
    in_block_comment = False
    last_significant = ''  # tracks the last non-space, non-comment char emitted
    i = 0
    n = len(src)

    # Tokens after which a '/' would start a regex literal rather than be a
    # division. Mostly mirrors esprima's lookbehind set; good enough here.
    REGEX_PRECEDERS = set('([{,;=!&|?:+-*~^%<>') | {''}
    REGEX_PRECEDER_WORDS = {'return', 'typeof', 'in', 'of', 'instanceof', 'new', 'delete', 'void'}

    def last_word() -> str:
        # find the trailing identifier of `out`
        j = len(out) - 1
        word = []
        while j >= 0 and (out[j].isalnum() or out[j] == '_'):
            word.append(out[j])
            j -= 1
        return ''.join(reversed(word))

    while i < n:
        c = src[i]

        if in_block_comment:
            if c == '*' and i + 1 < n and src[i + 1] == '/':
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue

        if quote:
            out.append(c)
            if c == '\\' and i + 1 < n:
                out.append(src[i + 1])
                i += 2
                continue
            if c == quote:
                quote = None
            i += 1
            continue

        if in_regex:
            out.append(c)
            if c == '\\' and i + 1 < n:
                out.append(src[i + 1])
                i += 2
                continue
            if c == '/':
                in_regex = False
                # consume any flags
                i += 1
                while i < n and src[i].isalpha():
                    out.append(src[i])
                    i += 1
                continue
            if c == '[':
                # character class; scan until ]
                i += 1
                while i < n:
                    out.append(src[i])
                    if src[i] == '\\' and i + 1 < n:
                        out.append(src[i + 1])
                        i += 2
                        continue
                    if src[i] == ']':
                        i += 1
                        break
                    i += 1
                continue
            i += 1
            continue

        # Outside strings, regex, and block comments.
        if c == '/' and i + 1 < n:
            nxt = src[i + 1]
            if nxt == '/':
                # line comment — skip to end of line
                while i < n and src[i] != '\n':
                    i += 1
                continue
            if nxt == '*':
                in_block_comment = True
                i += 2
                continue
            # Disambiguate regex vs division. If the last significant char
            # suggests an expression position, treat as regex.
            prev = last_significant
            if prev in REGEX_PRECEDERS or last_word() in REGEX_PRECEDER_WORDS:
                in_regex = True
                out.append(c)
                i += 1
                continue
            # Otherwise it's division.
            out.append(c)
            last_significant = c
            i += 1
            continue

        if c in ('"', "'", '`'):
            quote = c
            out.append(c)
            last_significant = c
            i += 1
            continue

        if c.isspace():
            # collapse to a single space
            out.append(' ')
            while i + 1 < n and src[i + 1].isspace():
                i += 1
            i += 1
            continue

        out.append(c)
        last_significant = c
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
