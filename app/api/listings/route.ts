import { NextRequest, NextResponse } from 'next/server';
import { listingService } from '@/server/services/listing.service';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { toPublicListingDTO } from '@/lib/utils/seoAndUrlHelper';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city') || undefined;
  const category = searchParams.get('category') || undefined;
  const subcategory = searchParams.get('subcategory') || undefined;
  const search = searchParams.get('search') || undefined;
  const requestedStatus = searchParams.get('status') || undefined;
  const sellerId = searchParams.get('sellerId') || undefined;

  // Validate and clamp numeric bounds
  const rawMin = searchParams.get('minPrice');
  const minPrice = rawMin !== null && !isNaN(Number(rawMin)) && isFinite(Number(rawMin)) && Number(rawMin) >= 0 ? Number(rawMin) : undefined;

  const rawMax = searchParams.get('maxPrice');
  const maxPrice = rawMax !== null && !isNaN(Number(rawMax)) && isFinite(Number(rawMax)) && Number(rawMax) >= 0 ? Number(rawMax) : undefined;

  const rawLimit = searchParams.get('limit');
  const limit = rawLimit !== null && !isNaN(Number(rawLimit)) ? Math.min(Math.max(Number(rawLimit) || 20, 1), 100) : 20;

  const rawOffset = searchParams.get('offset');
  const offset = rawOffset !== null && !isNaN(Number(rawOffset)) ? Math.max(Number(rawOffset) || 0, 0) : 0;

  const authContext = await getAuthenticatedUser(req);
  const isPrivileged = Boolean(authContext?.isModerator || authContext?.isSuperAdmin);

  // Security Gate: Only verified moderators or listing owners can view non-approved status listings
  let effectiveStatus: string | undefined = 'approved';
  if (requestedStatus && requestedStatus !== 'approved') {
    if (isPrivileged) {
      effectiveStatus = requestedStatus;
    } else if (authContext?.userId && sellerId === authContext.userId) {
      effectiveStatus = requestedStatus;
    } else {
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

  // Strip internal fields for public DTO responses unless requested by owner or admin
  const isOwner = Boolean(authContext?.userId && sellerId === authContext.userId);
  if (!isPrivileged && !isOwner) {
    return NextResponse.json({
      items: result.items.map((item) => toPublicListingDTO(item)),
      total: result.total,
    });
  }

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Authentication required to post an ad' }, { status: 401 });
    }

    const body = await req.json();

    // Validate price
    const priceNum = Number(body.price);
    if (isNaN(priceNum) || !isFinite(priceNum) || priceNum < 0) {
      return NextResponse.json({ error: 'Price must be a valid non-negative number' }, { status: 400 });
    }

    // Strip sensitive fields that sellers cannot assign to themselves
    const safePayload: any = {
      title: body.title,
      description: body.description,
      price: priceNum,
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
      sellerPhone: authContext.user.phone || body.sellerPhone || '',
      sellerId: authContext.userId, // Derived strictly from verified session
      // Moderation workflow: pending unless user is an authorized moderator/super_admin
      status: authContext.isModerator || authContext.isSuperAdmin ? (body.status || 'approved') : 'pending',
      isFeatured: false,
      isBoosted: false,
    };

    const result = await listingService.createListing(safePayload, authContext.userId, {
      name: authContext.user.name,
      ipAddress: authContext.ipAddress,
      isAdminAction: authContext.isAdmin,
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
