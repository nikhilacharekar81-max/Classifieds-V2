import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { NextRequest } from 'next/server';
import { POST as createListingHandler, GET as getListingsHandler } from '../app/api/listings/route';
import { PUT as updateListingHandler, DELETE as deleteListingHandler } from '../app/api/listings/[id]/route';
import { POST as bulkActionHandler } from '../app/api/listings/bulk-action/route';
import { db, pool } from '../src/db/index';
import * as schema from '../src/db/schema';
import { eq } from 'drizzle-orm';

describe('Listing Security & RBAC Enforcement', () => {
  const sellerId = `usr_sec_${Date.now()}`;
  const otherUserId = `usr_other_${Date.now()}`;
  const adminUserId = `adm_sec_${Date.now()}`;
  const sessionToken = `sess_${Date.now()}`;
  const otherSessionToken = `sess_other_${Date.now()}`;
  const adminSessionToken = `sess_adm_${Date.now()}`;

  let createdListingId: string = '';

  beforeAll(async () => {
    // Seed users in PostgreSQL
    await db.insert(schema.users).values([
      {
        id: sellerId,
        name: 'Authorized Seller',
        email: `${sellerId}@test.com`,
        phone: '9876543210',
      },
      {
        id: otherUserId,
        name: 'Unauthorized Other User',
        email: `${otherUserId}@test.com`,
        phone: '9876543211',
      },
      {
        id: adminUserId,
        name: 'System Admin',
        email: `${adminUserId}@test.com`,
        phone: '9876543212',
        adminRole: 'super_admin',
      },
    ]);

    // Seed sessions in PostgreSQL
    const exp = new Date(Date.now() + 24 * 3600 * 1000);
    await db.insert(schema.userSessions).values([
      {
        id: sessionToken,
        userId: sellerId,
        expiresAt: exp,
      },
      {
        id: otherSessionToken,
        userId: otherUserId,
        expiresAt: exp,
      },
      {
        id: adminSessionToken,
        userId: adminUserId,
        expiresAt: exp,
      },
    ]);
  });

  afterAll(async () => {
    if (createdListingId) {
      await db.delete(schema.listings).where(eq(schema.listings.id, createdListingId));
    }
    await db.delete(schema.userSessions).where(eq(schema.userSessions.userId, sellerId));
    await db.delete(schema.userSessions).where(eq(schema.userSessions.userId, otherUserId));
    await db.delete(schema.userSessions).where(eq(schema.userSessions.userId, adminUserId));
    await db.delete(schema.users).where(eq(schema.users.id, sellerId));
    await db.delete(schema.users).where(eq(schema.users.id, otherUserId));
    await db.delete(schema.users).where(eq(schema.users.id, adminUserId));
  });

  it('rejects unauthenticated listing creation with 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Unauthorized Item',
        description: 'Should fail',
        price: 1000,
        categoryId: 'cat_mobiles',
      }),
    });

    const res = await createListingHandler(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('Authentication required');
  });

  it('authenticates user via session and strips client-supplied status, sellerId, and featured flags', async () => {
    const req = new NextRequest('http://localhost:3000/api/listings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        title: `Security Test Bike ${Date.now()}`,
        description: 'A genuine ad posted by seller',
        price: 45000,
        categoryId: 'cat_cars',
        // Attacker attempts privilege escalation in body:
        sellerId: 'attacker_hacked_id',
        status: 'approved',
        isFeatured: true,
        isBoosted: true,
        spamScore: 0,
      }),
    });

    const res = await createListingHandler(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    createdListingId = data.id;

    expect(createdListingId).toBeDefined();
    // Verify server overrode sellerId with the authenticated session's user ID
    expect(data.sellerId).toBe(sellerId);
    // Regular user listing cannot force status='approved' or featured/boosted flags
    expect(data.status).toBe('pending');
    expect(data.isFeatured).toBe(false);
    expect(data.isBoosted).toBe(false);

    // Verify in PostgreSQL database directly
    const [row] = await db.select().from(schema.listings).where(eq(schema.listings.id, createdListingId));
    expect(row).toBeDefined();
    expect(row.sellerId).toBe(sellerId);
    expect(row.status).toBe('pending');
    expect(row.isFeatured).toBe(false);
  });

  it('prevents anonymous users from querying non-approved listings', async () => {
    // Querying with status=pending anonymously should be sanitized to status=approved
    const req = new NextRequest('http://localhost:3000/api/listings?status=pending');
    const res = await getListingsHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    // None of the returned listings should be pending
    const items = data.items || [];
    const hasPending = items.some((l: any) => l.status === 'pending');
    expect(hasPending).toBe(false);
  });

  it('rejects unauthorized user from updating another user listing with 403', async () => {
    const req = new NextRequest(`http://localhost:3000/api/listings/${createdListingId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherSessionToken}`,
      },
      body: JSON.stringify({
        title: 'Tampered Title by Hacker',
        price: 1,
      }),
    });

    const res = await updateListingHandler(req, { params: Promise.resolve({ id: createdListingId }) });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Unauthorized');
  });

  it('rejects unauthorized user from deleting another user listing with 403', async () => {
    const req = new NextRequest(`http://localhost:3000/api/listings/${createdListingId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${otherSessionToken}`,
      },
    });

    const res = await deleteListingHandler(req, { params: Promise.resolve({ id: createdListingId }) });
    expect(res.status).toBe(403);
  });

  it('rejects non-moderator/non-admin from executing bulk actions with 403', async () => {
    const req = new NextRequest('http://localhost:3000/api/listings/bulk-action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherSessionToken}`,
      },
      body: JSON.stringify({
        action: 'approve',
        ids: [createdListingId],
      }),
    });

    const res = await bulkActionHandler(req);
    expect(res.status).toBe(403);
  });

  it('allows verified admin to perform bulk approval and status update', async () => {
    const req = new NextRequest('http://localhost:3000/api/listings/bulk-action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminSessionToken}`,
      },
      body: JSON.stringify({
        action: 'approve',
        ids: [createdListingId],
      }),
    });

    const res = await bulkActionHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    // Verify in PostgreSQL that listing status changed to approved
    const [row] = await db.select().from(schema.listings).where(eq(schema.listings.id, createdListingId));
    expect(row.status).toBe('approved');
  });
});
