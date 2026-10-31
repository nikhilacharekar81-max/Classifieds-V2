import { NextRequest, NextResponse } from 'next/server';
import { boostService } from '@/server/services/boost.service';
import { getAuthenticatedUser } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const { orderId, paymentId, paymentGateway, signature } = await req.json();
    if (!orderId || !paymentId) {
      return NextResponse.json(
        { error: 'orderId and paymentId are required' },
        { status: 400 }
      );
    }

    // Call authoritative service with verified userId from session
    const result = await boostService.verifyAndApplyBoost({
      orderId,
      paymentId,
      paymentGateway: paymentGateway || 'UPI',
      signature,
      userId: authContext.userId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('API /api/boost/verify-payment error:', err);
    return NextResponse.json({ error: err.message || 'Error verifying boost payment' }, { status: 500 });
  }
}
