import { NextRequest, NextResponse } from 'next/server';
import { boostService } from '@/server/services/boost.service';

export async function POST(req: NextRequest) {
  try {
    const { nowMs } = await req.json().catch(() => ({}));
    const count = boostService.cleanupExpiredBoosts(nowMs ? Number(nowMs) : undefined);
    return NextResponse.json({ success: true, expiredCount: count });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
