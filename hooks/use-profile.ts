import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export type ProfileRow = {
  id: string;
  display_name: string | null;
  lab_name: string | null;
  bio: string | null;
};

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async (): Promise<ProfileRow | null> => {
      if (!user) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        display_name: (data as { display_name?: string | null }).display_name ?? null,
        lab_name: (data as { lab_name?: string | null }).lab_name ?? null,
        bio: (data as { bio?: string | null }).bio ?? null,
      };
    },
    enabled: !!user,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { display_name: string; lab_name: string; bio: string }) => {
      if (!user) throw new Error('You must be signed in.');

      const { error } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          display_name: input.display_name.trim() || null,
          lab_name: input.lab_name.trim() || null,
          bio: input.bio.trim() || null,
        },
        { onConflict: 'id' },
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });
}
