import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '@/services/supabase';
import type { Passage } from '@/types';

interface PassageRow {
  id: string;
  title: string;
  body: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  notes: string | null;
  created_at: string;
}

function toPassage(row: PassageRow): Passage {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    level: row.level,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export function usePassages() {
  return useQuery<Passage[]>({
    queryKey: ['passages'],
    queryFn: async () => {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('passages')
        .select('id, title, body, level, notes, created_at')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as PassageRow[]).map(toPassage);
    },
  });
}
