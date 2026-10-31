import { db } from '@/server/db';
import { Listing } from '@/lib/types';
import { normalizeAdTitle, DUPLICATE_TITLE_ERROR_MESSAGE } from '@/lib/utils/adTitleValidation';
import { isListingBoosted, compareListingsWithBoost } from '@/lib/utils/boostHelper';

export interface ListingFilterOptions {
  city?: string;
  category?: string;
  subcategory?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  propertyType?: string;
  configuration?: string;
  furnishing?: string;
  userCoords?: { latitude: number; longitude: number } | null;
  limit?: number;
  offset?: number;
}

export class ListingService {
  /**
   * Retrieves listings with full marketplace priority sorting:
   * Boosted Ads First -> Featured Ads -> Distance / Chronological
   */
  public getMarketplaceListings(options: ListingFilterOptions = {}): {
    items: Listing[];
    total: number;
  } {
    const all = Array.from(db.listings.values());
    const now = Date.now();

    const filtered = all.filter((l) => {
      // For public marketplace, only show approved ads unless specifically filtering
      if (options.status) {
        if (options.status !== 'all' && l.status !== options.status) return false;
      } else {
        if (l.status !== 'approved' && !l.isFeatured) return false;
      }

      // City filter
      if (options.city && options.city !== 'All India' && options.city !== 'all-india' && options.city !== 'all') {
        const normCity = options.city.toLowerCase().replace(/[-_]/g, ' ');
        if (!l.location.city.toLowerCase().includes(normCity) && !l.location.state.toLowerCase().includes(normCity)) {
          return false;
        }
      }

      // Category filter
      if (options.category && options.category !== 'all') {
        if (l.categoryId !== options.category) {
          // Check if category matches slug or ID
          const catObj = db.categories.get(options.category);
          if (catObj && l.categoryId !== catObj.id) return false;
          if (!catObj && l.categoryId !== options.category) return false;
        }
      }

      // Subcategory filter
      if (options.subcategory && options.subcategory !== 'all') {
        if (l.subcategoryId !== options.subcategory && l.categoryId !== options.subcategory) {
          return false;
        }
      }

      // Search query filter
      if (options.search && options.search.trim()) {
        const q = options.search.toLowerCase().trim();
        const matchesTitle = l.title.toLowerCase().includes(q);
        const matchesDesc = l.description.toLowerCase().includes(q);
        const matchesLoc = l.location.city.toLowerCase().includes(q) || l.location.locality.toLowerCase().includes(q);
        const matchesCat = (l.customAttributes && JSON.stringify(l.customAttributes).toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesLoc && !matchesCat) {
          return false;
        }
      }

      // Price bounds
      if (options.minPrice !== undefined && l.price < options.minPrice) return false;
      if (options.maxPrice !== undefined && l.price > options.maxPrice) return false;

      // Custom attributes filters (e.g. Property type, BHK configuration)
      if (options.propertyType && options.propertyType !== 'all') {
        if (l.customAttributes?.property_type !== options.propertyType) return false;
      }
      if (options.configuration && options.configuration !== 'all') {
        if (l.customAttributes?.configuration !== options.configuration) return false;
      }
      if (options.furnishing && options.furnishing !== 'all') {
        if (l.customAttributes?.furnishing !== options.furnishing) return false;
      }

      return true;
    });

    // Sort using official boost ranking comparator
    filtered.sort((a, b) => compareListingsWithBoost(a, b, options.userCoords, now));

    const total = filtered.length;
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    const items = filtered.slice(offset, offset + limit);

    return { items, total };
  }

  public getListingById(id: string): Listing | null {
    if (!id) return null;
    const cleanId = id.trim();
    // Support matching lst_1001 or full seeded id
    const direct = db.listings.get(cleanId);
    if (direct) return direct;

    const digitsMatch = cleanId.match(/(\d+)$/);
    const targetDigits = digitsMatch ? digitsMatch[1] : null;

    for (const l of db.listings.values()) {
      if (l.id === cleanId) return l;
      if (l.id.replace(/^lst_/, '') === cleanId.replace(/^lst_/, '')) return l;
      if (targetDigits && (l.id.endsWith(`_${targetDigits}`) || l.id === `lst_${targetDigits}`)) {
        return l;
      }
    }
    return null;
  }

  public checkDuplicateTitle(sellerId: string, title: string, excludeListingId?: string) {
    return db.checkDuplicateTitle(sellerId, title, excludeListingId);
  }

