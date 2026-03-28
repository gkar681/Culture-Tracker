import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

type NewCellLineInput = {
  name: string;
  organism?: string;
  tissue_type?: string;
  morphology?: string;
  doubling_time_hours?: number | null;
  notes?: string;
};

export function useCreateCellLine() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: NewCellLineInput) => {
      if (!user) {
        throw new Error('You must be logged in to create a cell line.');
      }

      const { data, error } = await supabase
        .from('cell_lines')
        .insert({
          name: input.name,
          organism: input.organism ?? null,
          tissue_type: input.tissue_type ?? null,
          morphology: input.morphology ?? null,
          doubling_time_hours: input.doubling_time_hours ?? null,
          notes: input.notes ?? null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cell_lines'] });
    },
  });
}

