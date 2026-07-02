import { createBrowserClient } from '@supabase/ssr';
import { requireSupabaseBrowserConfig } from './config';

export const createClient = () => {
  const { supabaseKey, supabaseUrl } = requireSupabaseBrowserConfig();

  return createBrowserClient(supabaseUrl, supabaseKey);
};
