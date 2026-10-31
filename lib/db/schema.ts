import {
  pgTable,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  doublePrecision,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const userTypeEnum = pgEnum('user_type', ['user', 'business']);
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended', 'banned']);
export const kycStatusEnum = pgEnum('kyc_status', ['unsubmitted', 'pending', 'verified', 'rejected']);
export const adminRoleEnum = pgEnum('admin_role', [
  'super_admin',
  'moderator',
  'finance_user',
  'content_manager',
  'marketing_manager',
  'support_agent',
]);
export const listingStatusEnum = pgEnum('listing_status', ['draft', 'pending', 'approved', 'rejected', 'sold', 'expired']);
export const boostStatusEnum = pgEnum('boost_status_type', ['inactive', 'active', 'expired']);

// 1. Users
export const users = pgTable('users', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 32 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  type: userTypeEnum('type').notNull().default('user'),
  status: userStatusEnum('status').notNull().default('active'),
  kycStatus: kycStatusEnum('kyc_status').notNull().default('unsubmitted'),
  emailSubscribed: boolean('email_subscribed').notNull().default(true),
  emailUnsubscribedAt: timestamp('email_unsubscribed_at', { withTimezone: true }),
  city: varchar('city', { length: 128 }).notNull(),
  state: varchar('state', { length: 128 }).notNull(),
  rating: numeric('rating', { precision: 3, scale: 2 }).notNull().default('5.00'),
  reviewCount: integer('review_count').notNull().default(0),
  businessName: varchar('business_name', { length: 255 }),
  gstNumber: varchar('gst_number', { length: 32 }),
  verifiedBusiness: boolean('verified_business').notNull().default(false),
  adminRole: adminRoleEnum('admin_role'),
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 2. Categories
export const categories = pgTable('categories', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  icon: varchar('icon', { length: 64 }).notNull().default('Package'),
  parentId: varchar('parent_id', { length: 64 }),
  orderIndex: integer('order_index').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  isPaid: boolean('is_paid').notNull().default(false),
  postingFee: numeric('posting_fee', { precision: 10, scale: 2 }).notNull().default('0.00'),
  freeListingsQuota: integer('free_listings_quota').notNull().default(3),
});

// 3. Custom Fields (EAV)
export const categoryCustomFields = pgTable('category_custom_fields', {
  id: varchar('id', { length: 64 }).primaryKey(),
  categoryId: varchar('category_id', { length: 64 }).notNull().references(() => categories.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 128 }).notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  type: varchar('type', { length: 32 }).notNull(),
  options: jsonb('options'),
  unit: varchar('unit', { length: 32 }),
  required: boolean('required').notNull().default(false),
  filterable: boolean('filterable').notNull().default(true),
  orderIndex: integer('order_index').notNull().default(0),
});

