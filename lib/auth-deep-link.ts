/**
 * Supabase puts tokens in the URL fragment (#access_token=...&refresh_token=...&type=recovery).
 */
export function parseSupabaseAuthFragment(url: string): {
  access_token: string | null;
  refresh_token: string | null;
  type: string | null;
} {
  const hashIdx = url.indexOf('#');
  const fragment = hashIdx >= 0 ? url.slice(hashIdx + 1) : '';
  if (!fragment) {
    const qIdx = url.indexOf('?');
    if (qIdx < 0) {
      return { access_token: null, refresh_token: null, type: null };
    }
    const qs = new URLSearchParams(url.slice(qIdx + 1));
    return {
      access_token: qs.get('access_token'),
      refresh_token: qs.get('refresh_token'),
      type: qs.get('type'),
    };
  }
  const params = new URLSearchParams(fragment);
  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    type: params.get('type'),
  };
}
