import { db } from '@/src/db/index';
import * as schema from '@/src/db/schema';
import { eq, sql } from 'drizzle-orm';
import { Listing } from '@/lib/types';

export class PaymentRepository {
  /**
   * Checks whether a webhook event has already been durably recorded and processed.
   */
  public async isEventProcessed(eventId: string): Promise<boolean> {
    try {
      const rows = await db
        .select({ id: schema.paymentWebhookEvents.id })
        .from(schema.paymentWebhookEvents)
        .where(eq(schema.paymentWebhookEvents.id, eventId))
        .limit(1);

      return rows.length > 0;
    } catch (error) {
      console.error('PaymentRepository.isEventProcessed error:', error);
      return false;
    }
  }

  /**
   * Durably records webhook event to enforce idempotency.
   */
  public async recordWebhookEvent(eventId: string, gateway: string, orderId: string, payload: any): Promise<void> {
    try {
      await db.insert(schema.paymentWebhookEvents).values({
        id: eventId,
        gateway,
        orderId,
        payload,
      });
    } catch (error) {
      console.error('PaymentRepository.recordWebhookEvent error:', error);
      throw new Error(`Failed to record webhook event ${eventId}`, { cause: error });
    }
  }

  /**
   * Atomically executes the PostgreSQL transaction to activate boost upon verified payment.
   */
  public async activateBoostInTransaction(params: {
    orderId: string;
    paymentId: string;
    paymentGateway: string;
    invoiceNumber: string;
    eventId?: string;
    webhookPayload?: any;
  }): Promise<{ success: boolean; listingId: string; invoiceNumber: string }> {
    return await db.transaction(async (tx) => {
      // 1. Fetch Order
      const orderRows = await tx
        .select()
        .from(schema.boostOrders)
        .where(eq(schema.boostOrders.orderId, params.orderId))
        .limit(1);

      if (!orderRows.length) {
        throw new Error(`Order ${params.orderId} not found`);
      }
      const order = orderRows[0];

      if (order.status === 'completed') {
        return { success: true, listingId: order.listingId, invoiceNumber: params.invoiceNumber };
      }

      // 2. Fetch Package
      const pkgRows = await tx
        .select()
        .from(schema.boostPackages)
        .where(eq(schema.boostPackages.id, order.packageId))
        .limit(1);

      const pkg = pkgRows[0];
      const pkgName = pkg ? pkg.name : 'Boost Package';
      const durationHours = order.durationHours || (pkg ? pkg.durationHours : 24);

      // 3. Update Order Status
      await tx
        .update(schema.boostOrders)
        .set({ status: 'completed' })
        .where(eq(schema.boostOrders.orderId, params.orderId));

      // 4. Update Listing: Activate Boost
      const now = new Date();
      const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

      await tx
        .update(schema.listings)
        .set({
          isBoosted: true,
          boostStatus: 'active',
          boostStartedAt: now,
          boostExpiresAt: expiresAt,
          boostPackageId: order.packageId,
          boostPackageName: pkgName,
          boostPaymentId: params.paymentId,
          boostPrice: order.price,
          boostDurationHours: durationHours,
          updatedAt: now,
        })
        .where(eq(schema.listings.id, order.listingId));

      // 5. Update Package Sales Count
      await tx
        .update(schema.boostPackages)
        .set({ salesCount: sql`${schema.boostPackages.salesCount} + 1` })
        .where(eq(schema.boostPackages.id, order.packageId));

      // 6. Insert Transaction Record
      const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await tx.insert(schema.boostTransactions).values({
        id: txId,
        orderId: order.orderId,
        listingId: order.listingId,
        userId: order.userId,
        packageId: order.packageId,
        amount: order.price,
        taxAmount: order.taxAmount,
        totalAmount: order.totalAmount,
        paymentGateway: params.paymentGateway,
        paymentId: params.paymentId,
        invoiceNumber: params.invoiceNumber,
        status: 'completed',
      });

      // 7. Record durable idempotency event if provided
      if (params.eventId) {
        await tx.insert(schema.paymentWebhookEvents).values({
          id: params.eventId,
          gateway: params.paymentGateway,
          orderId: order.orderId,
          payload: params.webhookPayload || {},
        });
      }

      return {
        success: true,
        listingId: order.listingId,
        invoiceNumber: params.invoiceNumber,
      };
    });
  }
}

export const paymentRepository = new PaymentRepository();
