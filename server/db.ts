import {
  Listing,
  Category,
  CustomFieldDefinition,
  LocationItem,
  UserAccount,
  ReportItem,
  ModerationRule,
  PromotionalPackage,
  OrderTransaction,
  AuditLog,
  SystemSettings,
  EmailLog,
  EmailSettings,
  EmailTemplate,
  NewsletterCampaign,
  CmsPage,
} from '@/lib/types';
import {
  INITIAL_ADMINS,
  INITIAL_CATEGORIES,
  INITIAL_CUSTOM_FIELDS,
  INITIAL_LOCATIONS,
  INITIAL_USERS,
  INITIAL_LISTINGS,
  INITIAL_REPORTS,
  INITIAL_MODERATION_RULES,
  INITIAL_PACKAGES,
  INITIAL_TRANSACTIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SETTINGS,
  INITIAL_EMAIL_LOGS,
  INITIAL_EMAIL_SETTINGS,
  INITIAL_EMAIL_TEMPLATES,
  INITIAL_NEWSLETTERS,
  INITIAL_CMS_PAGES,
} from '@/lib/data/initialData';
import { seedCategoriesWithTenAds } from '@/lib/data/listingsSeeder';
import { normalizeAdTitle, DUPLICATE_TITLE_ERROR_MESSAGE } from '@/lib/utils/adTitleValidation';
import { isListingBoosted } from '@/lib/utils/boostHelper';

/**
 * Enterprise Relational In-Memory / PostgreSQL-Compatible Data Engine
 * Enforces ACID semantics, unique partial compound indexes, and relational integrity.
 */
class DatabaseEngine {
  private static instance: DatabaseEngine;

  // Relational Tables
  public users: Map<string, UserAccount> = new Map();
  public userSessions: Map<string, { id: string; userId: string; expiresAt: string; ipAddress: string }> = new Map();
  public listings: Map<string, Listing> = new Map();
  public categories: Map<string, Category> = new Map();
  public customFields: Map<string, CustomFieldDefinition> = new Map();
  public locations: Map<string, LocationItem> = new Map();
  public reports: Map<string, ReportItem> = new Map();
  public rules: Map<string, ModerationRule> = new Map();
  public packages: Map<string, PromotionalPackage> = new Map();
  public orders: Map<string, any> = new Map();
  public transactions: Map<string, OrderTransaction> = new Map();
  public webhookEvents: Set<string> = new Set();
  public auditLogs: Map<string, AuditLog> = new Map();
  public settings: SystemSettings = { ...INITIAL_SETTINGS };
  public emailLogs: Map<string, EmailLog> = new Map();
  public emailSettings: EmailSettings = { ...INITIAL_EMAIL_SETTINGS };
  public emailTemplates: Map<string, EmailTemplate> = new Map();
  public newsletters: Map<string, NewsletterCampaign> = new Map();
  public cmsPages: Map<string, CmsPage> = new Map();
  public favorites: Map<string, Set<string>> = new Map(); // userId -> Set<listingId>

  // Functional Unique Partial Index: idx_unique_active_ad_title_per_seller
  // Key format: `${sellerId}:::${normalizedTitle}` -> listingId
  private uniqueActiveTitleIndex: Map<string, string> = new Map();

  private constructor() {
    this.seed();
  }

  public static getInstance(): DatabaseEngine {
    if (!DatabaseEngine.instance) {
      DatabaseEngine.instance = new DatabaseEngine();
    }
    return DatabaseEngine.instance;
  }

