/**
 * Spanish dictionary lookup over the bundled SQLite asset
 * (content/dictionary/spanish-dictionary.db).
 *
 * Pipeline (CLAUDE.md "Lookup pipeline order"):
 *   normalize -> direct lemmas.lemma lookup
 *             -> inflections.surface_form lookup
 *             -> clitic-strip fallback (services/clitic.ts) + retry
 *             -> suffix-strip heuristic (services/suffix.ts) -> lemma lookup
 *             -> null
 *
 * Lemma-first ordering is what disambiguates noun/verb collisions like
 * `pueblo` (noun "town" vs. ind.pres.1s of `poblar`) and `nombre`
 * (noun "name" vs. a form of `nombrar`). Conjugated verb forms (`tengo`,
 * `dámelo`) miss the lemma step and fall through to inflections as usual.
 */

import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
import { stripClitics } from './clitic';
import { suffixCandidates } from './suffix';
import type { Lemma, LookupResult, Sense } from '@/types';

const DB_NAME = 'spanish-dictionary.db';
// Relative path: services/ -> ../content/dictionary/...
// Metro resolves this at build time; require() returns the asset module id.
const DB_ASSET_MODULE = require('../content/dictionary/spanish-dictionary.db');

interface LemmaRow {
  id: number;
  lemma: string;
  part_of_speech: string;
  gender: string;
  senses_json: string;
  grammar_note_slug: string | null;
}

interface InflectionJoinRow extends LemmaRow {
  grammar_features: string;
}

interface SenseRow {
  definition: string;
  example_es?: string;
  example_en?: string;
}

function parseSenses(json: string): Sense[] {
  const raw = JSON.parse(json) as SenseRow[];
  return raw.map(r => ({
    definition: r.definition,
    exampleEs: r.example_es || undefined,
    exampleEn: r.example_en || undefined,
  }));
}

function rowToLemma(row: LemmaRow): Lemma {
  return {
    id: row.id,
    lemma: row.lemma,
    partOfSpeech: row.part_of_speech,
    gender: row.gender,
    senses: parseSenses(row.senses_json),
    grammarNoteSlug: row.grammar_note_slug,
  };
}

export function normalizeToken(token: string): string {
  return token.toLowerCase().normalize('NFC');
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = (async () => {
    const dbDir = `${FileSystem.documentDirectory}SQLite`;
    const dbPath = `${dbDir}/${DB_NAME}`;
    const info = await FileSystem.getInfoAsync(dbPath);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
      const asset = Asset.fromModule(DB_ASSET_MODULE);
      await asset.downloadAsync();
      if (!asset.localUri) {
        throw new Error('Dictionary asset has no localUri after downloadAsync');
      }
      await FileSystem.copyAsync({ from: asset.localUri, to: dbPath });
    }
    return SQLite.openDatabaseAsync(DB_NAME);
  })();
  return dbPromise;
}

async function lookupInflection(
  db: SQLite.SQLiteDatabase,
  surface: string,
): Promise<{ lemma: Lemma; grammarFeatures: string } | null> {
  const row = await db.getFirstAsync<InflectionJoinRow>(
    `SELECT l.id, l.lemma, l.part_of_speech, l.gender, l.senses_json, l.grammar_note_slug,
            i.grammar_features
     FROM inflections i
     JOIN lemmas l ON l.id = i.lemma_id
     WHERE i.surface_form = ?
     LIMIT 1`,
    surface,
  );
  if (!row) return null;
  return { lemma: rowToLemma(row), grammarFeatures: row.grammar_features };
}

async function lookupLemma(
  db: SQLite.SQLiteDatabase,
  lemma: string,
): Promise<Lemma | null> {
  const row = await db.getFirstAsync<LemmaRow>(
    `SELECT id, lemma, part_of_speech, gender, senses_json, grammar_note_slug
     FROM lemmas
     WHERE lemma = ?
     LIMIT 1`,
    lemma,
  );
  return row ? rowToLemma(row) : null;
}

export async function lookup(token: string): Promise<LookupResult | null> {
  const surface = normalizeToken(token);
  if (!surface) return null;

  const db = await openDb();

  // 1. Direct lemma lookup. Catches canonical nouns / adjectives without
  //    being misled by accidental verb-conjugation collisions in inflections
  //    (e.g. `pueblo` resolves to the noun, not the verb `poblar`).
  const lemma = await lookupLemma(db, surface);
  if (lemma) {
    return { surfaceForm: surface, lemma };
  }

  // 2. Inflection lookup. Verb conjugations, plurals, gendered forms.
  const direct = await lookupInflection(db, surface);
  if (direct) {
    return {
      surfaceForm: surface,
      lemma: direct.lemma,
      grammarFeatures: direct.grammarFeatures,
    };
  }

  // 3. Clitic-strip fallback. Try lemma lookup on the stripped base first,
  //    then inflection, mirroring the top-level order.
  const decomp = stripClitics(surface);
  if (decomp) {
    const strippedLemma = await lookupLemma(db, decomp.base);
    if (strippedLemma) {
      return {
        surfaceForm: surface,
        lemma: strippedLemma,
        clitics: [...decomp.clitics],
      };
    }
    const strippedInflection = await lookupInflection(db, decomp.base);
    if (strippedInflection) {
      return {
        surfaceForm: surface,
        lemma: strippedInflection.lemma,
        grammarFeatures: strippedInflection.grammarFeatures,
        clitics: [...decomp.clitics],
      };
    }
  }

  // 4. Light suffix-stripping heuristic. Catches -mente adverbs, diminutives,
  //    and rare plurals that aren't in the inflections table. Tries each
  //    candidate as a bare lemma lookup; first hit wins.
  for (const candidate of suffixCandidates(surface)) {
    const hit = await lookupLemma(db, candidate);
    if (hit) {
      return { surfaceForm: surface, lemma: hit };
    }
  }

  return null;
}

/**
 * Prime the SQLite connection. Call once at app mount to absorb the cold-start
 * cost (asset copy on first launch can be a few hundred ms for ~70 MB).
 */
export async function prewarm(): Promise<void> {
  const db = await openDb();
  await db.getFirstAsync('SELECT 1');
}
