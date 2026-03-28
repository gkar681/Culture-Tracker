import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { CellLine } from '@/hooks/use-cell-lines';

async function fetchCellLine(id: string) {
  const { data, error } = await supabase
    .from('cell_lines')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as CellLine;
}

export function useCellLine(id: string | null) {
  return useQuery({
    queryKey: ['cell_line', id],
    queryFn: () => fetchCellLine(id as string),
    enabled: !!id,
  });
}

