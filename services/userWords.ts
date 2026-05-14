/**
 * CRUD for the per-device `user_words` table. All queries scope by the
 * device-generated UUID from services/deviceId.ts; that UUID is the user_id.
 *
 * Bidirectional cards: each captureWord() insert creates two rows, one per
 * direction (en_to_es and es_to_en). They share spanish + part_of_speech but
 * carry independent SRS state.
 */

import type { CardDirection, UserWord } from '@/types';
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
}

const SELECT_COLUMNS =
  'id, user_id, spanish, english, part_of_speech, source_passage_id, source_sentence, added_at, srs_due, srs_interval, srs_ease, srs_repetitions, direction';

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
  const { data, error } = await supabase
    .from('user_words')
    .insert(rows)
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
    })
    .eq('id', word.id)
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw toError(error);
  return toUserWord(data as UserWordRow);
}
