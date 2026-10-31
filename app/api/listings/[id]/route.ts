import { NextRequest, NextResponse } from 'next/server';
import { listingService } from '@/server/services/listing.service';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const listing = listingService.getListingById(id);
  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }
  return NextResponse.json(listing);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const result = await listingService.updateListing(id, body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.status === 409 ? 'DUPLICATE_TITLE' : 'VALIDATION_ERROR' },
        { status: result.status }
      );
    }
    return NextResponse.json(result.listing);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const success = listingService.deleteListing(id);
  if (!success) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, message: 'Listing deleted successfully' });
}
