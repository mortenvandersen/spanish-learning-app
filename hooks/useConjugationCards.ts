import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getConjugationStats,
  listDueConjugationCards,
  releaseConjugationCards,
  reviewConjugationCard,
} from '@/services/conjugationCards';
import type { Rating } from '@/services/srs';
import type { ConjugationCardState } from '@/types';

const ROOT = ['conjugationCards'] as const;
const DUE_KEY = ['conjugationCards', 'due'] as const;
const STATS_KEY = ['conjugationCards', 'stats'] as const;

export function useDueConjugationCards() {
  return useQuery({
    queryKey: DUE_KEY,
    queryFn: () => listDueConjugationCards(),
  });
}

export function useConjugationStats() {
  return useQuery({
    queryKey: STATS_KEY,
    queryFn: () => getConjugationStats(),
  });
}

export function useReviewConjugationCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ state, rating }: { state: ConjugationCardState; rating: Rating }) =>
      reviewConjugationCard(state, rating),
    onSuccess: () => qc.invalidateQueries({ queryKey: ROOT }),
  });
}

export function useReleaseConjugationCards() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (count: number) => releaseConjugationCards(count),
    onSuccess: () => qc.invalidateQueries({ queryKey: ROOT }),
  });
}
