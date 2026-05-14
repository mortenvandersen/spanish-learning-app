/**
 * SM-2 spaced repetition.
 *
 * State per card: { interval (days), ease, repetitions, due }.
 * See CLAUDE.md "SRS uses SM-2". Concrete SM-2 parameter choices
 * (initial ease, min ease floor, lapse penalty, rating->quality map)
 * still to be pinned.
 */

export type Rating = 'again' | 'hard' | 'good' | 'easy';

export interface SrsState {
  interval: number;
  ease: number;
  repetitions: number;
  due: string;
}

export function initialState(now: Date = new Date()): SrsState {
  return {
    interval: 0,
    ease: 2.5,
    repetitions: 0,
    due: now.toISOString(),
  };
}

export function nextState(prev: SrsState, _rating: Rating, _now: Date = new Date()): SrsState {
  // TODO: implement SM-2.
  return prev;
}
