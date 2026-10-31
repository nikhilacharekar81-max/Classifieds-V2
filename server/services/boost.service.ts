import { db } from '@/server/db';
import { PromotionalPackage, OrderTransaction, BoostAnalyticsSummary, Listing } from '@/lib/types';
import { isListingBoosted } from '@/lib/utils/boostHelper';

export class BoostService {
  public getPackages(): PromotionalPackage[] {
    return Array.from(db.packages.values());
  }

  public getPackageById(id: string): PromotionalPackage | undefined {
    return db.packages.get(id);
  }

  public createPackage(pkgData: Omit<PromotionalPackage, 'id' | 'salesCount'>): PromotionalPackage {
    const id = 'pkg_' + Date.now();
    const newPkg: PromotionalPackage = {
      ...pkgData,
      id,
      salesCount: 0,
      durationHours: pkgData.durationHours || pkgData.durationDays * 24,
      currency: pkgData.currency || 'INR',
    };
    db.packages.set(id, newPkg);
    return newPkg;
  }

  public updatePackage(id: string, updatedData: Partial<PromotionalPackage>): PromotionalPackage | null {
    const existing = db.packages.get(id);
    if (!existing) return null;

    const updated: PromotionalPackage = {
      ...existing,
      ...updatedData,
      id,
      durationHours:
        updatedData.durationHours ||
        (updatedData.durationDays ? updatedData.durationDays * 24 : existing.durationHours),
    };
    db.packages.set(id, updated);
    return updated;
  }

  public togglePackageStatus(id: string): PromotionalPackage | null {
    const pkg = db.packages.get(id);
    if (!pkg) return null;
    pkg.isActive = !pkg.isActive;
    db.packages.set(id, pkg);
    return pkg;
  }

  /**
   * Server-authoritative order creation.
   * NEVER trusts client price or duration!
   */
  public async createBoostOrder(params: {
    listingId: string;
    packageId: string;
    userId: string;
    userName?: string;
  }): Promise<{ success: boolean; order?: any; error?: string; status: number }> {
    const { listingId, packageId, userId, userName = 'Marketplace User' } = params;

    // 1. Verify listing exists
    const listing = db.listings.get(listingId);
    if (!listing) {
      return { success: false, error: 'Listing not found', status: 404 };
    }

    // 2. Verify user ownership
    if (listing.sellerId !== userId) {
      return {
        success: false,
        error: 'Unauthorized: You can only boost your own listings',
        status: 403,
      };
    }

    // 3. Verify listing is approved
    if (listing.status !== 'approved') {
      return {
        success: false,
        error: `Only approved live listings can be boosted (Current status: ${listing.status})`,
        status: 400,
      };
    }

    // 4. Verify ad is not already actively boosted
    if (isListingBoosted(listing)) {
      return {
        success: false,
        error: 'This ad is currently boosted. You can boost it again after current boost expires.',
        status: 400,
      };
    }

    // 5. Look up package in database (never from client)
    const pkg = db.packages.get(packageId);
    if (!pkg || !pkg.isActive) {
      return {
        success: false,
        error: 'Selected boost package is invalid or currently disabled',
        status: 400,
      };
    }

    const durationHours = pkg.durationHours || pkg.durationDays * 24;
    const price = pkg.price;
    const taxAmount = Math.round(price * 0.18); // 18% GST standard
    const totalAmount = price + taxAmount;
    const orderId = `ORD-BOOST-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const orderRecord = {
      orderId,
      listingId,
      packageId: pkg.id,
      userId,
      userName,
      price,
      taxAmount,
      totalAmount,
      durationHours,
      currency: pkg.currency || 'INR',
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    };

    db.orders.set(orderId, orderRecord);

    return {
      success: true,
      order: orderRecord,
      status: 201,
    };
  }

  /**
   * Applies boost payment and atomically activates boost on listing.
   */
  public async verifyAndApplyBoost(params: {
    orderId: string;
    listingId: string;
    packageId: string;
    paymentId: string;
    paymentGateway: string;
    userId: string;
    nowMs?: number;
  }): Promise<{ success: boolean; listing?: Listing; transaction?: OrderTransaction; error?: string; status: number }> {
    const { orderId, listingId, packageId, paymentId, paymentGateway, userId, nowMs = Date.now() } = params;

    const order = db.orders.get(orderId);
    if (!order) {
      return { success: false, error: 'Boost order not found', status: 404 };
    }
    if (order.status === 'completed') {
      return { success: false, error: 'This order has already been completed', status: 400 };
    }

    const listing = db.listings.get(listingId);
    if (!listing) {
      return { success: false, error: 'Listing not found', status: 404 };
    }
    if (listing.sellerId !== userId) {
      return { success: false, error: 'Unauthorized user verification', status: 403 };
    }

    const pkg = db.packages.get(packageId);
    if (!pkg) {
      return { success: false, error: 'Boost package not found', status: 400 };
    }

    const durationHours = pkg.durationHours || pkg.durationDays * 24;
    const boostStartedAt = new Date(nowMs).toISOString();
    const boostExpiresAt = new Date(nowMs + durationHours * 3600 * 1000).toISOString();

    // Update listing
    const updatedListing: Listing = {
      ...listing,
      isBoosted: true,
      boostStatus: 'active',
      boostStartedAt,
      boostExpiresAt,
      boostPackageId: pkg.id,
      boostPackageName: pkg.name,
      boostPrice: pkg.price,
      boostDurationHours: durationHours,
      boostPaymentId: paymentId,
      boostViews: listing.boostViews || 0,
      boostImpressions: listing.boostImpressions || 0,
      boostClicks: listing.boostClicks || 0,
    };

    db.listings.set(listingId, updatedListing);

    // Update order status
    order.status = 'completed';
    db.orders.set(orderId, order);

    // Increment sales count
    pkg.salesCount = (pkg.salesCount || 0) + 1;
    db.packages.set(pkg.id, pkg);

    // Create completed transaction record with tax invoice
    const transactionId = `tx_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const transaction: OrderTransaction = {
      id: transactionId,
      orderId,
      userId,
      userName: order.userName,
      packageId: pkg.id,
      packageName: pkg.name,
      amount: pkg.price,
      taxAmount: order.taxAmount,
      totalAmount: order.totalAmount,
      status: 'completed',
      paymentGateway: paymentGateway as any,
      paymentId,
      invoiceNumber,
      createdAt: new Date(nowMs).toISOString(),
    };

    db.transactions.set(transactionId, transaction);

    // Record system audit log
    db.auditLogs.set(`audit_${Date.now()}`, {
      id: `audit_${Date.now()}`,
      adminId: userId,
      adminName: order.userName || 'Seller',
      action: 'BOOST_ACTIVATED',
      module: 'Commerce',
      targetId: listingId,
      targetSummary: `Boosted: ${listing.title} (${pkg.name})`,
      details: `Paid ₹${order.totalAmount} via ${paymentGateway} (${paymentId}). Valid until ${boostExpiresAt}`,
      ipAddress: '127.0.0.1',
      timestamp: boostStartedAt,
    });

    return {
      success: true,
      listing: updatedListing,
      transaction,
      status: 200,
    };
  }

