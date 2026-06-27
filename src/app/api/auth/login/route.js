import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SESSION_TOKEN = 'snip_session';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    const adminUser = process.env.ADMIN_USERNAME;
    const adminPass = process.env.ADMIN_PASSWORD;

    if (!adminUser || !adminPass) {
      return NextResponse.json(
        { error: 'Admin credentials not configured' },
        { status: 500 }
      );
    }

    if (username !== adminUser || password !== adminPass) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Create a simple session token (timestamp + secret hash)
    const token = Buffer.from(`${adminUser}:${Date.now()}:${adminPass}`).toString('base64');

    const response = NextResponse.json({ success: true });
    
    const cookieStore = await cookies();
    cookieStore.set(SESSION_TOKEN, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
