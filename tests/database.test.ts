import { describe, it, expect } from 'bun:test';
import { pool, db } from '../src/db/index';
import * as schema from '../src/db/schema';
import { eq, sql } from 'drizzle-orm';

describe('PostgreSQL Database & Schema Integrity', () => {
  it('connects to Cloud SQL PostgreSQL instance and executes queries', async () => {
    const res = await pool.query('SELECT NOW() as now, current_database() as db;');
    expect(res.rows.length).toBe(1);
    expect(res.rows[0].now).toBeDefined();
    expect(res.rows[0].db).toBe('cloud_sql_development_database');
  });

  it('verifies all 22 authoritative application tables exist in PostgreSQL', async () => {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tableNames = res.rows.map((r: any) => r.table_name);
    
    const requiredTables = [
      'abuse_reports',
      'advertising_campaigns',
      'audit_logs',
      'boost_orders',
      'boost_packages',
      'boost_transactions',
      'categories',
      'category_custom_fields',
      'chat_messages',
      'cms_pages',
      'email_logs',
      'email_templates',
      'kyc_documents',
      'listings',
      'locations',
      'moderation_rules',
      'newsletter_campaigns',
      'payment_webhook_events',
      'system_settings',
      'user_favorites',
      'user_sessions',
      'users',
    ];

    for (const table of requiredTables) {
      expect(tableNames).toContain(table);
    }
  });

  it('enforces functional partial unique title index on active listings', async () => {
    const testSellerId = 'usr_test_idx_' + Math.random().toString(36).slice(2, 6);
    
    // Ensure test user exists
    await db.insert(schema.users).values({
      id: testSellerId,
      name: 'Index Test User',
      email: `${testSellerId}@test.com`,
      phone: '9999999999',
    });

    const exp = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    const listingId1 = `lst_test_idx_1_${Date.now()}`;
    const listingId2 = `lst_test_idx_2_${Date.now()}`;

    // Insert first listing with title "iPhone 15 Pro Max"
    await db.insert(schema.listings).values({
      id: listingId1,
      sellerId: testSellerId,
      categoryId: 'cat_mobiles',
      title: 'iPhone 15 Pro Max',
      description: 'Test Description 1',
      price: '85000',
      state: 'Maharashtra',
      city: 'Mumbai',
      locality: 'Bandra',
      status: 'approved',
      expiresAt: exp,
    });

    // Attempting to insert duplicate active title with different casing and whitespace
    let duplicateRejected = false;
    try {
      await db.insert(schema.listings).values({
        id: listingId2,
        sellerId: testSellerId,
        categoryId: 'cat_mobiles',
        title: '   iphone   15   pro   max   ',
        description: 'Test Description 2',
        price: '82000',
        state: 'Maharashtra',
        city: 'Mumbai',
        locality: 'Bandra',
        status: 'approved',
        expiresAt: exp,
      });
    } catch (err: any) {
      duplicateRejected = true;
      const fullError = `${err.message} ${err.cause?.message || ''} ${err.detail || ''}`;
      expect(fullError).toContain('idx_unique_active_ad_title_per_seller');
    }

    expect(duplicateRejected).toBe(true);

    // Clean up test listings
    await db.delete(schema.listings).where(eq(schema.listings.id, listingId1));
    await db.delete(schema.users).where(eq(schema.users.id, testSellerId));
  });

  it('verifies ACID transaction rollback on failed multi-record operation', async () => {
    const testSellerId = 'usr_tx_test_' + Math.random().toString(36).slice(2, 6);
    await db.insert(schema.users).values({
      id: testSellerId,
      name: 'Transaction Test User',
      email: `${testSellerId}@test.com`,
      phone: '9999999999',
    });

    const listingId = `lst_tx_${Date.now()}`;
    const exp = new Date(Date.now() + 30 * 24 * 3600 * 1000);

    let failedAsExpected = false;
    try {
      await db.transaction(async (tx) => {
        // Step 1: Insert listing
        await tx.insert(schema.listings).values({
          id: listingId,
          sellerId: testSellerId,
          categoryId: 'cat_cars',
          title: 'Transaction Rollback Test Car',
          description: 'Desc',
          price: '500000',
          state: 'Maharashtra',
          city: 'Mumbai',
          locality: 'Andheri',
          status: 'approved',
          expiresAt: exp,
        });

        // Step 2: Deliberate failure (violates non-null or foreign key)
        await tx.execute(sql`INSERT INTO boost_orders (order_id, listing_id, package_id, user_id, price, tax_amount, total_amount, duration_hours, currency, status) VALUES ('bad_ord', 'non_existent_listing', 'non_existent_pkg', 'non_existent_user', 100, 18, 118, 24, 'INR', 'pending');`);
      });
    } catch {
      failedAsExpected = true;
    }

    expect(failedAsExpected).toBe(true);

    // Verify Step 1 listing was rolled back and does NOT exist in PostgreSQL
    const check = await db.select().from(schema.listings).where(eq(schema.listings.id, listingId));
    expect(check.length).toBe(0);

    // Clean up test user
    await db.delete(schema.users).where(eq(schema.users.id, testSellerId));
  });
});
