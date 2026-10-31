import { db } from '@/src/db/index';
import * as schema from '@/src/db/schema';
import { eq, and, notInArray, sql, desc, or, ilike, gte, lte, inArray } from 'drizzle-orm';
import { Listing } from '@/lib/types';
import { normalizeAdTitle, DUPLICATE_TITLE_ERROR_MESSAGE } from '@/lib/utils/adTitleValidation';

export interface ListingFilterQuery {
  city?: string;
  category?: string;
  subcategory?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  sellerId?: string;
  propertyType?: string;
  configuration?: string;
  furnishing?: string;
  limit?: number;
  offset?: number;
}

export class ListingRepository {
  /**
   * Maps a Drizzle database row to the application's Listing domain type
   */
  private mapRowToListing(row: typeof schema.listings.$inferSelect): Listing {
    return {
      id: row.id,
      sellerId: row.sellerId,
      sellerName: row.sellerName,
      sellerType: 'user' as const,
      sellerPhone: row.sellerPhone,
      sellerAvatar: '',
      categoryId: row.categoryId,
      subcategoryId: row.subcategoryId || undefined,
      title: row.title,
      description: row.description,
      price: Number(row.price),
      location: {
        city: row.city,
        state: row.state,
        locality: row.locality,
        latitude: row.latitude || undefined,
        longitude: row.longitude || undefined,
      },
      images: (row.images as string[]) || [],
      customAttributes: (row.customAttributes as Record<string, any>) || {},
      status: row.status as any,
      rejectionReason: row.rejectionReason || undefined,
      isFeatured: row.isFeatured,
      featuredUntil: row.featuredUntil ? row.featuredUntil.toISOString().split('T')[0] : undefined,
      isBoosted: row.isBoosted && row.boostStatus === 'active' && (!row.boostExpiresAt || row.boostExpiresAt > new Date()),
      boostStatus: row.boostStatus as any,
      boostStartedAt: row.boostStartedAt ? row.boostStartedAt.toISOString() : undefined,
      boostExpiresAt: row.boostExpiresAt ? row.boostExpiresAt.toISOString() : undefined,
      boostPackageId: row.boostPackageId || undefined,
      boostPackageName: row.boostPackageName || undefined,
      boostPaymentId: row.boostPaymentId || undefined,
      boostPrice: row.boostPrice ? Number(row.boostPrice) : undefined,
      boostDurationHours: row.boostDurationHours || undefined,
      boostViews: row.boostViews,
      boostImpressions: row.boostImpressions,
      boostClicks: row.boostClicks,
      views: row.views,
      likes: row.likes,
      chatsCount: row.chatsCount,
      spamScore: row.spamScore,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString().split('T')[0],
    };
  }

  public async findById(id: string): Promise<Listing | null> {
    try {
      const rows = await db
        .select()
        .from(schema.listings)
        .where(eq(schema.listings.id, id))
        .limit(1);

      if (!rows.length) return null;
      return this.mapRowToListing(rows[0]);
    } catch (error) {
      console.error(`ListingRepository.findById error for ${id}:`, error);
      throw new Error(`Failed to find listing with id ${id}`, { cause: error });
    }
  }

  public async checkDuplicateActiveTitle(
    sellerId: string,
    title: string,
    excludeListingId?: string
  ): Promise<{ isDuplicate: boolean; message?: string; conflictingListingId?: string; normalizedTitle: string }> {
    const normalized = normalizeAdTitle(title);
    if (!sellerId || !normalized) {
      return { isDuplicate: false, normalizedTitle: normalized };
    }

    try {
      const conditions = [
        eq(schema.listings.sellerId, sellerId),
        sql`LOWER(REGEXP_REPLACE(TRIM(${schema.listings.title}), '\\s+', ' ', 'g')) = ${normalized}`,
        notInArray(schema.listings.status, ['sold', 'expired']),
      ];

      if (excludeListingId) {
        conditions.push(sql`${schema.listings.id} != ${excludeListingId}`);
      }

      const conflicts = await db
        .select({ id: schema.listings.id })
        .from(schema.listings)
        .where(and(...conditions))
        .limit(1);

      if (conflicts.length > 0) {
        return {
          isDuplicate: true,
          message: DUPLICATE_TITLE_ERROR_MESSAGE,
          conflictingListingId: conflicts[0].id,
          normalizedTitle: normalized,
        };
      }

      return { isDuplicate: false, normalizedTitle: normalized };
    } catch (error) {
      console.error('ListingRepository.checkDuplicateActiveTitle error:', error);
      return { isDuplicate: false, normalizedTitle: normalized };
    }
  }

