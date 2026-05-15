/**
 * Conjugation deck: shared content in conjugation_cards (read-only) and
 * per-device SRS state in conjugation_card_states. Cards become active for
 * a user when the user releases them; only released cards appear in the
 * Study queue.
 */

import type {
  ConjugationCard,
  ConjugationCardState,
  ConjugationCardWithState,
  ConjugationStats,
} from '@/types';
import { getDeviceId } from './deviceId';
import { toError } from './errors';
import { nextState, type Rating, type SrsState } from './srs';
import { getSupabase } from './supabase';

interface CardRow {
  id: string;
  sequence: number;
  prompt: string;
  notes: string | null;
  tags: string[];
  verb: string | null;
}

interface StateRow {
  id: string;
  user_id: string;
  conjugation_card_id: string;
  released_at: string;
  srs_due: string;
  srs_interval: number;
  srs_ease: number;
  srs_repetitions: number;
  last_reviewed_at: string | null;
  suspended_at: string | null;
}

interface JoinedRow extends StateRow {
  conjugation_cards: CardRow;
}

const CARD_SELECT = 'id, sequence, prompt, notes, tags, verb';
const STATE_SELECT =
  'id, user_id, conjugation_card_id, released_at, srs_due, srs_interval, srs_ease, srs_repetitions, last_reviewed_at, suspended_at';
const JOINED_SELECT = `${STATE_SELECT}, conjugation_cards!inner(${CARD_SELECT})`;

function toCard(row: CardRow): ConjugationCard {
  return {
    id: row.id,
    sequence: row.sequence,
    prompt: row.prompt,
    notes: row.notes,
    tags: row.tags,
    verb: row.verb,
  };
}

function toState(row: StateRow): ConjugationCardState {
  return {
    id: row.id,
    userId: row.user_id,
    conjugationCardId: row.conjugation_card_id,
    releasedAt: row.released_at,
    srsDue: row.srs_due,
    srsInterval: row.srs_interval,
    srsEase: row.srs_ease,
    srsRepetitions: row.srs_repetitions,
    lastReviewedAt: row.last_reviewed_at,
    suspendedAt: row.suspended_at,
  };
}

export async function listDueConjugationCards(
  now: Date = new Date(),
): Promise<ConjugationCardWithState[]> {
  const supabase = await getSupabase();
  const userId = await getDeviceId();
  const { data, error } = await supabase
    .from('conjugation_card_states')
    .select(JOINED_SELECT)
    .eq('user_id', userId)
    .is('suspended_at', null)
    .lte('srs_due', now.toISOString())
    .order('srs_due', { ascending: true });
  if (error) throw toError(error);
  return (data as unknown as JoinedRow[]).map(r => ({
    card: toCard(r.conjugation_cards),
    state: toState(r),
  }));
}

export async function reviewConjugationCard(
  state: ConjugationCardState,
  rating: Rating,
  now: Date = new Date(),
): Promise<ConjugationCardState> {
  const current: SrsState = {
    interval: state.srsInterval,
    ease: state.srsEase,
    repetitions: state.srsRepetitions,
    due: state.srsDue,
  };
  const next = nextState(current, rating, now);
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('conjugation_card_states')
    .update({
      srs_due: next.due,
      srs_interval: next.interval,
      srs_ease: next.ease,
      srs_repetitions: next.repetitions,
      last_reviewed_at: now.toISOString(),
    })
    .eq('id', state.id)
    .select(STATE_SELECT)
    .single();
  if (error) throw toError(error);
  return toState(data as StateRow);
}

/** Permanently remove a card from the study queue. */
export async function suspendConjugationCard(
  state: ConjugationCardState,
): Promise<ConjugationCardState> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('conjugation_card_states')
    .update({ suspended_at: new Date().toISOString() })
    .eq('id', state.id)
    .select(STATE_SELECT)
    .single();
  if (error) throw toError(error);
  return toState(data as StateRow);
}

/** Release the next N unreleased cards. Returns the number actually released. */
export async function releaseConjugationCards(count: number): Promise<number> {
  const supabase = await getSupabase();
  const userId = await getDeviceId();
  const { data, error } = await supabase.rpc('release_conjugation_cards', {
    p_user_id: userId,
    p_count: count,
  });
  if (error) throw toError(error);
  return typeof data === 'number' ? data : Number(data ?? 0);
}

function startOfLocalDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export async function getConjugationStats(
  now: Date = new Date(),
): Promise<ConjugationStats> {
  const supabase = await getSupabase();
  const userId = await getDeviceId();

  const [stateResp, totalResp] = await Promise.all([
    supabase
      .from('conjugation_card_states')
      .select('srs_due, last_reviewed_at')
      .eq('user_id', userId)
      .is('suspended_at', null),
    supabase
      .from('conjugation_cards')
      .select('*', { count: 'exact', head: true }),
  ]);

  if (stateResp.error) throw toError(stateResp.error);
  if (totalResp.error) throw toError(totalResp.error);

  const todayStart = startOfLocalDay(now);
  let doneToday = 0;
  let dueNow = 0;
  const next7Days = new Array(7).fill(0) as number[];

  const rows = (stateResp.data as { srs_due: string; last_reviewed_at: string | null }[]) ?? [];
  for (const r of rows) {
    if (r.last_reviewed_at && new Date(r.last_reviewed_at) >= todayStart) doneToday++;
    const due = new Date(r.srs_due);
    const daysAhead = Math.floor((due.getTime() - todayStart.getTime()) / 86_400_000);
    if (daysAhead < 1) dueNow++;
    else if (daysAhead <= 7) next7Days[daysAhead - 1]++;
  }

  return {
    doneToday,
    dueNow,
    next7Days,
    released: rows.length,
    total: totalResp.count ?? 0,
  };
}
