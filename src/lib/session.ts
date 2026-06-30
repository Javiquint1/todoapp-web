import type { Session } from '@supabase/supabase-js';

export const accessTokenCookie = 'todero-access-token';
export const refreshTokenCookie = 'todero-refresh-token';

export async function persistAuthSession(session: Session | null) {
  if (!session) {
    return;
  }

  const response = await fetch('/auth/session', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresIn: session.expires_in,
    }),
  });

  if (!response.ok) {
    throw new Error('No se pudo guardar la sesión de administrador.');
  }
}
