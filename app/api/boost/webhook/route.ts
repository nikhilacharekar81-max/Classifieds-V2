import { NextRequest, NextResponse } from 'next/server';
import { boostService } from '@/server/services/boost.service';

export async function POST(req: NextRequest) {
  try {
    const { eventId, eventType, orderId, paymentId, paymentGateway } = await req.json();
    if (!eventId || !orderId) {
      return NextResponse.json({ error: 'eventId and orderId are required' }, { status: 400 });
    }

    const result = await boostService.handleWebhook({
      eventId,
      eventType: eventType || 'payment.captured',
      orderId,
      paymentId: paymentId || `pay_wh_${Date.now()}`,
      paymentGateway: paymentGateway || 'Razorpay',
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error processing webhook' }, { status: 500 });
  }
}
