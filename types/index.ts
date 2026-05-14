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

export type CardDirection = 'en_to_es' | 'es_to_en';

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
}
