"""
Read an Anki .apkg conjugation deck and emit a Postgres SQL seed file ready
to paste into the Supabase SQL editor.

Usage:
    python scripts/import_anki_conjugation.py \\
        --apkg "content/Ultimate_Spanish_Conjugation_Lisardos_KOFI_Method.apkg" \\
        --out-dir "supabase/seeds"

Writes chunked SQL files (`02-conjugation-cards-001.sql`, `-002.sql`, …) so
each one fits within the Supabase SQL editor's ~1 MB statement limit. Default
chunk size is 500 rows; override with `--chunk-size N`. Re-running the script
is safe: every chunk uses `on conflict (sequence) do nothing` so re-imports
land cleanly.

Skips Anki's five orientation cards. Cloze syntax {{c1::answer::hint}} is
preserved verbatim so the app renderer can split front/back. HTML markup is
stripped (br -> ' / ', everything else removed). The verb is extracted from
the tag list using a stop-list of known meta tokens.
"""

from __future__ import annotations
import argparse
import html
import json
import os
import re
import sqlite3
import sys
import tempfile
import zipfile
from typing import Iterable

# Meta tags that are never the verb. Anki tags are space-separated; the verb
# is the only simple, non-meta token left after filtering.
META_TAGS = {
    'orientation',
    # tenses and moods
    'presente', 'imperfecto', 'indefinido',
    'preterito', 'pretérito',
    'futuro', 'condicional', 'subjuntivo', 'imperativo', 'perfecto',
    'pluscuamperfecto', 'antepreterito', 'anteperfecto', 'antefuturo',
    'pluscuampérfecto', 'antepretérito',
    # non-finite
    'participio', 'gerundio', 'infinitivo',
    # persons
    'yo', 'tu', 'tú', 'el', 'él', 'ella', 'ello', 'usted',
    'nosotros', 'nosotras', 'vosotros', 'vosotras', 'ellos', 'ellas', 'ustedes',
    # voseo (filtered out anyway, but listed for safety)
    'vos',
    # card-category markers that aren't verbs
    'modismo',   # "idiom"
    'refrán',    # "proverb"
    'pronominal', # the verb is reflexive, not the tag itself being a verb
}

HTML_BR = re.compile(r'<br\s*/?>', re.IGNORECASE)
HTML_TAG = re.compile(r'<[^>]+>')
WHITESPACE = re.compile(r'[ \t]+')
MULTI_NEWLINE = re.compile(r'\n{2,}')


def strip_html(s: str) -> str:
    if not s:
        return ''
    s = HTML_BR.sub(' / ', s)
    s = HTML_TAG.sub('', s)
    s = html.unescape(s)
    s = s.replace('\r', '')
    s = WHITESPACE.sub(' ', s)
    s = MULTI_NEWLINE.sub('\n', s)
    return s.strip()


def clean_prompt(prompt: str) -> str:
    """
    Preserve the cloze tokens `{{c\\d+::...}}` verbatim; strip surrounding HTML.
    """
    return strip_html(prompt)


def extract_verb(tags_str: str) -> str | None:
    candidates: list[str] = []
    for t in tags_str.strip().split():
        if '_' in t:
            continue
        if t.lower() in META_TAGS:
            continue
        candidates.append(t)
    # The infinitive tends to be the last simple token in the tag list.
    return candidates[-1] if candidates else None


def sql_escape(s: str | None) -> str:
    if s is None:
        return 'null'
    # Single-quote escape per Postgres standard.
    return "'" + s.replace("'", "''") + "'"


def sql_array(items: Iterable[str]) -> str:
    # Postgres text[] literal.
    escaped = ['"' + i.replace('\\', '\\\\').replace('"', '\\"') + '"' for i in items]
    return "'{" + ",".join(escaped) + "}'"


