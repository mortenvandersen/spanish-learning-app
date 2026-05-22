import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listReadLessonSlugs,
  markLessonRead,
  markLessonUnread,
} from '@/services/lessonReads';

const READS_KEY = ['lessonReads'] as const;

export function useReadLessonSlugs() {
  return useQuery({
    queryKey: READS_KEY,
    queryFn: listReadLessonSlugs,
  });
}

export function useMarkLessonDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => markLessonRead(slug),
    onSuccess: () => qc.invalidateQueries({ queryKey: READS_KEY }),
  });
}

export function useMarkLessonUndone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => markLessonUnread(slug),
    onSuccess: () => qc.invalidateQueries({ queryKey: READS_KEY }),
  });
}
