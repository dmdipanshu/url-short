import { NextResponse } from 'next/server';
import { verifyAndGetUrl } from '@/lib/urls';

export async function POST(request, { params }) {
  try {
    const { code } = await params;
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    const result = await verifyAndGetUrl(code, password);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === 'Link not found' ? 404 : 401 }
      );
    }

    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