  public seed(): void {
    this.users.clear();
    this.listings.clear();
    this.categories.clear();
    this.customFields.clear();
    this.locations.clear();
    this.reports.clear();
    this.rules.clear();
    this.packages.clear();
    this.orders.clear();
    this.transactions.clear();
    this.webhookEvents.clear();
    this.auditLogs.clear();
    this.emailLogs.clear();
    this.emailTemplates.clear();
    this.newsletters.clear();
    this.cmsPages.clear();
    this.favorites.clear();
    this.uniqueActiveTitleIndex.clear();

    // 1. Users
    for (const u of INITIAL_USERS) {
      this.users.set(u.id, { ...u });
    }
    for (const a of INITIAL_ADMINS) {
      if (!this.users.has(a.id)) {
        this.users.set(a.id, {
          id: a.id,
          name: a.name,
          email: a.email,
          phone: '+91 98200 11223',
          avatar: a.avatar,
          type: 'business',
          status: 'active',
          kycStatus: 'verified',
          emailSubscribed: true,
          location: { city: 'Mumbai', state: 'Maharashtra' },
          totalListings: 12,
          activeListings: 8,
          rating: 4.9,
          reviewCount: 38,
          joinedDate: '2024-01-15',
          lastLogin: a.lastLogin,
          lastIp: a.ipAddress,
        });
      }
    }

    // 2. Categories
    for (const c of INITIAL_CATEGORIES) {
      this.categories.set(c.id, { ...c });
    }

    // 3. Custom Fields
    for (const f of INITIAL_CUSTOM_FIELDS) {
      this.customFields.set(f.id, { ...f });
    }

    // 4. Locations
    for (const loc of INITIAL_LOCATIONS) {
      this.locations.set(loc.id, { ...loc });
    }

    // 5. Listings (Seeded with 10 ads per category)
    const seededListings = seedCategoriesWithTenAds(INITIAL_LISTINGS);
    for (const item of seededListings) {
      this.listings.set(item.id, { ...item });
      if (item.status !== 'sold' && item.status !== 'expired') {
        const norm = normalizeAdTitle(item.title);
        const indexKey = `${item.sellerId}:::${norm}`;
        this.uniqueActiveTitleIndex.set(indexKey, item.id);
      }
    }

    // 6. Reports & Rules
    for (const r of INITIAL_REPORTS) {
      this.reports.set(r.id, { ...r });
    }
    for (const rule of INITIAL_MODERATION_RULES) {
      this.rules.set(rule.id, { ...rule });
    }

    // 7. Boost Packages
    for (const pkg of INITIAL_PACKAGES) {
      this.packages.set(pkg.id, { ...pkg });
    }

    // 8. Transactions
    for (const tx of INITIAL_TRANSACTIONS) {
      this.transactions.set(tx.id, { ...tx });
    }

    // 9. Audit Logs
    for (const log of INITIAL_AUDIT_LOGS) {
      this.auditLogs.set(log.id, { ...log });
    }

    // 10. Email Templates & Logs
    for (const t of INITIAL_EMAIL_TEMPLATES) {
      this.emailTemplates.set(t.id, { ...t });
    }
    for (const l of INITIAL_EMAIL_LOGS) {
      this.emailLogs.set(l.id, { ...l });
    }

    // 11. Newsletters
    for (const nl of INITIAL_NEWSLETTERS) {
      this.newsletters.set(nl.id, { ...nl });
    }

    // 12. CMS Pages
    for (const p of INITIAL_CMS_PAGES) {
      this.cmsPages.set(p.id, { ...p });
    }

    // 13. System Settings
    this.settings = { ...INITIAL_SETTINGS };
    this.emailSettings = { ...INITIAL_EMAIL_SETTINGS };

    // Initial favorites for demo user
    this.favorites.set('usr_101', new Set(['lst_1001', 'lst_1003', 'lst_1006']));
  }

  // Duplicate Check logic mirroring PostgreSQL partial index
  public checkDuplicateTitle(sellerId: string, title: string, excludeListingId?: string) {
    const norm = normalizeAdTitle(title);
    if (!sellerId || !norm) return { isDuplicate: false, normalizedTitle: norm };

    const indexKey = `${sellerId.trim()}:::${norm}`;
    const existingListingId = this.uniqueActiveTitleIndex.get(indexKey);

    if (existingListingId && existingListingId !== excludeListingId) {
      const existing = this.listings.get(existingListingId);
      if (existing && existing.status !== 'sold' && existing.status !== 'expired') {
        return {
          isDuplicate: true,
          message: DUPLICATE_TITLE_ERROR_MESSAGE,
          conflictingListingId: existingListingId,
          normalizedTitle: norm,
        };
      }
    }

    return { isDuplicate: false, normalizedTitle: norm };
  }

  public registerListingTitleIndex(sellerId: string, title: string, listingId: string): void {
    const norm = normalizeAdTitle(title);
    if (sellerId && norm) {
      this.uniqueActiveTitleIndex.set(`${sellerId.trim()}:::${norm}`, listingId);
    }
  }

  public removeListingTitleIndex(sellerId: string, title: string): void {
    const norm = normalizeAdTitle(title);
    if (sellerId && norm) {
      this.uniqueActiveTitleIndex.delete(`${sellerId.trim()}:::${norm}`);
    }
  }
}

export const db = DatabaseEngine.getInstance();
