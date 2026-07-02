import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { accessTokenCookie } from '@/lib/session';
import { requireSupabaseBrowserConfig } from './config';

export const createClient = async (cookieStore?: Awaited<ReturnType<typeof cookies>>) => {
  const { supabaseKey, supabaseUrl } = requireSupabaseBrowserConfig();
  const resolvedCookieStore = cookieStore ?? (await cookies());
  const accessToken = resolvedCookieStore.get(accessTokenCookie)?.value;

  return createServerClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    cookies: {
      getAll() {
        return resolvedCookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, options, value }) =>
            resolvedCookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot set cookies; middleware refreshes the session.
        }
      },
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
};
