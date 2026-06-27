import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('snip_session');
  const isAuthenticated = verifySessionToken(session?.value);

  if (!isAuthenticated) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true });
}
