import type { Concept } from '@/types';
import { toError } from './errors';
import { getSupabase } from './supabase';

interface ConceptRow {
  id: string;
  title: string;
  summary: string;
  body: string;
  source_url: string | null;
  source_episode: string | null;
  created_at: string;
}

const SELECT_COLUMNS =
  'id, title, summary, body, source_url, source_episode, created_at';

function toConcept(row: ConceptRow): Concept {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    body: row.body,
    sourceUrl: row.source_url,
    sourceEpisode: row.source_episode,
    createdAt: row.created_at,
  };
}

export async function listConcepts(): Promise<Concept[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('concepts')
    .select(SELECT_COLUMNS)
    .order('created_at', { ascending: true });
  if (error) throw toError(error);
  return (data as ConceptRow[]).map(toConcept);
}

export async function getConcept(id: string): Promise<Concept> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('concepts')
    .select(SELECT_COLUMNS)
    .eq('id', id)
    .single();
  if (error) throw toError(error);
  return toConcept(data as ConceptRow);
}
