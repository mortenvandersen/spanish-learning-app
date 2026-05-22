import { LESSONS, type LessonRecord } from './lessons.generated';

export type { LessonRecord };

export type LessonMeta = {
  slug: string;
  number: number;
  unit: number;
  title: string;
};

export type LessonInUnit = LessonMeta & {
  /** True when the lesson has been captured and is browsable. */
  available: boolean;
};

export type LessonUnit = {
  unit: number;
  title: string;
  lessons: LessonInUnit[];
};

/**
 * Master list of every lesson on studyspanish.com's grammar track, in order,
 * grouped by unit. Sourced from the site's lesson-list sidebar. The app shows
 * the full structure so the user always sees what's been captured vs. what
 * still needs scraping.
 */
const LESSON_INDEX: readonly LessonMeta[] = [
  { unit: 1, number: 1, slug: 'genoun1', title: 'Gender of Nouns I' },
  { unit: 1, number: 2, slug: 'genoun2', title: 'Gender of Nouns II' },
  { unit: 1, number: 3, slug: 'cardnum1', title: 'Numbers: 1–10' },
  { unit: 1, number: 4, slug: 'plnoun', title: 'Plural Forms of Nouns' },
  { unit: 1, number: 5, slug: 'defart1', title: 'Def. & Indef. Articles' },
  { unit: 1, number: 6, slug: 'hay', title: 'The Verb Form "Hay"' },
  { unit: 1, number: 7, slug: 'subpro', title: 'Subject Pronouns' },
  { unit: 1, number: 8, slug: 'regverb1', title: 'Reg. Verbs I' },
  { unit: 1, number: 9, slug: 'regverb2', title: 'Reg. Verbs II' },
  { unit: 1, number: 10, slug: 'regverb3', title: 'Reg. Verbs III' },
  { unit: 1, number: 11, slug: 'adj1', title: 'Adjectives I' },
  { unit: 1, number: 12, slug: 'adj2', title: 'Adjectives II' },
  { unit: 1, number: 13, slug: 'days', title: 'Days of the Week' },
  { unit: 1, number: 14, slug: 'cardnum2', title: 'Numbers: 11–30' },

  { unit: 2, number: 15, slug: 'serest1', title: 'Ser and Estar I' },
  { unit: 2, number: 16, slug: 'serest2', title: 'Ser and Estar II' },
  { unit: 2, number: 17, slug: 'serest3', title: 'Ser and Estar III' },
  { unit: 2, number: 18, slug: 'serest4', title: 'Ser and Estar IV' },
  { unit: 2, number: 19, slug: 'neg', title: 'Negation' },
  { unit: 2, number: 20, slug: 'quest', title: 'Questions' },
  { unit: 2, number: 21, slug: 'possadj', title: 'Poss. Adjectives' },
  { unit: 2, number: 22, slug: 'tenven', title: 'Tener, venir' },
  { unit: 2, number: 23, slug: 'tenque', title: '"Tener Que" and "Hay Que"' },
  { unit: 2, number: 24, slug: 'tenexp', title: 'Exp. with "Tener"' },
  { unit: 2, number: 25, slug: 'wthrexp', title: 'Weather Expressions' },
  { unit: 2, number: 26, slug: 'persa', title: 'The Personal "a"' },
  { unit: 2, number: 27, slug: 'contr', title: 'Contractions' },

  { unit: 3, number: 28, slug: 'stemue', title: 'Stem-Changing Verbs: o:ue' },
  { unit: 3, number: 29, slug: 'stemie', title: 'Stem-Changing Verbs: e:ie' },
  { unit: 3, number: 30, slug: 'stemi', title: 'Stem-Changing Verbs: e:i' },
  { unit: 3, number: 31, slug: 'estarirdar', title: 'Estar, Ir, Dar' },
  { unit: 3, number: 32, slug: 'ira', title: '"Ir A" + Infinitive' },
  { unit: 3, number: 33, slug: 'acabarde', title: '"Acabar De" + Infinitive' },
  { unit: 3, number: 34, slug: 'volvera', title: '"Volver A" + Infinitive' },
  { unit: 3, number: 35, slug: 'ordnum', title: 'Ordinal Numbers' },
  { unit: 3, number: 36, slug: 'months', title: 'Months, Seasons, and Dates' },
  { unit: 3, number: 37, slug: 'inequal', title: 'Comparisons of Inequality' },
  { unit: 3, number: 38, slug: 'equal', title: 'Comparisons of Equality' },
  { unit: 3, number: 39, slug: 'super', title: 'Superlatives' },

  { unit: 4, number: 40, slug: 'oppro', title: 'Pronouns as Objects of Prepositions' },
  { unit: 4, number: 41, slug: 'dopro1', title: 'Dir. Object Pronouns I' },
  { unit: 4, number: 42, slug: 'dopro2', title: 'Dir. Object Pronouns II' },
  { unit: 4, number: 43, slug: 'dopro3', title: 'Dir. Object Pronouns III' },
  { unit: 4, number: 44, slug: 'iopro1', title: 'Ind. Object Pronouns I' },
  { unit: 4, number: 45, slug: 'iopro2', title: 'Ind. Object Pronouns II' },
  { unit: 4, number: 46, slug: 'iopro3', title: 'Ind. Object Pronouns III' },
  { unit: 4, number: 47, slug: 'iodopro', title: 'DO and IO Pronouns Together' },
  { unit: 4, number: 48, slug: 'gustar', title: 'Verbs Like Gustar' },
  { unit: 4, number: 49, slug: 'presprog', title: 'Present Progressive' },
  { unit: 4, number: 50, slug: 'irregfirst', title: 'Verbs with Irregular 1st Persons' },

  { unit: 5, number: 51, slug: 'sabcon', title: 'Saber vs Conocer / Pedir vs Preguntar' },
  { unit: 5, number: 52, slug: 'cardnum3', title: 'Numbers: 31–1000' },
  { unit: 5, number: 53, slug: 'time', title: 'Telling Time' },
  { unit: 5, number: 54, slug: 'porpara', title: '"Por" and "Para"' },
  { unit: 5, number: 55, slug: 'irregcomp', title: 'Irreg. Comparatives' },
  { unit: 5, number: 56, slug: 'demonstratives', title: 'Demonstratives' },
  { unit: 5, number: 57, slug: 'timehacer', title: 'Time Expressions with "Hacer"' },
  { unit: 5, number: 58, slug: 'posspro', title: 'Possessive Pronouns' },
  { unit: 5, number: 59, slug: 'reflexive1', title: 'Reflexive Verbs I' },
  { unit: 5, number: 60, slug: 'reflexive2', title: 'Reflexive Verbs II' },
  { unit: 5, number: 61, slug: 'defart2', title: 'Definite Article II' },

  { unit: 6, number: 62, slug: 'pretimp1', title: 'Pret. vs Imp. I' },
  { unit: 6, number: 63, slug: 'pret1', title: 'Preterite I' },
  { unit: 6, number: 64, slug: 'imp1', title: 'Imperfect I' },
  { unit: 6, number: 65, slug: 'pret2', title: 'Preterite II' },
  { unit: 6, number: 66, slug: 'imp2', title: 'Imperfect II' },
  { unit: 6, number: 67, slug: 'pretimp2', title: 'Pret. vs Imp. II' },
  { unit: 6, number: 68, slug: 'pret3', title: 'Preterite III' },
  { unit: 6, number: 69, slug: 'imp3', title: 'Imperfect III' },
  { unit: 6, number: 70, slug: 'pret4', title: 'Preterite IV' },
  { unit: 6, number: 71, slug: 'pret5', title: 'Preterite V' },
  { unit: 6, number: 72, slug: 'pret6', title: 'Preterite VI' },
  { unit: 6, number: 73, slug: 'pretimp3', title: 'Pret. vs Imp. III' },
  { unit: 6, number: 74, slug: 'pretimp4', title: 'Pret. vs Imp. Review' },

  { unit: 7, number: 75, slug: 'hacerago', title: '"Hace ..." to mean "ago"' },
  { unit: 7, number: 76, slug: 'adverbs', title: 'Formation of Adverbs' },
  { unit: 7, number: 77, slug: 'subj1', title: 'Subjunctive I: Introduction' },
  { unit: 7, number: 78, slug: 'subj2', title: 'Subjunctive II: Conjugating regular and stem-changing verbs' },
  { unit: 7, number: 79, slug: 'subj3', title: 'Subjunctive III: Verbs that change orthographically' },
  { unit: 7, number: 80, slug: 'subj4', title: 'Subjunctive IV: Irregular verbs' },
  { unit: 7, number: 81, slug: 'subj5', title: 'Subjunctive V: Desire' },
  { unit: 7, number: 82, slug: 'subj6', title: 'Subjunctive VI: Ignorance, doubt' },
  { unit: 7, number: 83, slug: 'subj7', title: 'Subjunctive VII: Impersonal Expressions' },
  { unit: 7, number: 84, slug: 'subj8', title: 'Subjunctive VIII: Actions not yet completed' },

  { unit: 8, number: 85, slug: 'relproque', title: 'Rel. Pronouns – que' },
  { unit: 8, number: 86, slug: 'relproquien', title: 'Rel. Pronouns – quien' },
  { unit: 8, number: 87, slug: 'relproelque', title: 'Rel. Pronouns – el que and lo que' },
  { unit: 8, number: 88, slug: 'reladjcuyo', title: 'Rel. Adjective – cuyo' },
  { unit: 8, number: 89, slug: 'relprorev', title: 'Rel. Pronouns and Adjectives – Review' },
  { unit: 8, number: 90, slug: 'formcomm', title: 'Formal Commands' },
  { unit: 8, number: 91, slug: 'informcomm1', title: 'Inform. Commands – tú' },
  { unit: 8, number: 92, slug: 'irregtucomm', title: 'Irreg. Commands – tú' },
  { unit: 8, number: 93, slug: 'procomm', title: 'Using Object Pronouns with Commands' },
  { unit: 8, number: 94, slug: 'commrev1', title: 'Commands Review I' },
  { unit: 8, number: 95, slug: 'informcomm2', title: 'Informal Commands – vosotros' },
  { unit: 8, number: 96, slug: 'noscomm', title: '1st Person Commands – nosotros' },
  { unit: 8, number: 97, slug: 'indcomm', title: 'Indirect Commands' },
  { unit: 8, number: 98, slug: 'commrev2', title: 'Commands Review II' },

  { unit: 9, number: 99, slug: 'future', title: 'Future' },
  { unit: 9, number: 100, slug: 'pastpart', title: 'Past Participle' },
  { unit: 9, number: 101, slug: 'presperfect', title: 'Present Perfect' },
  { unit: 9, number: 102, slug: 'pastperfect', title: 'Past Perfect (Pluperfect)' },
  { unit: 9, number: 103, slug: 'futureperfect', title: 'Future Perfect' },
  { unit: 9, number: 104, slug: 'conditional', title: 'Conditional' },
  { unit: 9, number: 105, slug: 'imperfect-subjunctive', title: 'Imperfect Subjunctive I' },
  { unit: 9, number: 106, slug: 'imperfect-subjunctive-ii', title: 'Imperfect Subjunctive II' },
  { unit: 9, number: 107, slug: 'imperfect-subjunctive-iii', title: 'Imperfect Subjunctive III' },
  { unit: 9, number: 108, slug: 'rules-of-accentuation', title: 'Rules of Accentuation' },
];

const UNIT_TITLES: Record<number, string> = {
  1: 'Unit One',
  2: 'Unit Two',
  3: 'Unit Three',
  4: 'Unit Four',
  5: 'Unit Five',
  6: 'Unit Six',
  7: 'Unit Seven',
  8: 'Unit Eight',
  9: 'Unit Nine',
};

export function getLessonsByUnit(): LessonUnit[] {
  const byUnit = new Map<number, LessonInUnit[]>();
  for (const meta of LESSON_INDEX) {
    const list = byUnit.get(meta.unit) ?? [];
    list.push({ ...meta, available: meta.slug in LESSONS });
    byUnit.set(meta.unit, list);
  }
  return Array.from(byUnit.entries())
    .sort(([a], [b]) => a - b)
    .map(([unit, lessons]) => ({
      unit,
      title: UNIT_TITLES[unit] ?? `Unit ${unit}`,
      lessons,
    }));
}

export function getLesson(slug: string): LessonRecord | undefined {
  return LESSONS[slug];
}

export function getLessonMeta(slug: string): LessonMeta | undefined {
  return LESSON_INDEX.find(l => l.slug === slug);
}
