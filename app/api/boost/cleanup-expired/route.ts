import { NextRequest, NextResponse } from 'next/server';
import { boostService } from '@/server/services/boost.service';
import { getAuthenticatedUser } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    // Authorized administrator or internal cron secret required
    const authContext = await getAuthenticatedUser(req);
    const cronSecret = req.headers.get('x-cron-secret');
    const isCronAuthorized = Boolean(process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET);

    if (!authContext?.isAdmin && !isCronAuthorized) {
      return NextResponse.json({ error: 'Forbidden: Administrator or internal scheduler authorization required' }, { status: 403 });
    }

    // Time is calculated strictly on the server in PostgreSQL (no caller-supplied nowMs)
    const count = await boostService.cleanupExpiredBoosts();
    return NextResponse.json({ success: true, expiredCount: count });
  } catch (err: any) {
    console.error('API /api/boost/cleanup-expired error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
