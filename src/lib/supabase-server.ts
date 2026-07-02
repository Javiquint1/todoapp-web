import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export async function createServerSupabaseClient() {
  return createClient();
}

export async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,role,full_name,email')
    .eq('user_id', user.id)
    .single();

  if (profileError || !['ADMIN', 'SUPER_ADMIN'].includes(profile?.role ?? '')) {
    redirect('/auth/redirect');
  }

  return { supabase, user, adminProfile: profile };
}