  public async findMarketplaceListings(options: ListingFilterQuery = {}): Promise<{
    items: Listing[];
    total: number;
  }> {
    try {
      const conditions: any[] = [];

      // Status filtering
      if (options.status && options.status !== 'all') {
        conditions.push(eq(schema.listings.status, options.status));
      } else if (!options.status) {
        // Public marketplace default: only approved listings
        conditions.push(eq(schema.listings.status, 'approved'));
      }

      // Seller filter
      if (options.sellerId) {
        conditions.push(eq(schema.listings.sellerId, options.sellerId));
      }

      // City filter
      if (options.city && options.city !== 'All India' && options.city !== 'all-india' && options.city !== 'all') {
        const cleanCity = options.city.replace(/[-_]/g, ' ');
        conditions.push(
          or(
            ilike(schema.listings.city, `%${cleanCity}%`),
            ilike(schema.listings.state, `%${cleanCity}%`)
          )
        );
      }

      // Category filter
      if (options.category && options.category !== 'all') {
        conditions.push(
          or(
            eq(schema.listings.categoryId, options.category),
            eq(schema.listings.subcategoryId, options.category)
          )
        );
      }

      // Subcategory filter
      if (options.subcategory && options.subcategory !== 'all') {
        conditions.push(eq(schema.listings.subcategoryId, options.subcategory));
      }

      // Search query
      if (options.search && options.search.trim()) {
        const q = `%${options.search.trim()}%`;
        conditions.push(
          or(
            ilike(schema.listings.title, q),
            ilike(schema.listings.description, q),
            ilike(schema.listings.city, q),
            ilike(schema.listings.locality, q)
          )
        );
      }

      // Price bounds
      if (options.minPrice !== undefined) {
        conditions.push(gte(schema.listings.price, String(options.minPrice)));
      }
      if (options.maxPrice !== undefined) {
        conditions.push(lte(schema.listings.price, String(options.maxPrice)));
      }

      // Dynamic customAttributes filters
      if (options.propertyType && options.propertyType !== 'all') {
        conditions.push(sql`${schema.listings.customAttributes}->>'property_type' = ${options.propertyType}`);
      }
      if (options.configuration && options.configuration !== 'all') {
        conditions.push(sql`${schema.listings.customAttributes}->>'configuration' = ${options.configuration}`);
      }
      if (options.furnishing && options.furnishing !== 'all') {
        conditions.push(sql`${schema.listings.customAttributes}->>'furnishing' = ${options.furnishing}`);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Execute Count
      const countRes = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.listings)
        .where(whereClause);
      const total = countRes[0]?.count || 0;

      // Ranking: Active Boosted First -> Featured -> CreatedAt desc
      const query = db
        .select()
        .from(schema.listings)
        .where(whereClause)
        .orderBy(
          sql`CASE WHEN ${schema.listings.boostStatus} = 'active' AND ${schema.listings.boostExpiresAt} > NOW() THEN 1 ELSE 0 END DESC`,
          desc(schema.listings.isFeatured),
          desc(schema.listings.createdAt)
        );

      if (options.limit) {
        query.limit(options.limit);
      }
      if (options.offset) {
        query.offset(options.offset);
      }

      const rows = await query;
      return {
        items: rows.map((r) => this.mapRowToListing(r)),
        total,
      };
    } catch (error) {
      console.error('ListingRepository.findMarketplaceListings error:', error);
      throw new Error('Failed to fetch marketplace listings from PostgreSQL', { cause: error });
    }
  }

