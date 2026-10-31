import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { NextRequest } from 'next/server';
import { POST as cleanupHandler } from '../app/api/boost/cleanup-expired/route';
import { db } from '../src/db/index';
import * as schema from '../src/db/schema';
import { eq } from 'drizzle-orm';

describe('Server-Authoritative Boost Cleanup Endpoint', () => {
  const cronSecret = 'test_cron_secret_777';
  const originalCronSecret = process.env.CRON_SECRET;

  const testUserId = `usr_clean_${Date.now()}`;
  const testUserSession = `sess_clean_${Date.now()}`;
  const expiredListingId = `lst_exp_${Date.now()}`;
  const activeListingId = `lst_act_${Date.now()}`;

  beforeAll(async () => {
    process.env.CRON_SECRET = cronSecret;

    // Seed test user & session
    await db.insert(schema.users).values({
      id: testUserId,
      name: 'Regular User',
      email: `${testUserId}@test.com`,
      phone: '9999999999',
    });

    await db.insert(schema.userSessions).values({
      id: testUserSession,
      userId: testUserId,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    });

    // Seed 1 expired boosted listing (boostExpiresAt in the past)
    const pastDate = new Date(Date.now() - 3600 * 1000); // 1 hour ago
    await db.insert(schema.listings).values({
      id: expiredListingId,
      sellerId: testUserId,
      categoryId: 'cat_mobiles',
      title: `Expired Boost Listing ${Date.now()}`,
      description: 'Test description',
      price: '20000',
      state: 'Maharashtra',
      city: 'Mumbai',
      locality: 'Andheri',
      status: 'approved',
      isBoosted: true,
      boostStatus: 'active',
      boostExpiresAt: pastDate,
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    });

    // Seed 1 active boosted listing (boostExpiresAt in the future)
    const futureDate = new Date(Date.now() + 24 * 3600 * 1000); // 1 day in future
    await db.insert(schema.listings).values({
      id: activeListingId,
      sellerId: testUserId,
      categoryId: 'cat_mobiles',
      title: `Active Boost Listing ${Date.now()}`,
      description: 'Test description',
      price: '30000',
      state: 'Maharashtra',
      city: 'Mumbai',
      locality: 'Andheri',
      status: 'approved',
      isBoosted: true,
      boostStatus: 'active',
      boostExpiresAt: futureDate,
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    });
  });

  afterAll(async () => {
    process.env.CRON_SECRET = originalCronSecret;
    await db.delete(schema.listings).where(eq(schema.listings.id, expiredListingId));
    await db.delete(schema.listings).where(eq(schema.listings.id, activeListingId));
    await db.delete(schema.userSessions).where(eq(schema.userSessions.id, testUserSession));
    await db.delete(schema.users).where(eq(schema.users.id, testUserId));
  });

  it('rejects unauthenticated requests without admin session or cron secret with 403', async () => {
    const req = new NextRequest('http://localhost:3000/api/boost/cleanup-expired', {
      method: 'POST',
    });

    const res = await cleanupHandler(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Forbidden');
  });

  it('rejects regular non-admin authenticated users with 403', async () => {
    const req = new NextRequest('http://localhost:3000/api/boost/cleanup-expired', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${testUserSession}`,
      },
    });

    const res = await cleanupHandler(req);
    expect(res.status).toBe(403);
  });

  it('authorizes requests with valid x-cron-secret header', async () => {
    const req = new NextRequest('http://localhost:3000/api/boost/cleanup-expired', {
      method: 'POST',
      headers: {
        'x-cron-secret': cronSecret,
      },
    });

    const res = await cleanupHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.expiredCount).toBeGreaterThanOrEqual(1);

    // Verify in PostgreSQL that the expired listing was demoted
    const [expiredListing] = await db
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.id, expiredListingId));
    expect(expiredListing.isBoosted).toBe(false);
    expect(expiredListing.boostStatus).toBe('expired');

    // Verify that the future active listing is unaffected
    const [activeListing] = await db
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.id, activeListingId));
    expect(activeListing.isBoosted).toBe(true);
    expect(activeListing.boostStatus).toBe('active');
  });
});
