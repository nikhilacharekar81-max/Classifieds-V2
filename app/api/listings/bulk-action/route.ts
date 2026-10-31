import { NextRequest, NextResponse } from 'next/server';
import { listingService } from '@/server/services/listing.service';

export async function POST(req: NextRequest) {
  try {
    const { action, ids, data } = await req.json();
    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'action and non-empty ids array are required' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      const count = listingService.bulkApprove(ids);
      return NextResponse.json({ success: true, count });
    }

    if (action === 'reject') {
      const count = listingService.bulkReject(ids, data?.reason || 'Violates community guidelines');
      return NextResponse.json({ success: true, count });
    }

    if (action === 'delete') {
      const count = listingService.bulkDelete(ids);
      return NextResponse.json({ success: true, count });
    }

    if (action === 'renew') {
      const count = listingService.bulkRenew(ids, data?.days || 30);
      return NextResponse.json({ success: true, count });
    }

    return NextResponse.json({ error: 'Unsupported bulk action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error processing bulk action' }, { status: 500 });
  }
}
