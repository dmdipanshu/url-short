import { NextResponse } from 'next/server';
import { getUrlStats } from '@/lib/urls';

export async function GET(request, { params }) {
  try {
    const { code } = await params;

    const stats = await getUrlStats(code);

    if (!stats) {
      return NextResponse.json(
        { error: 'Short URL not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
