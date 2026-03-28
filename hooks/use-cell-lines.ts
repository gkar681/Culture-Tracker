import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type CellLine = {
  id: string;
  name: string;
  organism: string | null;
  tissue_type: string | null;
  morphology: string | null;
  doubling_time_hours: number | null;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
};

async function fetchCellLines() {
  const { data, error } = await supabase
    .from('cell_lines')
    .select('*')
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data as CellLine[];
}

export function useCellLines() {
  return useQuery({
    queryKey: ['cell_lines'],
    queryFn: fetchCellLines,
  });
}

