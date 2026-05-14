import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  captureWord,
  listDueUserWords,
  listUserWords,
  reviewUserWord,
  type CaptureWordInput,
} from '@/services/userWords';
import type { Rating } from '@/services/srs';
import type { UserWord } from '@/types';

const ALL_KEY = ['userWords'] as const;
const DUE_KEY = ['userWords', 'due'] as const;

export function useUserWords() {
  return useQuery({
    queryKey: ALL_KEY,
    queryFn: listUserWords,
  });
}

export function useDueUserWords() {
  return useQuery({
    queryKey: DUE_KEY,
    queryFn: () => listDueUserWords(),
  });
}

export function useCaptureWord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CaptureWordInput) => captureWord(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['userWords'] });
    },
  });
}

export function useReviewUserWord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ word, rating }: { word: UserWord; rating: Rating }) =>
      reviewUserWord(word, rating),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['userWords'] });
    },
  });
}
