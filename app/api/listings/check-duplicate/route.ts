import { NextRequest, NextResponse } from 'next/server';
import { listingService } from '@/server/services/listing.service';

export async function POST(req: NextRequest) {
  try {
    const { sellerId, title, excludeListingId } = await req.json();
    if (!sellerId || !title) {
      return NextResponse.json(
        { isDuplicate: false, error: 'sellerId and title are required' },
        { status: 400 }
      );
    }
    const result = listingService.checkDuplicateTitle(sellerId, title, excludeListingId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error checking title' }, { status: 500 });
  }
}
