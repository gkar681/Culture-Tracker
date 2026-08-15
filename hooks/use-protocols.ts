import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type Protocol = {
  id: string;
  name: string;
  category: string | null;
  steps: any; // jsonb structure of steps
  created_by: string;
  created_at: string;
};

async function fetchProtocols() {
  const { data, error } = await supabase
    .from('protocols')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data as Protocol[];
}

export function useProtocols() {
  return useQuery({
    queryKey: ['protocols'],
    queryFn: fetchProtocols,
  });
}
