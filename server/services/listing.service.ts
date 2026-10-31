import { listingRepository, ListingFilterQuery } from '@/server/repositories/listing.repository';
import { adminRepository } from '@/server/repositories/admin.repository';
import { Listing } from '@/lib/types';
import { normalizeAdTitle, DUPLICATE_TITLE_ERROR_MESSAGE } from '@/lib/utils/adTitleValidation';

export interface ListingFilterOptions extends ListingFilterQuery {
  userCoords?: { latitude: number; longitude: number } | null;
}

export class ListingService {
  /**
   * Retrieves listings from PostgreSQL with full marketplace priority sorting:
   * Boosted Ads First -> Featured Ads -> Distance / Chronological
   */
  public async getMarketplaceListings(options: ListingFilterOptions = {}): Promise<{
    items: Listing[];
    total: number;
  }> {
    return await listingRepository.findMarketplaceListings(options);
  }

  public async getListingById(id: string): Promise<Listing | null> {
    if (!id) return null;
    return await listingRepository.findById(id.trim());
  }

  public async checkDuplicateTitle(sellerId: string, title: string, excludeListingId?: string) {
    return await listingRepository.checkDuplicateActiveTitle(sellerId, title, excludeListingId);
  }

  public async createListing(
    data: Omit<Listing, 'id' | 'createdAt' | 'views' | 'likes' | 'chatsCount'>,
    authenticatedUserId?: string
  ): Promise<{ success: boolean; listing?: Listing; error?: string; status: number }> {
    const norm = normalizeAdTitle(data.title);
    if (!norm) {
      return { success: false, error: 'Title cannot be empty', status: 400 };
    }

    const sellerId = authenticatedUserId || data.sellerId;
    if (!sellerId) {
      return { success: false, error: 'Seller authentication required', status: 401 };
    }

    // Enforce PostgreSQL partial unique index check
    const dupCheck = await listingRepository.checkDuplicateActiveTitle(sellerId, data.title);
    if (dupCheck.isDuplicate) {
      return {
        success: false,
        error: DUPLICATE_TITLE_ERROR_MESSAGE,
        status: 409,
      };
    }

    // Collision-resistant ID
    const id = `lst_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);

    try {
      const created = await listingRepository.create({
        id,
        sellerId,
        sellerName: data.sellerName || 'Seller',
        sellerPhone: data.sellerPhone || '',
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
        title: data.title,
        description: data.description,
        price: data.price,
        state: data.location?.state || 'Maharashtra',
        city: data.location?.city || 'Mumbai',
        locality: data.location?.locality || 'Locality',
        latitude: data.location?.latitude,
        longitude: data.location?.longitude,
        images: data.images || [],
        customAttributes: data.customAttributes || {},
        status: data.status || 'pending',
        expiresAt,
      });

      // Audit log in PostgreSQL
      await adminRepository.createAuditLog({
        adminId: sellerId,
        adminName: data.sellerName || 'Seller',
        action: 'LISTING_CREATED',
        module: 'Marketplace',
        targetId: id,
        targetSummary: created.title,
        details: `Created listing in ${created.location.city}`,
        ipAddress: '127.0.0.1',
      });

      return { success: true, listing: created, status: 201 };
    } catch (err: any) {
      console.error('ListingService.createListing error:', err);
      return { success: false, error: err.message || 'Failed to save listing', status: 500 };
    }
  }

  public async updateListing(
    id: string,
    updatedData: Partial<Listing>,
    authenticatedUserId?: string,
    isAdmin?: boolean
  ): Promise<{ success: boolean; listing?: Listing; error?: string; status: number }> {
    const existing = await listingRepository.findById(id);
    if (!existing) {
      return { success: false, error: 'Listing not found', status: 404 };
    }

    // Authorization & Ownership Verification
    if (authenticatedUserId && existing.sellerId !== authenticatedUserId && !isAdmin) {
      return { success: false, error: 'Unauthorized: You do not own this listing', status: 403 };
    }

    const targetTitle = updatedData.title !== undefined ? updatedData.title : existing.title;
    const sellerId = existing.sellerId;

    // Duplicate title check if title changed
    if (normalizeAdTitle(targetTitle) !== normalizeAdTitle(existing.title)) {
      const dupCheck = await listingRepository.checkDuplicateActiveTitle(sellerId, targetTitle, id);
      if (dupCheck.isDuplicate) {
        return { success: false, error: DUPLICATE_TITLE_ERROR_MESSAGE, status: 409 };
      }
    }

    // Field allowlist: regular sellers cannot change sensitive moderation or boost flags
    const safeFields: any = {};
    if (updatedData.title !== undefined) safeFields.title = updatedData.title;
    if (updatedData.description !== undefined) safeFields.description = updatedData.description;
    if (updatedData.price !== undefined) safeFields.price = String(updatedData.price);
    if (updatedData.images !== undefined) safeFields.images = updatedData.images;
    if (updatedData.customAttributes !== undefined) safeFields.customAttributes = updatedData.customAttributes;
    if (updatedData.location) {
      if (updatedData.location.city) safeFields.city = updatedData.location.city;
      if (updatedData.location.state) safeFields.state = updatedData.location.state;
      if (updatedData.location.locality) safeFields.locality = updatedData.location.locality;
      if (updatedData.location.latitude) safeFields.latitude = updatedData.location.latitude;
      if (updatedData.location.longitude) safeFields.longitude = updatedData.location.longitude;
    }

    // Admin-only fields
    if (isAdmin) {
      if (updatedData.status !== undefined) safeFields.status = updatedData.status;
      if (updatedData.rejectionReason !== undefined) safeFields.rejectionReason = updatedData.rejectionReason;
      if (updatedData.isFeatured !== undefined) safeFields.isFeatured = updatedData.isFeatured;
      if (updatedData.isBoosted !== undefined) safeFields.isBoosted = updatedData.isBoosted;
    }

    try {
      const updated = await listingRepository.update(id, safeFields);
      if (!updated) {
        return { success: false, error: 'Failed to update listing', status: 500 };
      }

      return { success: true, listing: updated, status: 200 };
    } catch (err: any) {
      console.error('ListingService.updateListing error:', err);
      return { success: false, error: err.message || 'Failed to update listing', status: 500 };
    }
  }

  public async deleteListing(id: string, authenticatedUserId?: string, isAdmin?: boolean): Promise<boolean> {
    const existing = await listingRepository.findById(id);
    if (!existing) return false;

    if (authenticatedUserId && existing.sellerId !== authenticatedUserId && !isAdmin) {
      throw new Error('Unauthorized: You do not own this listing');
    }

    return await listingRepository.delete(id);
  }

  public async bulkApprove(ids: string[]): Promise<number> {
    const res = await listingRepository.bulkUpdateStatus(ids, 'approved');
    return res.updatedCount;
  }

  public async bulkReject(ids: string[], reason: string): Promise<number> {
    const res = await listingRepository.bulkUpdateStatus(ids, 'rejected', reason);
    return res.updatedCount;
  }

  public async bulkDelete(ids: string[]): Promise<number> {
    const res = await listingRepository.bulkDelete(ids);
    return res.deletedCount;
  }

  public async bulkRenew(ids: string[], days: number = 30): Promise<number> {
    const res = await listingRepository.bulkRenew(ids);
    return res.renewedCount;
  }

  public async markSold(id: string, authenticatedUserId?: string, isAdmin?: boolean): Promise<boolean> {
    const existing = await listingRepository.findById(id);
    if (!existing) return false;

    if (authenticatedUserId && existing.sellerId !== authenticatedUserId && !isAdmin) {
      throw new Error('Unauthorized');
    }

    const updated = await listingRepository.update(id, { status: 'sold' });
    return updated !== null;
  }

  public async featureListing(id: string, isFeatured: boolean, days: number = 30): Promise<boolean> {
    const until = isFeatured ? new Date(Date.now() + days * 24 * 3600 * 1000) : null;
    const updated = await listingRepository.update(id, {
      isFeatured,
      featuredUntil: until,
    });
    return updated !== null;
  }

  public async incrementViews(id: string): Promise<void> {
    await listingRepository.incrementViews(id);
  }

  public async getSimilarListings(listingId: string, limit: number = 4): Promise<Listing[]> {
    const current = await listingRepository.findById(listingId);
    if (!current) return [];

    const res = await listingRepository.findMarketplaceListings({
      category: current.categoryId,
      city: current.location.city,
      limit: limit + 1,
    });

    return res.items.filter((l) => l.id !== current.id).slice(0, limit);
  }
}

export const listingService = new ListingService();
