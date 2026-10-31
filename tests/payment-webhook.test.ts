import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { POST as createOrderHandler } from '../app/api/boost/create-order/route';
import { POST as webhookHandler } from '../app/api/boost/webhook/route';
import { POST as verifyPaymentHandler } from '../app/api/boost/verify-payment/route';
import { db } from '../src/db/index';
import * as schema from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

describe('Payment & Webhook Fail-Closed Verification, Atomic Idempotency & ACID', () => {
  const testUserId = `usr_pay_${Date.now()}`;
  const testUserSession = `sess_pay_${Date.now()}`;
  const testListingId1 = `lst_pay_1_${Date.now()}`;
  const testListingId2 = `lst_pay_2_${Date.now()}`;
  const testPackageId = 'pkg_boost_7d';
  const testOrderId1 = `ord_test_1_${Date.now()}`;
  const testOrderId2 = `ord_test_2_${Date.now()}`;
  const testPaymentId1 = `pay_test_1_${Date.now()}`;
  const testPaymentId2 = `pay_test_2_${Date.now()}`;
  const testEventId = `evt_test_${Date.now()}`;

  const originalWebhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
  const originalGatewaySecret = process.env.PAYMENT_GATEWAY_SECRET;
  const originalGatewayProvider = process.env.PAYMENT_GATEWAY_PROVIDER;

  const mockWebhookSecret = 'test_webhook_hmac_secret_key_123';
  const mockGatewaySecret = 'test_gateway_hmac_secret_key_456';
  const createdOrderIds: string[] = [testOrderId1, testOrderId2];

  beforeAll(async () => {
    await db.insert(schema.users).values({
      id: testUserId,
      name: 'Payment Test User',
      email: `${testUserId}@test.com`,
      phone: '9876543200',
    });

    await db.insert(schema.userSessions).values({
      id: testUserSession,
      userId: testUserId,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    });

    await db.insert(schema.listings).values([
      {
        id: testListingId1,
        sellerId: testUserId,
        categoryId: 'cat_cars',
        title: `Payment Test Listing One ${Date.now()}`,
        description: 'Test car 1 for boost',
        price: '500000',
        state: 'Maharashtra',
        city: 'Mumbai',
        locality: 'Bandra',
        status: 'approved',
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
      {
        id: testListingId2,
        sellerId: testUserId,
        categoryId: 'cat_cars',
        title: `Payment Test Listing Two ${Date.now()}`,
        description: 'Test car 2 for boost',
        price: '600000',
        state: 'Maharashtra',
        city: 'Mumbai',
        locality: 'Andheri',
        status: 'approved',
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    ]);

    await db.insert(schema.boostOrders).values([
      {
        orderId: testOrderId1,
        listingId: testListingId1,
        packageId: testPackageId,
        userId: testUserId,
        price: '499.00',
        taxAmount: '89.82',
        totalAmount: '588.82',
        durationHours: 168,
        currency: 'INR',
        status: 'pending',
      },
      {
        orderId: testOrderId2,
        listingId: testListingId2,
        packageId: testPackageId,
        userId: testUserId,
        price: '499.00',
        taxAmount: '89.82',
        totalAmount: '588.82',
        durationHours: 168,
        currency: 'INR',
        status: 'pending',
      },
    ]);
  });

  afterAll(async () => {
    process.env.PAYMENT_WEBHOOK_SECRET = originalWebhookSecret;
    process.env.PAYMENT_GATEWAY_SECRET = originalGatewaySecret;
    process.env.PAYMENT_GATEWAY_PROVIDER = originalGatewayProvider;

    await db.delete(schema.paymentWebhookEvents).where(eq(schema.paymentWebhookEvents.id, testEventId));
    await db.delete(schema.boostTransactions).where(inArray(schema.boostTransactions.orderId, createdOrderIds));
    await db.delete(schema.boostOrders).where(inArray(schema.boostOrders.orderId, createdOrderIds));
    await db.delete(schema.listings).where(inArray(schema.listings.id, [testListingId1, testListingId2]));
    await db.delete(schema.userSessions).where(eq(schema.userSessions.id, testUserSession));
    await db.delete(schema.users).where(eq(schema.users.id, testUserId));
  });

  it('fails closed (503) when no payment gateway is configured, leaving order pending and listing unboosted', async () => {
    delete process.env.PAYMENT_GATEWAY_SECRET;
    delete process.env.PAYMENT_GATEWAY_PROVIDER;

    // 1. Creating an internal boost order is allowed and remains pending
    const createReq = new NextRequest('http://localhost:3000/api/boost/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testUserSession}`,
      },
      body: JSON.stringify({
        listingId: testListingId1,
        packageId: testPackageId,
      }),
    });
    const createRes = await createOrderHandler(createReq);
    expect(createRes.status).toBe(201);
    const createdOrder = await createRes.json();
    expect(createdOrder.status).toBe('pending');
    createdOrderIds.push(createdOrder.orderId);

    // 2. Attempting to verify payment when no gateway is configured MUST fail closed (503)
    // even if caller supplies a long fake signature
    const verifyReq = new NextRequest('http://localhost:3000/api/boost/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testUserSession}`,
      },
      body: JSON.stringify({
        orderId: testOrderId1,
        paymentId: testPaymentId1,
        paymentGateway: 'Razorpay',
        signature: 'long_fake_signature_that_used_to_pass_in_dev_mode_1234567890',
      }),
    });

    const verifyRes = await verifyPaymentHandler(verifyReq);
    expect(verifyRes.status).toBe(503);
    const verifyData = await verifyRes.json();
    expect(verifyData.error).toContain('Payment gateway not configured');

    // Verify order is still pending and listing is NOT boosted
    const [orderRow] = await db.select().from(schema.boostOrders).where(eq(schema.boostOrders.orderId, testOrderId1));
    expect(orderRow.status).toBe('pending');

    const [listingRow] = await db.select().from(schema.listings).where(eq(schema.listings.id, testListingId1));
    expect(listingRow.isBoosted).toBe(false);

    const txRows = await db.select().from(schema.boostTransactions).where(eq(schema.boostTransactions.orderId, testOrderId1));
    expect(txRows.length).toBe(0);
  });

  it('rejects verify-payment when signature is missing, invalid, or amount/currency mismatches', async () => {
    process.env.PAYMENT_GATEWAY_SECRET = mockGatewaySecret;
    process.env.PAYMENT_GATEWAY_PROVIDER = 'Razorpay';

    // 1. Missing signature -> 400
    const noSigReq = new NextRequest('http://localhost:3000/api/boost/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testUserSession}`,
      },
      body: JSON.stringify({
        orderId: testOrderId2,
        paymentId: testPaymentId2,
        paymentGateway: 'Razorpay',
      }),
    });
    expect((await verifyPaymentHandler(noSigReq)).status).toBe(400);

    // 2. Invalid signature -> 400
    const badSigReq = new NextRequest('http://localhost:3000/api/boost/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testUserSession}`,
      },
      body: JSON.stringify({
        orderId: testOrderId2,
        paymentId: testPaymentId2,
        paymentGateway: 'Razorpay',
        signature: 'invalid_signature_value_1234567890',
      }),
    });
    expect((await verifyPaymentHandler(badSigReq)).status).toBe(400);

    const validSig = crypto
      .createHmac('sha256', mockGatewaySecret)
      .update(`${testOrderId2}|${testPaymentId2}`)
      .digest('hex');

    // 3. Mismatched amount -> 400
    const badAmountReq = new NextRequest('http://localhost:3000/api/boost/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testUserSession}`,
      },
      body: JSON.stringify({
        orderId: testOrderId2,
        paymentId: testPaymentId2,
        paymentGateway: 'Razorpay',
        amount: 1.0,
        currency: 'INR',
        signature: validSig,
      }),
    });
    expect((await verifyPaymentHandler(badAmountReq)).status).toBe(400);

    // 4. Mismatched currency -> 400
    const badCurrencyReq = new NextRequest('http://localhost:3000/api/boost/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testUserSession}`,
      },
      body: JSON.stringify({
        orderId: testOrderId2,
        paymentId: testPaymentId2,
        paymentGateway: 'Razorpay',
        amount: 588.82,
        currency: 'USD',
        signature: validSig,
      }),
    });
    expect((await verifyPaymentHandler(badCurrencyReq)).status).toBe(400);

    // Verify listing 2 is still NOT boosted after all failed attempts
    const [listingRow] = await db.select().from(schema.listings).where(eq(schema.listings.id, testListingId2));
    expect(listingRow.isBoosted).toBe(false);
  });

  it('activates boost via verify-payment only when gateway, HMAC signature, order, amount, and currency all match', async () => {
    process.env.PAYMENT_GATEWAY_SECRET = mockGatewaySecret;
    process.env.PAYMENT_GATEWAY_PROVIDER = 'Razorpay';

    const validSig = crypto
      .createHmac('sha256', mockGatewaySecret)
      .update(`${testOrderId2}|${testPaymentId2}`)
      .digest('hex');

    const req = new NextRequest('http://localhost:3000/api/boost/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testUserSession}`,
      },
      body: JSON.stringify({
        orderId: testOrderId2,
        paymentId: testPaymentId2,
        paymentGateway: 'Razorpay',
        amount: 588.82,
        currency: 'INR',
        signature: validSig,
      }),
    });

    const res = await verifyPaymentHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    // Re-submitting already completed order returns 409 Conflict
    const replayReq = new NextRequest('http://localhost:3000/api/boost/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testUserSession}`,
      },
      body: JSON.stringify({
        orderId: testOrderId2,
        paymentId: testPaymentId2,
        paymentGateway: 'Razorpay',
        amount: 588.82,
        currency: 'INR',
        signature: validSig,
      }),
    });
    expect((await verifyPaymentHandler(replayReq)).status).toBe(409);
  });

  it('fails closed on webhook when secret or signature header is missing or invalid', async () => {
    const payload = JSON.stringify({
      eventId: testEventId,
      eventType: 'payment.captured',
      orderId: testOrderId1,
      paymentId: testPaymentId1,
      paymentGateway: 'Razorpay',
    });

    // 1. Missing PAYMENT_WEBHOOK_SECRET -> 503
    delete process.env.PAYMENT_WEBHOOK_SECRET;
    const noSecretReq = new NextRequest('http://localhost:3000/api/boost/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': 'any_sig',
      },
      body: payload,
    });
    expect((await webhookHandler(noSecretReq)).status).toBe(503);

    // 2. Missing signature header -> 401
    process.env.PAYMENT_WEBHOOK_SECRET = mockWebhookSecret;
    const noSigHeaderReq = new NextRequest('http://localhost:3000/api/boost/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
    expect((await webhookHandler(noSigHeaderReq)).status).toBe(401);

    // 3. Invalid HMAC signature -> 401
    const badSigReq = new NextRequest('http://localhost:3000/api/boost/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': '0000000000000000000000000000000000000000000000000000000000000000',
      },
      body: payload,
    });
    expect((await webhookHandler(badSigReq)).status).toBe(401);
  });

  it('processes concurrent duplicate webhooks atomically with zero duplicate transactions', async () => {
    process.env.PAYMENT_WEBHOOK_SECRET = mockWebhookSecret;
    process.env.PAYMENT_GATEWAY_PROVIDER = 'Razorpay';

    const payload = JSON.stringify({
      eventId: testEventId,
      eventType: 'payment.captured',
      orderId: testOrderId1,
      paymentId: testPaymentId1,
      paymentGateway: 'Razorpay',
      amount: 588.82,
      currency: 'INR',
    });

    const validSignature = crypto
      .createHmac('sha256', mockWebhookSecret)
      .update(payload)
      .digest('hex');

    const makeReq = () =>
      new NextRequest('http://localhost:3000/api/boost/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': validSignature,
        },
        body: payload,
      });

    // Fire 2 concurrent identical webhook deliveries
    const [res1, res2] = await Promise.all([webhookHandler(makeReq()), webhookHandler(makeReq())]);
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const data1 = await res1.json();
    const data2 = await res2.json();
    expect(data1.success).toBe(true);
    expect(data2.success).toBe(true);
    // Exactly one should be initial activation (duplicate: false) and the other idempotent duplicate (duplicate: true)
    expect([Boolean(data1.duplicate), Boolean(data2.duplicate)].sort()).toEqual([false, true]);

    // Verify exactly 1 transaction row and 1 webhook event row exist in PostgreSQL
    const txRows = await db
      .select()
      .from(schema.boostTransactions)
      .where(eq(schema.boostTransactions.orderId, testOrderId1));
    expect(txRows.length).toBe(1);

    const webhookRows = await db
      .select()
      .from(schema.paymentWebhookEvents)
      .where(eq(schema.paymentWebhookEvents.id, testEventId));
    expect(webhookRows.length).toBe(1);

    const [listingRow] = await db
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.id, testListingId1));
    expect(listingRow.isBoosted).toBe(true);
    expect(listingRow.boostStatus).toBe('active');
  });
});

