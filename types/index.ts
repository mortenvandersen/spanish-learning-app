export interface Sense {
  definition: string;
  exampleEs?: string;
  exampleEn?: string;
}

export interface Lemma {
  id: number;
  lemma: string;
  partOfSpeech: string;
  gender: string;
  senses: Sense[];
  grammarNoteSlug: string | null;
}

export interface LookupResult {
  surfaceForm: string;
  lemma: Lemma;
  grammarFeatures?: string;
  clitics?: string[];
}

export interface Passage {
  id: string;
  title: string;
  body: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  notes?: string;
  createdAt: string;
}

export interface UserPassage {
  id: string;
  userId: string;
  title: string | null;
  body: string;
  addedAt: string;
}

export interface Concept {
  id: string;
  title: string;
  summary: string;
  body: string;
  sourceUrl: string | null;
  sourceEpisode: string | null;
  createdAt: string;
}

export type CardDirection = 'en_to_es' | 'es_to_en';
export type CardType = 'vocab' | 'concept';

export interface UserWord {
  id: string;
  userId: string;
  spanish: string;
  english: string;
  partOfSpeech: string;
  sourcePassageId: string | null;
  sourceSentence: string | null;
  addedAt: string;
  srsDue: string;
  srsInterval: number;
  srsEase: number;
  srsRepetitions: number;
  direction: CardDirection;
  lastReviewedAt: string | null;
  suspendedAt: string | null;
  cardType: CardType;
}

export interface StudyStats {
  doneToday: number;       // cards reviewed since local-day start
  dueNow: number;          // overdue + due today
  next7Days: number[];     // length 7, next7Days[0] = tomorrow, [6] = 7 days out
}

export interface ConjugationCard {
  id: string;
  sequence: number;
  prompt: string;       // raw template with {{cN::answer::hint}} markup
  notes: string | null;
  tags: string[];
  verb: string | null;
}

export interface ConjugationCardState {
  id: string;
  userId: string;
  conjugationCardId: string;
  releasedAt: string;
  srsDue: string;
  srsInterval: number;
  srsEase: number;
  srsRepetitions: number;
  lastReviewedAt: string | null;
  suspendedAt: string | null;
}

/** A card joined with its per-user state. The shape used by the Study tab. */
export interface ConjugationCardWithState {
  card: ConjugationCard;
  state: ConjugationCardState;
}

export interface ConjugationStats extends StudyStats {
  released: number;        // count of state rows for this user
  total: number;           // count of conjugation_cards in the deck
}
