import { NextResponse } from 'next/server';
import { getRedirectInfo } from '@/lib/urls';

export async function GET(request, { params }) {
  try {
    const { code } = await params;

    const info = await getRedirectInfo(code);

    if (!info.url && info.expired) {
      return NextResponse.json({ expired: true }, { status: 410 });
    }

    if (!info.url && info.passwordRequired) {
      return NextResponse.json({ passwordRequired: true, code }, { status: 403 });
    }

    if (!info.url) {
      return NextResponse.json(
        { error: 'Short URL not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ url: info.url });
  } catch (error) {
    console.error('Redirect lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
