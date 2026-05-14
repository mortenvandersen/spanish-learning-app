/**
 * SM-2 spaced repetition.
 *
 * Quality scale (rating -> q):  again=0, hard=3, good=4, easy=5.
 * Pass-mark is q >= 3 (CLAUDE.md "SRS uses SM-2").
 *
 * Update rules (classical SM-2 per Wozniak):
 *   ef' = max(MIN_EASE, ef + (0.1 - (5-q)(0.08 + (5-q)*0.02)))
 *   if q < 3: repetitions = 0, interval = 1 day
 *   else: repetitions++, then
 *         if reps == 1: interval = 1
 *         if reps == 2: interval = 6
 *         else: interval = round(prev_interval * ef')
 */

export type Rating = 'again' | 'hard' | 'good' | 'easy';

const QUALITY: Record<Rating, number> = {
  again: 0,
  hard: 3,
  good: 4,
  easy: 5,
};

export const INITIAL_EASE = 2.5;
export const MIN_EASE = 1.3;
const FIRST_INTERVAL = 1;
const SECOND_INTERVAL = 6;

export interface SrsState {
  interval: number;
  ease: number;
  repetitions: number;
  due: string;
}

export function initialState(now: Date = new Date()): SrsState {
  return {
    interval: 0,
    ease: INITIAL_EASE,
    repetitions: 0,
    due: now.toISOString(),
  };
}

export function nextState(prev: SrsState, rating: Rating, now: Date = new Date()): SrsState {
  const q = QUALITY[rating];

  const ease = Math.max(
    MIN_EASE,
    prev.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  );

  if (q < 3) {
    return {
      interval: 1,
      ease,
      repetitions: 0,
      due: addDays(now, 1),
    };
  }

  const repetitions = prev.repetitions + 1;
  let interval: number;
  if (repetitions === 1) interval = FIRST_INTERVAL;
  else if (repetitions === 2) interval = SECOND_INTERVAL;
  else interval = Math.max(1, Math.round(prev.interval * ease));

  return { interval, ease, repetitions, due: addDays(now, interval) };
}

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}