  public async create(data: {
    id: string;
    sellerId: string;
    sellerName: string;
    sellerPhone: string;
    categoryId: string;
    subcategoryId?: string;
    title: string;
    description: string;
    price: number;
    state: string;
    city: string;
    locality: string;
    latitude?: number;
    longitude?: number;
    images?: string[];
    customAttributes?: Record<string, any>;
    status?: string;
    expiresAt?: Date;
  }): Promise<Listing> {
    try {
      const exp = data.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const inserted = await db
        .insert(schema.listings)
        .values({
          id: data.id,
          sellerId: data.sellerId,
          sellerName: data.sellerName,
          sellerPhone: data.sellerPhone,
          categoryId: data.categoryId,
          subcategoryId: data.subcategoryId || null,
          title: data.title,
          description: data.description,
          price: String(data.price),
          state: data.state,
          city: data.city,
          locality: data.locality,
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          images: data.images || [],
          customAttributes: data.customAttributes || {},
          status: data.status || 'pending',
          expiresAt: exp,
        })
        .returning();

      return this.mapRowToListing(inserted[0]);
    } catch (error) {
      console.error('ListingRepository.create error:', error);
      throw new Error('Failed to create listing in PostgreSQL', { cause: error });
    }
  }

  public async update(id: string, fields: Partial<typeof schema.listings.$inferInsert>): Promise<Listing | null> {
    try {
      const updated = await db
        .update(schema.listings)
        .set({
          ...fields,
          updatedAt: new Date(),
        })
        .where(eq(schema.listings.id, id))
        .returning();

      if (!updated.length) return null;
      return this.mapRowToListing(updated[0]);
    } catch (error) {
      console.error(`ListingRepository.update error for ${id}:`, error);
      throw new Error(`Failed to update listing ${id}`, { cause: error });
    }
  }

  public async delete(id: string): Promise<boolean> {
    try {
      const res = await db.delete(schema.listings).where(eq(schema.listings.id, id)).returning({ id: schema.listings.id });
      return res.length > 0;
    } catch (error) {
      console.error(`ListingRepository.delete error for ${id}:`, error);
      throw new Error(`Failed to delete listing ${id}`, { cause: error });
    }
  }

  public async incrementViews(id: string): Promise<void> {
    try {
      await db
        .update(schema.listings)
        .set({ views: sql`${schema.listings.views} + 1` })
        .where(eq(schema.listings.id, id));
    } catch (error) {
      // Non-blocking view increment
      console.warn('Failed to increment listing views:', error);
    }
  }

  public async bulkUpdateStatus(ids: string[], status: string, rejectionReason?: string): Promise<{ updatedCount: number }> {
    try {
      const res = await db
        .update(schema.listings)
        .set({
          status,
          rejectionReason: rejectionReason || null,
          updatedAt: new Date(),
        })
        .where(inArray(schema.listings.id, ids))
        .returning({ id: schema.listings.id });

      return { updatedCount: res.length };
    } catch (error) {
      console.error('ListingRepository.bulkUpdateStatus error:', error);
      throw new Error('Bulk update failed in PostgreSQL', { cause: error });
    }
  }

  public async bulkDelete(ids: string[]): Promise<{ deletedCount: number }> {
    try {
      const res = await db
        .delete(schema.listings)
        .where(inArray(schema.listings.id, ids))
        .returning({ id: schema.listings.id });

      return { deletedCount: res.length };
    } catch (error) {
      console.error('ListingRepository.bulkDelete error:', error);
      throw new Error('Bulk delete failed in PostgreSQL', { cause: error });
    }
  }

  public async bulkRenew(ids: string[]): Promise<{ renewedCount: number }> {
    try {
      const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const res = await db
        .update(schema.listings)
        .set({
          status: 'approved',
          expiresAt: newExpiry,
          updatedAt: new Date(),
        })
        .where(inArray(schema.listings.id, ids))
        .returning({ id: schema.listings.id });

      return { renewedCount: res.length };
    } catch (error) {
      console.error('ListingRepository.bulkRenew error:', error);
      throw new Error('Bulk renewal failed in PostgreSQL', { cause: error });
    }
  }
}

export const listingRepository = new ListingRepository();
