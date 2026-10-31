import { NextRequest, NextResponse } from 'next/server';
import { listingService } from '@/server/services/listing.service';
import { getAuthenticatedUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city') || undefined;
  const category = searchParams.get('category') || undefined;
  const subcategory = searchParams.get('subcategory') || undefined;
  const search = searchParams.get('search') || undefined;
  const requestedStatus = searchParams.get('status') || undefined;
  const sellerId = searchParams.get('sellerId') || undefined;
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
  const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined;
  const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : undefined;

  // Security Rule 2.3: Only verified administrators or the listing owner can view non-approved listings
  let effectiveStatus: string | undefined = 'approved';
  if (requestedStatus && requestedStatus !== 'approved') {
    const authContext = await getAuthenticatedUser(req);
    if (authContext?.isAdmin) {
      effectiveStatus = requestedStatus; // Admin permitted to view any status
    } else if (authContext?.userId && sellerId === authContext.userId) {
      effectiveStatus = requestedStatus; // Owner permitted to filter their own ads
    } else {
      // Anonymous or unprivileged user: restrict strictly to approved ads
      effectiveStatus = 'approved';
    }
  }

  const result = await listingService.getMarketplaceListings({
    city,
    category,
    subcategory,
    search,
    status: effectiveStatus,
    sellerId,
    minPrice,
    maxPrice,
    limit,
    offset,
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  try {
    // Security Rule 2.3: Listing creation requires an authenticated user
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Authentication required to post an ad' }, { status: 401 });
    }

    const body = await req.json();

    // Strip sensitive fields that sellers cannot assign to themselves
    const safePayload: any = {
      title: body.title,
      description: body.description,
      price: Number(body.price),
      categoryId: body.categoryId,
      subcategoryId: body.subcategoryId || undefined,
      location: body.location || {
        city: body.city || 'Mumbai',
        state: body.state || 'Maharashtra',
        locality: body.locality || 'Locality',
      },
      images: Array.isArray(body.images) ? body.images.slice(0, 5) : [],
      customAttributes: body.customAttributes || {},
      sellerName: authContext.user.name,
      sellerPhone: body.sellerPhone || authContext.user.phone,
      sellerId: authContext.userId, // Derived strictly from verified session
      // Initial moderation workflow: pending unless verified business with auto-approve
      status: authContext.isAdmin ? (body.status || 'approved') : 'pending',
      isFeatured: false, // Must be purchased or set by admin
      isBoosted: false,  // Must be purchased
    };

    const result = await listingService.createListing(safePayload, authContext.userId, {
      name: authContext.user.name,
      ipAddress: authContext.ipAddress,
    });
    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.status === 409 ? 'DUPLICATE_TITLE' : 'VALIDATION_ERROR' },
        { status: result.status }
      );
    }

    return NextResponse.json(result.listing, { status: 201 });
  } catch (err: any) {
    console.error('API /api/listings POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
