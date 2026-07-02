export function getSupabaseBrowserConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return { supabaseKey, supabaseUrl };
}

export function requireSupabaseBrowserConfig() {
  const { supabaseKey, supabaseUrl } = getSupabaseBrowserConfig();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  }

  return { supabaseKey, supabaseUrl };
}
