import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

type NewExperimentInput = {
  name: string;
  description?: string;
  status?: 'planned' | 'in_progress' | 'completed';
  start_date?: string; // ISO date string: YYYY-MM-DD
  end_date?: string | null;
  cellLineIds: string[];
};

export function useCreateExperiment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: NewExperimentInput) => {
      if (!user) throw new Error('Not authenticated');
      if (!input.name.trim()) throw new Error('Experiment name is required');
      if (!input.cellLineIds.length) throw new Error('Select at least one cell line');

      const { data: exp, error: expError } = await supabase
        .from('experiments')
        .insert({
          name: input.name.trim(),
          description: input.description ?? null,
          status: input.status ?? 'planned',
          start_date: input.start_date ?? null,
          end_date: input.end_date ?? null,
          created_by: user.id,
        })
        .select()
        .single();

      if (expError) throw expError;

      // Link selected cell lines to the experiment.
      // Note: In a perfect world we’d do this in a transaction server-side,
      // but for MVP sequential inserts are fine.
      const inserts = input.cellLineIds.map((cellLineId) =>
        supabase.from('experiment_cell_lines').insert({
          experiment_id: exp.id,
          cell_line_id: cellLineId,
          role: null,
        }),
      );
      const results = await Promise.all(inserts);
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;

      return exp;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiments'] });
    },
  });
}