def iter_notes(apkg_path: str, exclude_tags: set[str] | None = None):
    """
    Yields (sequence, note) pairs. The sequence is the 1-based index of the
    note in the original Anki order, so filtered notes leave gaps in the
    sequence rather than renumbering — that way the seed numbering stays
    stable across runs even if the filter changes.
    """
    exclude_tags = exclude_tags or set()
    with tempfile.TemporaryDirectory() as tmp:
        with zipfile.ZipFile(apkg_path) as z:
            z.extractall(tmp)
        for name in ('collection.anki21', 'collection.anki2'):
            db_path = os.path.join(tmp, name)
            if os.path.exists(db_path):
                break
        else:
            raise SystemExit(f'No Anki collection DB found inside {apkg_path}')
        conn = sqlite3.connect(db_path)
        try:
            rows = conn.execute(
                "SELECT id, flds, tags FROM notes WHERE tags NOT LIKE '%orientation%' ORDER BY id ASC"
            ).fetchall()
            for seq, (nid, flds, tags) in enumerate(rows, start=1):
                tag_list = tags.strip().split()
                if exclude_tags and any(t in exclude_tags for t in tag_list):
                    continue
                fields = flds.split('\x1f')
                # Model has: UUID, Prompt, Similar, Notes
                prompt = fields[1] if len(fields) > 1 else ''
                notes  = fields[3] if len(fields) > 3 else ''
                yield seq, {
                    'note_id': nid,
                    'prompt': clean_prompt(prompt),
                    'notes': strip_html(notes) or None,
                    'tags': tag_list,
                    'verb': extract_verb(tags),
                }
        finally:
            conn.close()


def write_chunk(path: str, items: list[tuple[int, dict]], chunk_idx: int, chunk_total: int, source: str) -> None:
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write('-- Generated by scripts/import_anki_conjugation.py.\n')
        f.write('-- Do not edit by hand; re-run the script to regenerate.\n')
        f.write(f'-- Source apkg: {source}\n')
        first_seq = items[0][0]
        last_seq = items[-1][0]
        f.write(
            f'-- Cards in this chunk: {len(items)} '
            f'(sequences {first_seq}..{last_seq}, chunk {chunk_idx}/{chunk_total})\n\n'
        )
        f.write('insert into public.conjugation_cards (sequence, prompt, notes, tags, verb) values\n')
        for i, (seq, r) in enumerate(items):
            sep = ',' if i < len(items) - 1 else ''
            f.write(
                '  ('
                f'{seq}, '
                f'{sql_escape(r["prompt"])}, '
                f'{sql_escape(r["notes"])}, '
                f'{sql_array(r["tags"])}, '
                f'{sql_escape(r["verb"])}'
                f'){sep}\n'
            )
        f.write('on conflict (sequence) do nothing;\n')


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument('--apkg', required=True)
    p.add_argument(
        '--out-dir',
        required=True,
        help='Directory to write chunked SQL files into.',
    )
    p.add_argument(
        '--prefix',
        default='02-conjugation-cards',
        help='Filename prefix; chunks are named <prefix>-001.sql, -002.sql, …',
    )
    p.add_argument(
        '--chunk-size',
        type=int,
        default=500,
        help='Rows per output file. Default 500 keeps each file ~250 KB so it fits the Supabase SQL editor.',
    )
    p.add_argument(
        '--exclude-tags',
        default='',
        help='Comma-separated list of Anki tags to skip. Filtered cards leave gaps in the sequence numbering (no renumbering).',
    )
    args = p.parse_args()

    exclude = {t.strip() for t in args.exclude_tags.split(',') if t.strip()}
    items = list(iter_notes(args.apkg, exclude_tags=exclude))
    if not items:
        print('No usable cards found.', file=sys.stderr)
        return 1

    os.makedirs(args.out_dir, exist_ok=True)
    source = os.path.basename(args.apkg)
    total = len(items)
    chunk = max(1, args.chunk_size)
    num_chunks = (total + chunk - 1) // chunk

    for idx in range(num_chunks):
        start = idx * chunk
        end = min(start + chunk, total)
        out_path = os.path.join(args.out_dir, f'{args.prefix}-{idx + 1:03d}.sql')
        write_chunk(out_path, items[start:end], idx + 1, num_chunks, source)
        print(f'Wrote {end - start:4d} cards -> {out_path}')

    if exclude:
        print(f'\nExcluded tags: {sorted(exclude)}')
    print(f'Done: {total} cards in {num_chunks} file(s) under {args.out_dir}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
