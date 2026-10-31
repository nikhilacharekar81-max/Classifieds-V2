import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { POST as webhookHandler } from '../app/api/boost/webhook/route';
import { POST as verifyPaymentHandler } from '../app/api/boost/verify-payment/route';
import { db } from '../src/db/index';
import * as schema from '../src/db/schema';
import { eq } from 'drizzle-orm';

describe('Payment & Webhook Verification (HMAC, Idempotency, ACID)', () => {
  const testUserId = `usr_pay_${Date.now()}`;
  const testUserSession = `sess_pay_${Date.now()}`;
  const testListingId = `lst_pay_${Date.now()}`;
  const testPackageId = 'pkg_boost_7d'; // seeded package
  const testOrderId = `ord_test_${Date.now()}`;
  const testPaymentId = `pay_test_${Date.now()}`;
  const testEventId = `evt_test_${Date.now()}`;

  const originalSecret = process.env.PAYMENT_WEBHOOK_SECRET;
  const mockSecret = 'test_webhook_hmac_secret_key_123';

  beforeAll(async () => {
    process.env.PAYMENT_WEBHOOK_SECRET = mockSecret;

    // Seed test user
    await db.insert(schema.users).values({
      id: testUserId,
      name: 'Payment Test User',
      email: `${testUserId}@test.com`,
      phone: '9876543200',
    });

    // Seed test session
    await db.insert(schema.userSessions).values({
      id: testUserSession,
      userId: testUserId,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    });

    // Seed test listing
    await db.insert(schema.listings).values({
      id: testListingId,
      sellerId: testUserId,
      categoryId: 'cat_cars',
      title: `Payment Test Listing ${Date.now()}`,
      description: 'Test car for boost',
      price: '500000',
      state: 'Maharashtra',
      city: 'Mumbai',
      locality: 'Bandra',
      status: 'approved',
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    });

    // Seed test boost order
    await db.insert(schema.boostOrders).values({
      orderId: testOrderId,
      listingId: testListingId,
      packageId: testPackageId,
      userId: testUserId,
      price: '499.00',
      taxAmount: '89.82',
      totalAmount: '588.82',
      durationHours: 168,
      currency: 'INR',
      status: 'pending',
    });
  });

  afterAll(async () => {
    process.env.PAYMENT_WEBHOOK_SECRET = originalSecret;
    // Cleanup
    await db.delete(schema.paymentWebhookEvents).where(eq(schema.paymentWebhookEvents.id, testEventId));
    await db.delete(schema.boostTransactions).where(eq(schema.boostTransactions.orderId, testOrderId));
    await db.delete(schema.boostOrders).where(eq(schema.boostOrders.orderId, testOrderId));
    await db.delete(schema.listings).where(eq(schema.listings.id, testListingId));
    await db.delete(schema.userSessions).where(eq(schema.userSessions.id, testUserSession));
    await db.delete(schema.users).where(eq(schema.users.id, testUserId));
  });

  it('rejects webhook requests with missing required fields with 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/boost/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType: 'payment.captured' }),
    });

    const res = await webhookHandler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('required');
  });

  it('rejects webhook with invalid/forged HMAC signature with 401', async () => {
    const payload = JSON.stringify({
      eventId: testEventId,
      eventType: 'payment.captured',
      orderId: testOrderId,
      paymentId: testPaymentId,
      paymentGateway: 'Razorpay',
    });

    const req = new NextRequest('http://localhost:3000/api/boost/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': '0000000000000000000000000000000000000000000000000000000000000000',
      },
      body: payload,
    });

    const res = await webhookHandler(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('Invalid webhook signature');
  });

  it('processes genuine webhook with valid HMAC signature and activates boost atomically in PostgreSQL', async () => {
    const payload = JSON.stringify({
      eventId: testEventId,
      eventType: 'payment.captured',
      orderId: testOrderId,
      paymentId: testPaymentId,
      paymentGateway: 'Razorpay',
    });

    // Generate valid HMAC signature
    const validSignature = crypto
      .createHmac('sha256', mockSecret)
      .update(payload)
      .digest('hex');

    const req = new NextRequest('http://localhost:3000/api/boost/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': validSignature,
      },
      body: payload,
    });

    const res = await webhookHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    // Verify durable idempotency record in PostgreSQL
    const [webhookRow] = await db
      .select()
      .from(schema.paymentWebhookEvents)
      .where(eq(schema.paymentWebhookEvents.id, testEventId));
    expect(webhookRow).toBeDefined();
    expect(webhookRow.orderId).toBe(testOrderId);
    expect(webhookRow.gateway).toBe('Razorpay');

    // Verify order status updated to completed in PostgreSQL
    const [orderRow] = await db
      .select()
      .from(schema.boostOrders)
      .where(eq(schema.boostOrders.orderId, testOrderId));
    expect(orderRow.status).toBe('completed');

    // Verify boost transaction recorded
    const [txRow] = await db
      .select()
      .from(schema.boostTransactions)
      .where(eq(schema.boostTransactions.orderId, testOrderId));
    expect(txRow).toBeDefined();
    expect(txRow.status).toBe('completed');

    // Verify listing is now actively boosted with future expiration
    const [listingRow] = await db
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.id, testListingId));
    expect(listingRow.isBoosted).toBe(true);
    expect(listingRow.boostStatus).toBe('active');
    expect(listingRow.boostExpiresAt).toBeDefined();
    expect(new Date(listingRow.boostExpiresAt!).getTime()).toBeGreaterThan(Date.now());
  });

  it('enforces durable idempotency by safely acknowledging duplicate webhook without duplicate processing', async () => {
    const payload = JSON.stringify({
      eventId: testEventId,
      eventType: 'payment.captured',
      orderId: testOrderId,
      paymentId: testPaymentId,
      paymentGateway: 'Razorpay',
    });

    const validSignature = crypto
      .createHmac('sha256', mockSecret)
      .update(payload)
      .digest('hex');

    const req = new NextRequest('http://localhost:3000/api/boost/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': validSignature,
      },
      body: payload,
    });

    const res = await webhookHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.duplicate).toBe(true);

    // Ensure transactions are not duplicated
    const txRows = await db
      .select()
      .from(schema.boostTransactions)
      .where(eq(schema.boostTransactions.orderId, testOrderId));
    expect(txRows.length).toBe(1);
  });

  it('rejects payment verification when user is unauthenticated', async () => {
    const req = new NextRequest('http://localhost:3000/api/boost/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: testOrderId,
        paymentId: testPaymentId,
      }),
    });

    const res = await verifyPaymentHandler(req);
    expect(res.status).toBe(401);
  });
});
