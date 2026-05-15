import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listReadPassageIds,
  markPassageRead,
  markPassageUnread,
} from '@/services/passageReads';

const KEY = ['passageReads'] as const;

// Returns plain string[] (not Set) so React Query's default structural
// sharing works correctly. Callers wrap in `new Set(...)` for membership
// lookups.
export function useReadPassageIds() {
  return useQuery({
    queryKey: KEY,
    queryFn: listReadPassageIds,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (passageId: string) => markPassageRead(passageId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMarkUnread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (passageId: string) => markPassageUnread(passageId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
