/**
 * SM-2 with Anki-style multipliers.
 *
 * Quality scale (rating -> q):  again=0, hard=3, good=4, easy=5.
 * Pass-mark is q >= 3.
 *
 * Ease updates per classical SM-2:
 *   ef' = max(MIN_EASE, ef + (0.1 - (5-q)(0.08 + (5-q)*0.02)))
 *
 * Interval picks based on repetition count and rating:
 *   q < 3 (Again):   reset reps=0, interval=1
 *   First pass:      Good/Hard => 1 day, Easy => 4 days (head start)
 *   Subsequent pass: Hard => max(2, ceil(prev * HARD_FACTOR))
 *                    Good => round(prev * ef')
 *                    Easy => max(Good+1, round(prev * ef' * EASY_BONUS))
 *
 * The min-of-Good+1 floor on Easy stops rounding from collapsing it onto
 * Good for small prev intervals. The Hard floor (2) keeps it strictly past
 * the Again 1-day re-show even when prev is short.
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
export const HARD_FACTOR = 1.2;
export const EASY_BONUS = 1.3;
const FIRST_GOOD_INTERVAL = 1;
const FIRST_EASY_INTERVAL = 4;

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

  if (repetitions === 1) {
    interval = rating === 'easy' ? FIRST_EASY_INTERVAL : FIRST_GOOD_INTERVAL;
  } else if (rating === 'hard') {
    interval = Math.max(2, Math.ceil(prev.interval * HARD_FACTOR));
  } else if (rating === 'good') {
    interval = Math.max(1, Math.round(prev.interval * ease));
  } else {
    // easy: floor at Good's interval + 1 so rounding never collapses them
    const good = Math.max(1, Math.round(prev.interval * ease));
    interval = Math.max(good + 1, Math.round(prev.interval * ease * EASY_BONUS));
  }

  return { interval, ease, repetitions, due: addDays(now, interval) };
}

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

/**
 * Anki-style compact label for an interval in days.
 */
export function formatInterval(days: number): string {
  if (days < 1) return '<1d';
  if (days < 31) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}y`;
}
