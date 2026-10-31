import { NextRequest, NextResponse } from 'next/server';
import { boostService } from '@/server/services/boost.service';
import crypto from 'node:crypto';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const { eventId, eventType, orderId, paymentId, paymentGateway } = body;
    if (!eventId || !orderId || !paymentId) {
      return NextResponse.json(
        { error: 'eventId, orderId, and paymentId are required' },
        { status: 400 }
      );
    }

    // Webhook signature verification (Razorpay / Stripe header)
    const signature = req.headers.get('x-razorpay-signature') || req.headers.get('stripe-signature');
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;

    if (secret && signature) {
      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    const result = await boostService.handleWebhook({
      eventId,
      eventType: eventType || 'payment.captured',
      orderId,
      paymentId,
      paymentGateway: paymentGateway || 'Razorpay',
      payload: body,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('API /api/boost/webhook error:', err);
    return NextResponse.json({ error: err.message || 'Error processing webhook' }, { status: 500 });
  }
}
