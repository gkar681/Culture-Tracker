import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type Reagent = {
  id: string;
  name: string;
  category: string | null;
  lot_number: string | null;
  expiry_date: string | null;
  quantity_remaining: number | null;
  quantity_unit: string | null;
  low_stock_threshold: number | null;
  notes: string | null;
  created_by: string;
  created_at: string;
};

async function fetchReagents() {
  const { data, error } = await supabase
    .from('reagents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data as Reagent[];
}

export function useReagents() {
  return useQuery({
    queryKey: ['reagents'],
    queryFn: fetchReagents,
  });
}

// Utility function to check if a reagent is low on stock
export function isLowStock(reagent: Reagent): boolean {
  if (reagent.quantity_remaining === null || reagent.low_stock_threshold === null) {
    return false;
  }
  return reagent.quantity_remaining <= reagent.low_stock_threshold;
}

// Utility function to check if a reagent is expired
export function isExpired(reagent: Reagent): boolean {
  if (!reagent.expiry_date) {
    return false;
  }
  const expiry = new Date(reagent.expiry_date);
  const now = new Date();
  // Strip time for clean date-only comparison
  expiry.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return expiry < now;
}