  /**
   * Durable idempotent webhook handler
   */
  public async handleWebhook(event: {
    eventId: string;
    eventType: string;
    orderId: string;
    paymentId: string;
    paymentGateway: string;
  }): Promise<{ success: boolean; message: string; duplicate?: boolean }> {
    const { eventId, eventType, orderId, paymentId, paymentGateway } = event;

    // Idempotency check against database webhook events table
    if (db.webhookEvents.has(eventId)) {
      return {
        success: true,
        duplicate: true,
        message: `Webhook event ${eventId} already processed (idempotent skipped)`,
      };
    }

    db.webhookEvents.add(eventId);

    if (eventType === 'payment.captured' || eventType === 'checkout.session.completed') {
      const order = db.orders.get(orderId);
      if (!order) {
        return { success: false, message: `Order ${orderId} not found` };
      }

      if (order.status !== 'completed') {
        const result = await this.verifyAndApplyBoost({
          orderId,
          listingId: order.listingId,
          packageId: order.packageId,
          paymentId,
          paymentGateway,
          userId: order.userId,
        });
        return { success: result.success, message: 'Boost activated via webhook' };
      }
    }

    return { success: true, message: 'Webhook event processed' };
  }

  public cleanupExpiredBoosts(nowMs: number = Date.now()): number {
    let count = 0;
    for (const [id, listing] of db.listings.entries()) {
      if (listing.isBoosted && listing.boostExpiresAt) {
        const expiryMs = new Date(listing.boostExpiresAt).getTime();
        if (expiryMs <= nowMs) {
          listing.isBoosted = false;
          listing.boostStatus = 'expired';
          db.listings.set(id, { ...listing });
          count++;
        }
      }
    }
    return count;
  }

  public getBoostAnalytics(): BoostAnalyticsSummary {
    const allListings = Array.from(db.listings.values());
    const allTransactions = Array.from(db.transactions.values());

    let totalRevenue = 0;
    for (const tx of allTransactions) {
      if (tx.status === 'completed') {
        totalRevenue += tx.amount;
      }
    }

    const now = Date.now();
    let activeBoostsCount = 0;
    let expiredBoostsCount = 0;
    let totalDurationHours = 0;
    let boostedAdViews = 0;
    let boostedAdImpressions = 0;
    let boostedAdClicks = 0;

    for (const listing of allListings) {
      if (listing.boostStartedAt) {
        if (isListingBoosted(listing, now)) {
          activeBoostsCount++;
        } else if (listing.boostStatus === 'expired') {
          expiredBoostsCount++;
        }
        totalDurationHours += listing.boostDurationHours || 0;
        boostedAdViews += listing.boostViews || 0;
        boostedAdImpressions += listing.boostImpressions || 0;
        boostedAdClicks += listing.boostClicks || 0;
      }
    }

    const totalBoosts = activeBoostsCount + expiredBoostsCount || allTransactions.length;
    const avgDurationHours = totalBoosts > 0 ? Math.round(totalDurationHours / totalBoosts) : 24;

    return {
      totalBoostsPurchased: totalBoosts,
      totalBoostRevenue: totalRevenue,
      activeBoostsCount,
      expiredBoostsCount,
      avgDurationHours,
      boostedAdViews,
      boostedAdImpressions,
      boostedAdClicks,
    };
  }

  public getAllTransactions(): OrderTransaction[] {
    return Array.from(db.transactions.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

export const boostService = new BoostService();
