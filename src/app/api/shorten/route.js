import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import { createShortUrl, ensureIndexes } from '@/lib/urls';

export async function POST(request) {
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

    const body = await request.json();
    const { url, customAlias, expiresAt, password } = body;

    // Validate URL
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Check if it's a valid URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Please enter a valid URL (include https://)' },
        { status: 400 }
      );
    }

    // Validate custom alias if provided
    if (customAlias) {
      if (!/^[a-zA-Z0-9_-]{3,30}$/.test(customAlias)) {
        return NextResponse.json(
          { error: 'Alias must be 3-30 characters, using only letters, numbers, hyphens, and underscores' },
          { status: 400 }
        );
      }
    }

    // Validate expiry date if provided
    if (expiresAt) {
      const expiryDate = new Date(expiresAt);
      if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
        return NextResponse.json(
          { error: 'Expiry date must be in the future' },
          { status: 400 }
        );
      }
    }

    // Validate password if provided
    if (password && password.length < 3) {
      return NextResponse.json(
        { error: 'Password must be at least 3 characters' },
        { status: 400 }
      );
    }

    // Ensure indexes exist
    await ensureIndexes();

    // Create the short URL
    const result = await createShortUrl(url, {
      customAlias: customAlias || null,
      expiresAt: expiresAt || null,
      password: password || null,
    });

    const baseUrlInput = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get('host');
    let shortUrl;
    if (baseUrlInput.startsWith('http://') || baseUrlInput.startsWith('https://')) {
      const cleanBase = baseUrlInput.endsWith('/') ? baseUrlInput.slice(0, -1) : baseUrlInput;
      shortUrl = `${cleanBase}/${result.code}`;
    } else {
      const protocol = baseUrlInput.startsWith('localhost') ? 'http' : 'https';
      shortUrl = `${protocol}://${baseUrlInput}/${result.code}`;
    }

    return NextResponse.json({
      shortUrl,
      code: result.code,
      originalUrl: result.originalUrl,
      createdAt: result.createdAt,
      expiresAt: result.expiresAt,
      hasPassword: !!result.password,
    });
  } catch (error) {
    console.error('Shorten error:', error);

    if (error.message.includes('already taken')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
