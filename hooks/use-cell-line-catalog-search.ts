import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type CatalogSearchResult = {
  id: string;
  name: string;
  organism: string | null;
};

async function searchCatalog(term: string) {
  const q = term.trim();
  if (!q) return [];

  const { data, error } = await supabase
    .from('cell_line_catalog')
    .select('id, name, organism')
    .ilike('name', `${q}%`)
    .order('name')
    .limit(10);

  if (error) {
    throw error;
  }

  return (data ?? []) as CatalogSearchResult[];
}

export function useCellLineCatalogSearch(term: string) {
  return useQuery({
    queryKey: ['cell_line_catalog_search', term],
    queryFn: () => searchCatalog(term),
    enabled: term.trim().length >= 1,
  });
}

