/**
 * CRUD for the per-device `user_words` table. All queries scope by the
 * device-generated UUID from services/deviceId.ts; that UUID is the user_id.
 *
 * Bidirectional cards: each captureWord() insert creates two rows, one per
 * direction (en_to_es and es_to_en). They share spanish + part_of_speech but
 * carry independent SRS state.
 */

import type { CardDirection, StudyStats, UserWord } from '@/types';
import { getDeviceId } from './deviceId';
import { toError } from './errors';
import { initialState, nextState, type Rating, type SrsState } from './srs';
import { getSupabase } from './supabase';

interface UserWordRow {
  id: string;
  user_id: string;
  spanish: string;
  english: string;
  part_of_speech: string;
  source_passage_id: string | null;
  source_sentence: string | null;
  added_at: string;
  srs_due: string;
  srs_interval: number;
  srs_ease: number;
  srs_repetitions: number;
  direction: CardDirection;
  last_reviewed_at: string | null;
  suspended_at: string | null;
}

const SELECT_COLUMNS =
  'id, user_id, spanish, english, part_of_speech, source_passage_id, source_sentence, added_at, srs_due, srs_interval, srs_ease, srs_repetitions, direction, last_reviewed_at, suspended_at';

function toUserWord(row: UserWordRow): UserWord {
  return {
    id: row.id,
    userId: row.user_id,
    spanish: row.spanish,
    english: row.english,
    partOfSpeech: row.part_of_speech,
    sourcePassageId: row.source_passage_id,
    sourceSentence: row.source_sentence,
    addedAt: row.added_at,
    srsDue: row.srs_due,
    srsInterval: row.srs_interval,
    srsEase: row.srs_ease,
    srsRepetitions: row.srs_repetitions,
    direction: row.direction,
    lastReviewedAt: row.last_reviewed_at,
    suspendedAt: row.suspended_at,
  };
}

export interface CaptureWordInput {
  spanish: string;
  english: string;
  partOfSpeech: string;
  sourcePassageId?: string | null;
  sourceSentence?: string | null;
}

export async function listUserWords(): Promise<UserWord[]> {
  const supabase = await getSupabase();
  const userId = await getDeviceId();
  const { data, error } = await supabase
    .from('user_words')
    .select(SELECT_COLUMNS)
    .eq('user_id', userId)
    .order('added_at', { ascending: false });
  if (error) throw toError(error);
  return (data as UserWordRow[]).map(toUserWord);
}

export async function listDueUserWords(now: Date = new Date()): Promise<UserWord[]> {
  const supabase = await getSupabase();
  const userId = await getDeviceId();
  const { data, error } = await supabase
    .from('user_words')
    .select(SELECT_COLUMNS)
    .eq('user_id', userId)
    .is('suspended_at', null)
    .lte('srs_due', now.toISOString())
    .order('srs_due', { ascending: true });
  if (error) throw toError(error);
  return (data as UserWordRow[]).map(toUserWord);
}

const DIRECTIONS: CardDirection[] = ['en_to_es', 'es_to_en'];

export async function captureWord(input: CaptureWordInput): Promise<UserWord[]> {
  const supabase = await getSupabase();
  const userId = await getDeviceId();
  const state = initialState();
  const rows = DIRECTIONS.map(direction => ({
    user_id: userId,
    spanish: input.spanish,
    english: input.english,
    part_of_speech: input.partOfSpeech,
    source_passage_id: input.sourcePassageId ?? null,
    source_sentence: input.sourceSentence ?? null,
    srs_due: state.due,
    srs_interval: state.interval,
    srs_ease: state.ease,
    srs_repetitions: state.repetitions,
    direction,
  }));
  // upsert with ignoreDuplicates: if both rows already exist (re-capture from
  // a different reading), nothing happens; if only one direction exists, the
  // other gets inserted; if neither exists, both are inserted. Idempotent.
  const { data, error } = await supabase
    .from('user_words')
    .upsert(rows, {
      onConflict: 'user_id,spanish,part_of_speech,direction',
      ignoreDuplicates: true,
    })
    .select(SELECT_COLUMNS);
  if (error) throw toError(error);
  return (data as UserWordRow[]).map(toUserWord);
}

export async function reviewUserWord(
  word: UserWord,
  rating: Rating,
  now: Date = new Date(),
): Promise<UserWord> {
  const current: SrsState = {
    interval: word.srsInterval,
    ease: word.srsEase,
    repetitions: word.srsRepetitions,
    due: word.srsDue,
  };
  const next = nextState(current, rating, now);
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('user_words')
    .update({
      srs_due: next.due,
      srs_interval: next.interval,
      srs_ease: next.ease,
      srs_repetitions: next.repetitions,
      last_reviewed_at: now.toISOString(),
    })
    .eq('id', word.id)
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw toError(error);
  return toUserWord(data as UserWordRow);
}

/** Permanently remove a word from the study queue. Reversible only via SQL. */
export async function suspendUserWord(word: UserWord): Promise<UserWord> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('user_words')
    .update({ suspended_at: new Date().toISOString() })
    .eq('id', word.id)
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw toError(error);
  return toUserWord(data as UserWordRow);
}

function startOfLocalDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export async function getStudyStats(now: Date = new Date()): Promise<StudyStats> {
  const supabase = await getSupabase();
  const userId = await getDeviceId();
  const { data, error } = await supabase
    .from('user_words')
    .select('srs_due, last_reviewed_at')
    .eq('user_id', userId)
    .is('suspended_at', null);
  if (error) throw toError(error);

  const todayStart = startOfLocalDay(now);
  let doneToday = 0;
  let dueNow = 0;
  const next7Days = new Array(7).fill(0) as number[];

  for (const row of data as { srs_due: string; last_reviewed_at: string | null }[]) {
    if (row.last_reviewed_at && new Date(row.last_reviewed_at) >= todayStart) {
      doneToday++;
    }
    const due = new Date(row.srs_due);
    const daysAhead = Math.floor((due.getTime() - todayStart.getTime()) / 86_400_000);
    if (daysAhead < 1) {
      dueNow++;
    } else if (daysAhead <= 7) {
      next7Days[daysAhead - 1]++;
    }
  }

  return { doneToday, dueNow, next7Days };
}