// 4. Locations
export const locations = pgTable('locations', {
  id: varchar('id', { length: 64 }).primaryKey(),
  type: varchar('type', { length: 32 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  code: varchar('code', { length: 32 }),
  geoId: varchar('geo_id', { length: 32 }).notNull(),
  parentId: varchar('parent_id', { length: 64 }),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  popular: boolean('popular').notNull().default(false),
  orderIndex: integer('order_index').notNull().default(0),
});

// 5. Listings
export const listings = pgTable(
  'listings',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    sellerId: varchar('seller_id', { length: 64 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
    categoryId: varchar('category_id', { length: 64 }).notNull().references(() => categories.id),
    subcategoryId: varchar('subcategory_id', { length: 64 }).references(() => categories.id),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    state: varchar('state', { length: 128 }).notNull(),
    city: varchar('city', { length: 128 }).notNull(),
    locality: varchar('locality', { length: 128 }).notNull(),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    images: jsonb('images').notNull().default('[]'),
    customAttributes: jsonb('custom_attributes').notNull().default('{}'),
    status: listingStatusEnum('status').notNull().default('approved'),
    rejectionReason: text('rejection_reason'),
    isFeatured: boolean('is_featured').notNull().default(false),
    featuredUntil: timestamp('featured_until', { withTimezone: true }),

    // Boost Tracking
    isBoosted: boolean('is_boosted').notNull().default(false),
    boostStatus: boostStatusEnum('boost_status').notNull().default('inactive'),
    boostStartedAt: timestamp('boost_started_at', { withTimezone: true }),
    boostExpiresAt: timestamp('boost_expires_at', { withTimezone: true }),
    boostPackageId: varchar('boost_package_id', { length: 64 }),
    boostPackageName: varchar('boost_package_name', { length: 255 }),
    boostPaymentId: varchar('boost_payment_id', { length: 128 }),
    boostPrice: numeric('boost_price', { precision: 10, scale: 2 }).default('0.00'),
    boostDurationHours: integer('boost_duration_hours').default(0),
    boostViews: integer('boost_views').notNull().default(0),
    boostImpressions: integer('boost_impressions').notNull().default(0),
    boostClicks: integer('boost_clicks').notNull().default(0),

    views: integer('views').notNull().default(0),
    likes: integer('likes').notNull().default(0),
    chatsCount: integer('chats_count').notNull().default(0),
    spamScore: integer('spam_score').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    // Unique partial active title index per seller
    uniqueIndex('idx_unique_active_ad_title_per_seller').on(
      table.sellerId,
      sql`LOWER(REGEXP_REPLACE(TRIM(${table.title}), '\\s+', ' ', 'g'))`
    ).where(sql`${table.status} NOT IN ('sold', 'expired')`),
    // Boost ranking index
    index('idx_listings_boost_ranking').on(
      table.boostStatus,
      table.boostExpiresAt,
      table.isFeatured,
      table.createdAt
    ),
  ]
);

// 6. Boost Packages & Transactions
export const boostPackages = pgTable('boost_packages', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  badge: varchar('badge', { length: 64 }).notNull(),
  type: varchar('type', { length: 32 }).notNull().default('boost'),
  durationDays: integer('duration_days').notNull().default(1),
  durationHours: integer('duration_hours').notNull().default(24),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  discountPrice: numeric('discount_price', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 10 }).notNull().default('INR'),
  features: jsonb('features').notNull().default('[]'),
  isActive: boolean('is_active').notNull().default(true),
  salesCount: integer('sales_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const boostOrders = pgTable('boost_orders', {
  orderId: varchar('order_id', { length: 64 }).primaryKey(),
  listingId: varchar('listing_id', { length: 64 }).notNull().references(() => listings.id, { onDelete: 'cascade' }),
  packageId: varchar('package_id', { length: 64 }).notNull().references(() => boostPackages.id),
  userId: varchar('user_id', { length: 64 }).notNull().references(() => users.id),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull(),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  durationHours: integer('duration_hours').notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('INR'),
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const boostTransactions = pgTable('boost_transactions', {
  id: varchar('id', { length: 64 }).primaryKey(),
  orderId: varchar('order_id', { length: 64 }).notNull().references(() => boostOrders.orderId),
  listingId: varchar('listing_id', { length: 64 }).notNull().references(() => listings.id),
  userId: varchar('user_id', { length: 64 }).notNull().references(() => users.id),
  packageId: varchar('package_id', { length: 64 }).notNull().references(() => boostPackages.id),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull(),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  paymentGateway: varchar('payment_gateway', { length: 64 }).notNull(),
  paymentId: varchar('payment_id', { length: 128 }).notNull(),
  invoiceNumber: varchar('invoice_number', { length: 64 }).notNull().unique(),
  status: varchar('status', { length: 32 }).notNull().default('completed'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const paymentWebhookEvents = pgTable('payment_webhook_events', {
  id: varchar('id', { length: 128 }).primaryKey(),
  orderId: varchar('order_id', { length: 64 }).notNull(),
  gateway: varchar('gateway', { length: 64 }).notNull(),
  payload: jsonb('payload').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
});

// 7. Audit Logs
export const auditLogs = pgTable('audit_logs', {
  id: varchar('id', { length: 64 }).primaryKey(),
  adminId: varchar('admin_id', { length: 64 }).notNull(),
  adminName: varchar('admin_name', { length: 255 }).notNull(),
  action: varchar('action', { length: 128 }).notNull(),
  module: varchar('module', { length: 64 }).notNull(),
  targetId: varchar('target_id', { length: 64 }).notNull(),
  targetSummary: varchar('target_summary', { length: 255 }).notNull(),
  details: text('details').notNull(),
  ipAddress: varchar('ip_address', { length: 64 }).notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
});
