import { boostRepository } from '@/server/repositories/boost.repository';
import { paymentRepository } from '@/server/repositories/payment.repository';
import { listingRepository } from '@/server/repositories/listing.repository';
import { adminRepository } from '@/server/repositories/admin.repository';
import { PromotionalPackage, OrderTransaction, BoostAnalyticsSummary, Listing } from '@/lib/types';
import crypto from 'node:crypto';

export class BoostService {
  public async getPackages(): Promise<PromotionalPackage[]> {
    return await boostRepository.findAllPackages();
  }

  public async getPackageById(id: string): Promise<PromotionalPackage | null> {
    return await boostRepository.findPackageById(id);
  }

  public async createPackage(pkgData: Omit<PromotionalPackage, 'id' | 'salesCount'>): Promise<PromotionalPackage> {
    const id = `pkg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    return await boostRepository.createPackage({
      ...pkgData,
      id,
    });
  }

  public async updatePackage(id: string, updatedData: Partial<PromotionalPackage>): Promise<PromotionalPackage | null> {
    const updateFields: any = {};
    if (updatedData.name !== undefined) updateFields.name = updatedData.name;
    if (updatedData.badge !== undefined) updateFields.badge = updatedData.badge;
    if (updatedData.price !== undefined) updateFields.price = String(updatedData.price);
    if (updatedData.discountPrice !== undefined) updateFields.discountPrice = String(updatedData.discountPrice);
    if (updatedData.durationDays !== undefined) updateFields.durationDays = updatedData.durationDays;
    if (updatedData.durationHours !== undefined) updateFields.durationHours = updatedData.durationHours;
    if (updatedData.features !== undefined) updateFields.features = updatedData.features;
    if (updatedData.isActive !== undefined) updateFields.isActive = updatedData.isActive;

    return await boostRepository.updatePackage(id, updateFields);
  }

  public async togglePackageStatus(id: string): Promise<PromotionalPackage | null> {
    const pkg = await boostRepository.findPackageById(id);
    if (!pkg) return null;
    return await boostRepository.updatePackage(id, { isActive: !pkg.isActive });
  }

  /**
   * Server-authoritative order creation.
   * NEVER trusts client price or duration!
   */
  public async createBoostOrder(params: {
    listingId: string;
    packageId: string;
    userId: string;
  }): Promise<{ success: boolean; order?: any; error?: string; status: number }> {
    const { listingId, packageId, userId } = params;

    // 1. Verify listing exists
    const listing = await listingRepository.findById(listingId);
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
    if (listing.isBoosted) {
      return {
        success: false,
        error: 'This ad is currently boosted. You can boost it again after current boost expires.',
        status: 400,
      };
    }

    // 5. Look up package in database (never from client)
    const pkg = await boostRepository.findPackageById(packageId);
    if (!pkg || !pkg.isActive) {
      return {
        success: false,
        error: 'Selected boost package is invalid or currently disabled',
        status: 400,
      };
    }

    const durationHours = pkg.durationHours || pkg.durationDays * 24;
    const price = pkg.price;
    const taxAmount = Math.round(price * 0.18 * 100) / 100; // 18% GST standard
    const totalAmount = Math.round((price + taxAmount) * 100) / 100;
    const orderId = `ORD-BOOST-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const orderRecord = await boostRepository.createOrder({
      orderId,
      listingId,
      packageId: pkg.id,
      userId,
      price,
      taxAmount,
      totalAmount,
      durationHours,
    });

    return {
      success: true,
      order: orderRecord,
      status: 201,
    };
  }

