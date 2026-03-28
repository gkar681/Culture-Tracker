import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type Experiment = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

async function fetchExperiments() {
  const { data, error } = await supabase
    .from('experiments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Experiment[];
}

export function useExperiments() {
  return useQuery({
    queryKey: ['experiments'],
    queryFn: fetchExperiments,
  });
}

