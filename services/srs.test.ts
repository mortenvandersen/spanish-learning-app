import { INITIAL_EASE, MIN_EASE, formatInterval, initialState, nextState } from './srs';

const NOW = new Date('2026-05-15T12:00:00Z');

function daysBetween(a: string, b: string): number {
  const ms = new Date(a).getTime() - new Date(b).getTime();
  return Math.round(ms / 86_400_000);
}

describe('SM-2 with Anki-style multipliers', () => {
  describe('initial state', () => {
    it('starts due now with ease=2.5 and zero repetitions', () => {
      const s = initialState(NOW);
      expect(s.ease).toBe(INITIAL_EASE);
      expect(s.repetitions).toBe(0);
      expect(s.interval).toBe(0);
      expect(s.due).toBe(NOW.toISOString());
    });
  });

  describe('first review (graduation)', () => {
    it('Good gives a 1-day interval', () => {
      const s = nextState(initialState(NOW), 'good', NOW);
      expect(s.repetitions).toBe(1);
      expect(s.interval).toBe(1);
      expect(daysBetween(s.due, NOW.toISOString())).toBe(1);
    });

    it('Hard gives a 1-day interval', () => {
      const s = nextState(initialState(NOW), 'hard', NOW);
      expect(s.interval).toBe(1);
    });

    it('Easy gives a 4-day head start', () => {
      const s = nextState(initialState(NOW), 'easy', NOW);
      expect(s.interval).toBe(4);
      expect(daysBetween(s.due, NOW.toISOString())).toBe(4);
    });
  });

  describe('second review (Hard / Good / Easy each diverge)', () => {
    function afterFirstGood(): { interval: number; ease: number; repetitions: number; due: string } {
      return nextState(initialState(NOW), 'good', NOW);
    }

    it('Hard >= 2 days and at least 1 day past Again', () => {
      const s = nextState(afterFirstGood(), 'hard', NOW);
      expect(s.interval).toBeGreaterThanOrEqual(2);
    });

    it('Good uses prev_interval * new_ease', () => {
      const after = afterFirstGood();
      const s = nextState(after, 'good', NOW);
      expect(s.interval).toBe(Math.max(1, Math.round(after.interval * s.ease)));
    });

    it('Easy is always at least 1 day past Good', () => {
      const after = afterFirstGood();
      const hard = nextState(after, 'hard', NOW);
      const good = nextState(after, 'good', NOW);
      const easy = nextState(after, 'easy', NOW);
      expect(hard.interval).toBeLessThan(good.interval + 1);
      expect(easy.interval).toBeGreaterThan(good.interval);
    });

    it('produces a strict Again < Hard < Good < Easy ordering on a typical card', () => {
      // After an Easy first-pass the prev interval is 4 — wide enough for
      // all four ratings to fan out cleanly.
      const after = nextState(initialState(NOW), 'easy', NOW);
      const again = nextState(after, 'again', NOW);
      const hard = nextState(after, 'hard', NOW);
      const good = nextState(after, 'good', NOW);
      const easy = nextState(after, 'easy', NOW);
      expect(again.interval).toBeLessThan(hard.interval);
      expect(hard.interval).toBeLessThan(good.interval);
      expect(good.interval).toBeLessThan(easy.interval);
    });
  });

  describe('ease adjustment direction', () => {
    it('Easy raises ease more than Good', () => {
      const easyS = nextState(initialState(NOW), 'easy', NOW);
      const goodS = nextState(initialState(NOW), 'good', NOW);
      expect(easyS.ease).toBeGreaterThan(goodS.ease);
    });

    it('Hard lowers ease relative to Good', () => {
      const hardS = nextState(initialState(NOW), 'hard', NOW);
      const goodS = nextState(initialState(NOW), 'good', NOW);
      expect(hardS.ease).toBeLessThan(goodS.ease);
    });
  });

  describe('lapses', () => {
    it('Again resets repetitions to 0 and interval to 1 day', () => {
      let s = nextState(initialState(NOW), 'good', NOW);
      s = nextState(s, 'good', new Date(s.due));
      s = nextState(s, 'again', new Date(s.due));
      expect(s.repetitions).toBe(0);
      expect(s.interval).toBe(1);
    });

    it('ease never drops below MIN_EASE under repeated "again"', () => {
      let s = initialState(NOW);
      for (let i = 0; i < 20; i++) {
        s = nextState(s, 'again', new Date(s.due));
      }
      expect(s.ease).toBe(MIN_EASE);
    });
  });
});

describe('formatInterval', () => {
  it('formats short intervals as days', () => {
    expect(formatInterval(1)).toBe('1d');
    expect(formatInterval(6)).toBe('6d');
    expect(formatInterval(30)).toBe('30d');
  });

  it('formats month-scale intervals as months', () => {
    expect(formatInterval(31)).toBe('1mo');
    expect(formatInterval(60)).toBe('2mo');
    expect(formatInterval(180)).toBe('6mo');
  });

  it('formats year-scale intervals as years', () => {
    expect(formatInterval(365)).toBe('1y');
    expect(formatInterval(730)).toBe('2y');
  });

  it('clamps sub-day intervals to "<1d"', () => {
    expect(formatInterval(0)).toBe('<1d');
    expect(formatInterval(-1)).toBe('<1d');
  });
});