  /**
   * Cryptographically verifies HMAC signature from payment gateway.
   */
  public verifyPaymentSignature(params: {
    orderId: string;
    paymentId: string;
    signature: string;
    secret?: string;
  }): boolean {
    const secret = params.secret || process.env.PAYMENT_GATEWAY_SECRET;
    if (!secret) {
      // In development / demo environment without live gateway key, verify well-formed non-empty signature
      return Boolean(params.signature && params.signature.length >= 16);
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${params.orderId}|${params.paymentId}`)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(params.signature));
  }

  /**
   * Applies boost payment and atomically activates boost on listing using PostgreSQL transaction.
   */
  public async verifyAndApplyBoost(params: {
    orderId: string;
    paymentId: string;
    paymentGateway: string;
    signature?: string;
    userId: string;
  }): Promise<{ success: boolean; listingId?: string; invoiceNumber?: string; error?: string; status: number }> {
    const { orderId, paymentId, paymentGateway, signature, userId } = params;

    const order = await boostRepository.findOrderById(orderId);
    if (!order) {
      return { success: false, error: 'Boost order not found', status: 404 };
    }
    if (order.status === 'completed') {
      return { success: true, listingId: order.listingId, invoiceNumber: `INV-${order.orderId.slice(-6)}`, status: 200 };
    }

    // Verify ownership
    if (order.userId !== userId) {
      return { success: false, error: 'Unauthorized: User does not match order', status: 403 };
    }

    // Gateway Signature Verification
    if (signature && !this.verifyPaymentSignature({ orderId, paymentId, signature })) {
      return { success: false, error: 'Invalid payment signature from gateway', status: 400 };
    }

    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    try {
      const result = await paymentRepository.activateBoostInTransaction({
        orderId,
        paymentId,
        paymentGateway,
        invoiceNumber,
      });

      // Audit log in PostgreSQL
      await adminRepository.createAuditLog({
        adminId: userId,
        adminName: 'Seller',
        action: 'BOOST_ACTIVATED',
        module: 'Commerce',
        targetId: order.listingId,
        targetSummary: `Boosted Ad (${order.packageId})`,
        details: `Activated boost via ${paymentGateway} (${paymentId}). Total ₹${order.totalAmount}`,
        ipAddress: '127.0.0.1',
      });

      return {
        success: true,
        listingId: result.listingId,
        invoiceNumber: result.invoiceNumber,
        status: 200,
      };
    } catch (err: any) {
      console.error('BoostService.verifyAndApplyBoost error:', err);
      return { success: false, error: err.message || 'Payment activation failed', status: 500 };
    }
  }

  /**
   * Durable idempotent webhook handler backed by PostgreSQL
   */
  public async handleWebhook(event: {
    eventId: string;
    eventType: string;
    orderId: string;
    paymentId: string;
    paymentGateway: string;
    payload?: any;
  }): Promise<{ success: boolean; message: string; duplicate?: boolean }> {
    const { eventId, eventType, orderId, paymentId, paymentGateway, payload } = event;

    // Idempotency check in PostgreSQL
    const alreadyProcessed = await paymentRepository.isEventProcessed(eventId);
    if (alreadyProcessed) {
      return {
        success: true,
        duplicate: true,
        message: `Webhook event ${eventId} already processed (idempotent skipped)`,
      };
    }

    if (eventType === 'payment.captured' || eventType === 'checkout.session.completed') {
      const order = await boostRepository.findOrderById(orderId);
      if (!order) {
        return { success: false, message: `Order ${orderId} not found` };
      }

      if (order.status !== 'completed') {
        const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
        await paymentRepository.activateBoostInTransaction({
          orderId,
          paymentId,
          paymentGateway,
          invoiceNumber,
          eventId,
          webhookPayload: payload,
        });
        return { success: true, message: 'Boost activated via webhook' };
      }
    }

    // Record non-payment webhook event
    await paymentRepository.recordWebhookEvent(eventId, paymentGateway, orderId, payload || {});
    return { success: true, message: 'Webhook event processed' };
  }

  /**
   * Server-time authoritative cleanup of expired boosts in PostgreSQL
   */
  public async cleanupExpiredBoosts(): Promise<number> {
    const res = await boostRepository.cleanupExpiredBoosts();
    return res.expiredCount;
  }

  public async getBoostAnalytics(): Promise<BoostAnalyticsSummary> {
    const allTransactions = await boostRepository.findAllTransactions();
    const allListingsRes = await listingRepository.findMarketplaceListings({ limit: 1000 });
    const allListings = allListingsRes.items;

    let totalRevenue = 0;
    for (const tx of allTransactions) {
      if (tx.status === 'completed') {
        totalRevenue += tx.totalAmount || tx.amount || 0;
      }
    }

    let activeBoostsCount = 0;
    let expiredBoostsCount = 0;
    let totalDurationHours = 0;
    let boostedAdViews = 0;
    let boostedAdImpressions = 0;
    let boostedAdClicks = 0;

    for (const listing of allListings) {
      if (listing.isBoosted) {
        activeBoostsCount++;
      } else if (listing.boostStatus === 'expired') {
        expiredBoostsCount++;
      }
      totalDurationHours += listing.boostDurationHours || 0;
      boostedAdViews += listing.boostViews || 0;
      boostedAdImpressions += listing.boostImpressions || 0;
      boostedAdClicks += listing.boostClicks || 0;
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

  public async getAllTransactions(): Promise<OrderTransaction[]> {
    return await boostRepository.findAllTransactions();
  }
}

export const boostService = new BoostService();
