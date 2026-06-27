import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import { deleteUrl, updateUrl, getUrlStats } from '@/lib/urls';

export async function DELETE(request, { params }) {
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

    const { code } = await params;
    const deleted = await deleteUrl(code);

    if (!deleted) {
      return NextResponse.json(
        { error: 'URL not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete URL' },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
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

    const { code } = await params;
    const body = await request.json();

    // Validate original URL if provided
    if (body.originalUrl) {
      try {
        new URL(body.originalUrl);
      } catch {
        return NextResponse.json(
          { error: 'Please enter a valid URL' },
          { status: 400 }
        );
      }
    }

    // Validate expiry if provided
    if (body.expiresAt) {
      const expiryDate = new Date(body.expiresAt);
      if (isNaN(expiryDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid expiry date' },
          { status: 400 }
        );
      }
    }

    const updated = await updateUrl(code, body);

    if (!updated) {
      return NextResponse.json(
        { error: 'URL not found or no changes made' },
        { status: 404 }
      );
    }

    // Return updated URL data
    const updatedDoc = await getUrlStats(code);
    return NextResponse.json(updatedDoc);
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update URL' },
      { status: 500 }
    );
  }
}
