import { NextRequest, NextResponse } from 'next/server';
import { boostService } from '@/server/services/boost.service';

export async function POST(req: NextRequest) {
  try {
    const { listingId, packageId, userId, userName } = await req.json();
    if (!listingId || !packageId || !userId) {
      return NextResponse.json(
        { error: 'listingId, packageId, and userId are required' },
        { status: 400 }
      );
    }

    const result = await boostService.createBoostOrder({
      listingId,
      packageId,
      userId,
      userName,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.order, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error creating boost order' }, { status: 500 });
  }
}
