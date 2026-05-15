import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listReadPassageIds,
  markPassageRead,
  markPassageUnread,
} from '@/services/passageReads';

const KEY = ['passageReads'] as const;

export function useReadPassageIds() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => new Set(await listReadPassageIds()),
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (passageId: string) => markPassageRead(passageId),
    onMutate: async (passageId: string) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<Set<string>>(KEY);
      qc.setQueryData<Set<string>>(KEY, old => {
        const next = new Set(old ?? []);
        next.add(passageId);
        return next;
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMarkUnread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (passageId: string) => markPassageUnread(passageId),
    onMutate: async (passageId: string) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<Set<string>>(KEY);
      qc.setQueryData<Set<string>>(KEY, old => {
        const next = new Set(old ?? []);
        next.delete(passageId);
        return next;
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
