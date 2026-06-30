'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAuthErrorMessage, routeForRole } from '@/lib/auth';
import { assertSupabaseBrowserConfig, supabase } from '@/lib/supabase';

export default function AuthRedirectPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function redirectByRole() {
      try {
        assertSupabaseBrowserConfig();
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!sessionData.session) {
          router.replace('/login');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', sessionData.session.user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        router.replace(routeForRole(profile.role));
      } catch (error) {
        setErrorMessage(getAuthErrorMessage(error));
      }
    }

    void redirectByRole();
  }, [router]);

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <h1>Redirigiendo</h1>
        <p>Estamos verificando el rol de tu cuenta.</p>
        {errorMessage ? <div className="error-text">{errorMessage}</div> : null}
      </section>
    </main>
  );
}
