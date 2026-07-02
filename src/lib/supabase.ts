import { createClient } from '@/utils/supabase/client';
import { getSupabaseBrowserConfig, requireSupabaseBrowserConfig } from '@/utils/supabase/config';

const { supabaseKey, supabaseUrl } = getSupabaseBrowserConfig();

export const hasSupabaseBrowserConfig = Boolean(supabaseUrl && supabaseKey);

export const supabase = createClient();

export function assertSupabaseBrowserConfig() {
  requireSupabaseBrowserConfig();
}
