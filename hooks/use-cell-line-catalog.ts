import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type CatalogCellLine = {
  id: string;
  name: string;
  organism: string | null;
  tissue_type: string | null;
  morphology: string | null;
  typical_doubling_hrs: number | null;
};

async function fetchCatalogEntry(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from('cell_line_catalog')
    .select('id, name, organism, tissue_type, morphology, typical_doubling_hrs')
    .ilike('name', trimmed)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = multiple or no rows for maybeSingle; treat as no match
    throw error;
  }

  return (data as CatalogCellLine | null) ?? null;
}

export function useCellLineCatalog(name: string) {
  return useQuery({
    queryKey: ['cell_line_catalog', name],
    queryFn: () => fetchCatalogEntry(name),
    enabled: !!name.trim(),
  });
}

