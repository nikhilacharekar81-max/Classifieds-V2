import { NextRequest, NextResponse } from 'next/server';
import { listingService } from '@/server/services/listing.service';
import { getAuthenticatedUser } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const { action, ids, data } = await req.json();
    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'action and non-empty ids array are required' },
        { status: 400 }
      );
    }

    // Admin permissions required for approve/reject
    if ((action === 'approve' || action === 'reject') && !authContext.isModerator && !authContext.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Moderator permission required' }, { status: 403 });
    }

    if (action === 'approve') {
      const count = await listingService.bulkApprove(ids);
      return NextResponse.json({ success: true, count });
    }

    if (action === 'reject') {
      const reason = data?.reason || 'Violates community marketplace guidelines';
      const count = await listingService.bulkReject(ids, reason);
      return NextResponse.json({ success: true, count });
    }

    if (action === 'delete') {
      const count = await listingService.bulkDelete(ids);
      return NextResponse.json({ success: true, count });
    }

    // Support both 'renew' and 'update' (from frontend callers)
    if (action === 'renew' || (action === 'update' && (data?.renew || data?.status === 'approved' || data?.action === 'renew'))) {
      const days = data?.days || 30;
      const count = await listingService.bulkRenew(ids, days);
      return NextResponse.json({ success: true, count });
    }

    return NextResponse.json({ error: `Unsupported bulk action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('API /api/listings/bulk-action error:', err);
    return NextResponse.json({ error: err.message || 'Error processing bulk action' }, { status: 500 });
  }
}
