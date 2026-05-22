import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createUserPassage,
  deleteUserPassage,
  getUserPassage,
  listUserPassages,
  markUserPassageRead,
  markUserPassageUnread,
  type CreateUserPassageInput,
} from '@/services/userPassages';

const KEY = ['userPassages'] as const;

export function useUserPassages() {
  return useQuery({
    queryKey: KEY,
    queryFn: listUserPassages,
  });
}

export function useUserPassage(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => {
      if (!id) throw new Error('id required');
      return getUserPassage(id);
    },
    enabled: !!id,
  });
}

export function useCreateUserPassage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserPassageInput) => createUserPassage(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteUserPassage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUserPassage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMarkUserPassageRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markUserPassageRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMarkUserPassageUnread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markUserPassageUnread(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
