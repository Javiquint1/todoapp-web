import { NextResponse } from 'next/server';
import { accessTokenCookie, refreshTokenCookie } from '@/lib/session';

export async function POST(request: Request) {
  const body = (await request.json()) as {
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
  };

  if (!body.accessToken || !body.refreshToken) {
    return NextResponse.json({ error: 'Sesion invalida.' }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(accessTokenCookie, body.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.max(body.expiresIn ?? 3600, 60),
  });
  response.cookies.set(refreshTokenCookie, body.refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
