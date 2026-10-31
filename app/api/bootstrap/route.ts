import { NextRequest, NextResponse } from 'next/server';
import { categoryRepository } from '@/server/repositories/category.repository';
import { locationRepository } from '@/server/repositories/location.repository';
import { boostRepository } from '@/server/repositories/boost.repository';
import { adminRepository } from '@/server/repositories/admin.repository';
import { cmsRepository } from '@/server/repositories/cms.repository';
import { listingRepository } from '@/server/repositories/listing.repository';
import { userRepository } from '@/server/repositories/user.repository';
import { getAuthenticatedUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);

    const [
      categories,
      customFields,
      locations,
      packages,
      settings,
      cmsPages,
      listingsData,
      users,
    ] = await Promise.all([
      categoryRepository.findAll(),
      categoryRepository.findAllCustomFields(),
      locationRepository.findAll(),
      boostRepository.findAllPackages(),
      adminRepository.getSystemSettings(),
      cmsRepository.findAllPages(),
      listingRepository.findMarketplaceListings({ limit: 120 }),
      authContext?.isAdmin ? userRepository.findAll() : Promise.resolve([]),
    ]);

    return NextResponse.json({
      categories,
      customFields,
      locations,
      packages,
      settings,
      cmsPages,
      listings: listingsData.items,
      totalListings: listingsData.total,
      users,
      currentUser: authContext?.user || null,
      adminRole: authContext?.adminRole || null,
    });
  } catch (error: any) {
    console.error('API /api/bootstrap error:', error);
    return NextResponse.json({ error: error.message || 'Failed to bootstrap application data' }, { status: 500 });
  }
}