  public async createListing(
    data: Omit<Listing, 'id' | 'createdAt' | 'views' | 'likes' | 'chatsCount'>
  ): Promise<{ success: boolean; listing?: Listing; error?: string; status: number }> {
    const norm = normalizeAdTitle(data.title);
    if (!norm) {
      return { success: false, error: 'Title cannot be empty', status: 400 };
    }
    if (!data.sellerId) {
      return { success: false, error: 'Seller ID is required', status: 400 };
    }

    // Enforce PostgreSQL partial unique index check
    const dupCheck = db.checkDuplicateTitle(data.sellerId, data.title);
    if (dupCheck.isDuplicate) {
      return {
        success: false,
        error: DUPLICATE_TITLE_ERROR_MESSAGE,
        status: 409,
      };
    }

    const id = 'lst_' + Math.floor(1000 + Math.random() * 9000);
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

    const newListing: Listing = {
      ...data,
      id,
      createdAt,
      expiresAt,
      views: 1,
      likes: 0,
      chatsCount: 0,
      status: data.status || 'approved',
      isFeatured: data.isFeatured || false,
      isBoosted: data.isBoosted || false,
    };

    db.listings.set(id, newListing);
    db.registerListingTitleIndex(data.sellerId, data.title, id);

    // Increment user's total listings count
    const seller = db.users.get(data.sellerId);
    if (seller) {
      seller.totalListings = (seller.totalListings || 0) + 1;
      if (newListing.status === 'approved') {
        seller.activeListings = (seller.activeListings || 0) + 1;
      }
      db.users.set(seller.id, seller);
    }

    // Record audit log
    db.auditLogs.set(`audit_${Date.now()}`, {
      id: `audit_${Date.now()}`,
      adminId: data.sellerId,
      adminName: data.sellerName || 'Seller',
      action: 'LISTING_CREATED',
      module: 'Marketplace',
      targetId: id,
      targetSummary: newListing.title,
      details: `Created listing in ${newListing.location.city}`,
      ipAddress: '127.0.0.1',
      timestamp: createdAt,
    });

    return { success: true, listing: newListing, status: 201 };
  }

  public async updateListing(
    id: string,
    updatedData: Partial<Listing>
  ): Promise<{ success: boolean; listing?: Listing; error?: string; status: number }> {
    const existing = db.listings.get(id);
    if (!existing) {
      return { success: false, error: 'Listing not found', status: 404 };
    }

    const targetTitle = updatedData.title !== undefined ? updatedData.title : existing.title;
    const sellerId = updatedData.sellerId || existing.sellerId;

    // Duplicate title check if title changed
    if (normalizeAdTitle(targetTitle) !== normalizeAdTitle(existing.title)) {
      const dupCheck = db.checkDuplicateTitle(sellerId, targetTitle, id);
      if (dupCheck.isDuplicate) {
        return { success: false, error: DUPLICATE_TITLE_ERROR_MESSAGE, status: 409 };
      }
      db.removeListingTitleIndex(existing.sellerId, existing.title);
      db.registerListingTitleIndex(sellerId, targetTitle, id);
    }

    const updatedListing: Listing = {
      ...existing,
      ...updatedData,
      id,
    };

    db.listings.set(id, updatedListing);
    return { success: true, listing: updatedListing, status: 200 };
  }

  public deleteListing(id: string): boolean {
    const existing = db.listings.get(id);
    if (!existing) return false;
    db.removeListingTitleIndex(existing.sellerId, existing.title);
    return db.listings.delete(id);
  }

  public bulkApprove(ids: string[]): number {
    let count = 0;
    for (const id of ids) {
      const l = db.listings.get(id);
      if (l) {
        l.status = 'approved';
        l.rejectionReason = undefined;
        db.listings.set(id, l);
        count++;
      }
    }
    return count;
  }

  public bulkReject(ids: string[], reason: string): number {
    let count = 0;
    for (const id of ids) {
      const l = db.listings.get(id);
      if (l) {
        l.status = 'rejected';
        l.rejectionReason = reason;
        db.listings.set(id, l);
        count++;
      }
    }
    return count;
  }

  public bulkDelete(ids: string[]): number {
    let count = 0;
    for (const id of ids) {
      if (this.deleteListing(id)) {
        count++;
      }
    }
    return count;
  }

  public bulkRenew(ids: string[], days: number = 30): number {
    let count = 0;
    for (const id of ids) {
      const l = db.listings.get(id);
      if (l) {
        l.status = 'approved';
        l.expiresAt = new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
        db.listings.set(id, l);
        count++;
      }
    }
    return count;
  }

  public markSold(id: string): boolean {
    const l = db.listings.get(id);
    if (!l) return false;
    l.status = 'sold';
    db.removeListingTitleIndex(l.sellerId, l.title);
    db.listings.set(id, l);
    return true;
  }

  public featureListing(id: string, isFeatured: boolean, days: number = 30): boolean {
    const l = db.listings.get(id);
    if (!l) return false;
    l.isFeatured = isFeatured;
    l.featuredUntil = isFeatured ? new Date(Date.now() + days * 24 * 3600 * 1000).toISOString() : undefined;
    db.listings.set(id, l);
    return true;
  }

  public incrementViews(id: string): void {
    const l = db.listings.get(id);
    if (l) {
      l.views = (l.views || 0) + 1;
      if (l.isBoosted) {
        l.boostViews = (l.boostViews || 0) + 1;
      }
      db.listings.set(id, l);
    }
  }

  public getSimilarListings(listingId: string, limit: number = 4): Listing[] {
    const current = this.getListingById(listingId);
    if (!current) return [];

    return Array.from(db.listings.values())
      .filter((l) => l.id !== current.id && l.status === 'approved' && (l.categoryId === current.categoryId || l.location.city === current.location.city))
      .slice(0, limit);
  }
}

export const listingService = new ListingService();
