import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getConcept, listConcepts } from '@/services/concepts';
import {
  listReadConceptIds,
  markConceptRead,
  markConceptUnread,
} from '@/services/conceptReads';

const LIST_KEY = ['concepts'] as const;
const READS_KEY = ['conceptReads'] as const;

export function useConcepts() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: listConcepts,
  });
}

export function useConcept(id: string | undefined) {
  return useQuery({
    queryKey: ['concept', id] as const,
    enabled: !!id,
    queryFn: () => getConcept(id as string),
  });
}

export function useReadConceptIds() {
  return useQuery({
    queryKey: READS_KEY,
    queryFn: listReadConceptIds,
  });
}

export function useMarkConceptDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conceptId: string) => markConceptRead(conceptId),
    onSuccess: () => qc.invalidateQueries({ queryKey: READS_KEY }),
  });
}

export function useMarkConceptUndone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conceptId: string) => markConceptUnread(conceptId),
    onSuccess: () => qc.invalidateQueries({ queryKey: READS_KEY }),
  });
}
