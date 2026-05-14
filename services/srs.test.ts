import { INITIAL_EASE, MIN_EASE, initialState, nextState } from './srs';

const NOW = new Date('2026-05-14T12:00:00Z');

function daysBetween(a: string, b: string): number {
  const ms = new Date(a).getTime() - new Date(b).getTime();
  return Math.round(ms / 86_400_000);
}

describe('SM-2', () => {
  describe('initial state', () => {
    it('starts due now with ease=2.5 and zero repetitions', () => {
      const s = initialState(NOW);
      expect(s.ease).toBe(INITIAL_EASE);
      expect(s.repetitions).toBe(0);
      expect(s.interval).toBe(0);
      expect(s.due).toBe(NOW.toISOString());
    });
  });

  describe('passing reviews', () => {
    it('first "good" gives a 1-day interval and reps=1', () => {
      const s = nextState(initialState(NOW), 'good', NOW);
      expect(s.repetitions).toBe(1);
      expect(s.interval).toBe(1);
      expect(daysBetween(s.due, NOW.toISOString())).toBe(1);
    });

    it('second "good" gives a 6-day interval and reps=2', () => {
      let s = nextState(initialState(NOW), 'good', NOW);
      s = nextState(s, 'good', new Date(s.due));
      expect(s.repetitions).toBe(2);
      expect(s.interval).toBe(6);
    });

    it('third "good" multiplies the previous interval by the updated ease', () => {
      let s = nextState(initialState(NOW), 'good', NOW);
      s = nextState(s, 'good', new Date(s.due));
      const prevInterval = s.interval;
      s = nextState(s, 'good', new Date(s.due));
      expect(s.repetitions).toBe(3);
      // ease was updated this rep; interval = round(prev * ease).
      expect(s.interval).toBe(Math.max(1, Math.round(prevInterval * s.ease)));
    });

    it('"easy" raises ease more than "good"', () => {
      const easyS = nextState(initialState(NOW), 'easy', NOW);
      const goodS = nextState(initialState(NOW), 'good', NOW);
      expect(easyS.ease).toBeGreaterThan(goodS.ease);
    });

    it('"hard" lowers ease relative to "good"', () => {
      const hardS = nextState(initialState(NOW), 'hard', NOW);
      const goodS = nextState(initialState(NOW), 'good', NOW);
      expect(hardS.ease).toBeLessThan(goodS.ease);
    });
  });

  describe('lapses', () => {
    it('"again" resets repetitions to 0 and interval to 1 day', () => {
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
