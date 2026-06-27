import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import { getAllUrls, getDashboardStats } from '@/lib/urls';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('snip_session');
    const isAuthenticated = verifySessionToken(session?.value);
    
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const statsOnly = searchParams.get('statsOnly') === 'true';

    if (statsOnly) {
      const stats = await getDashboardStats();
      return NextResponse.json(stats);
    }

    const data = await getAllUrls({ page, limit, search });
    const stats = await getDashboardStats();

    return NextResponse.json({ ...data, stats });
  } catch (error) {
    console.error('URLs fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch URLs' },
      { status: 500 }
    );
  }
}
