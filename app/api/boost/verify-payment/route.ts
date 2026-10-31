import { NextRequest, NextResponse } from 'next/server';
import { boostService } from '@/server/services/boost.service';

export async function POST(req: NextRequest) {
  try {
    const { orderId, listingId, packageId, paymentId, paymentGateway, userId, nowMs } = await req.json();
    if (!orderId || !listingId || !packageId || !paymentId || !userId) {
      return NextResponse.json(
        { error: 'orderId, listingId, packageId, paymentId, and userId are required' },
        { status: 400 }
      );
    }

    const result = await boostService.verifyAndApplyBoost({
      orderId,
      listingId,
      packageId,
      paymentId,
      paymentGateway: paymentGateway || 'UPI',
      userId,
      nowMs,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error verifying boost payment' }, { status: 500 });
  }
}
