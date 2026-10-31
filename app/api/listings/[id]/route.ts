import { NextRequest, NextResponse } from 'next/server';
import { listingService } from '@/server/services/listing.service';
import { getAuthenticatedUser } from '@/lib/auth/session';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const listing = await listingService.getListingById(id);
  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  // If listing is not approved, only the owner or an admin can view it
  if (listing.status !== 'approved') {
    const authContext = await getAuthenticatedUser(req);
    const isOwner = authContext?.userId === listing.sellerId;
    const isAdmin = Boolean(authContext?.isAdmin);

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Listing not found or pending review' }, { status: 404 });
    }
  }

  return NextResponse.json(listing);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const result = await listingService.updateListing(id, body, authContext.userId, authContext.isAdmin);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.status === 409 ? 'DUPLICATE_TITLE' : 'VALIDATION_ERROR' },
        { status: result.status }
      );
    }
    return NextResponse.json(result.listing);
  } catch (err: any) {
    console.error(`API /api/listings/${id} PUT error:`, err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const success = await listingService.deleteListing(id, authContext.userId, authContext.isAdmin);
    if (!success) {
      return NextResponse.json({ error: 'Listing not found or could not be deleted' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Listing deleted successfully' });
  } catch (err: any) {
    console.error(`API /api/listings/${id} DELETE error:`, err);
    const status = err.message?.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status });
  }
}
