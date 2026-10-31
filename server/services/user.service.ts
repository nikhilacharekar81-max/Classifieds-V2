import { db } from '@/server/db';
import { UserAccount, KycStatus } from '@/lib/types';
import { adminService } from './admin.service';

export class UserService {
  public getUsers(filter: string = 'all'): UserAccount[] {
    const all = Array.from(db.users.values());
    if (filter === 'regular' || filter === 'users') {
      return all.filter((u) => u.type === 'user');
    }
    if (filter === 'businesses') {
      return all.filter((u) => u.type === 'business');
    }
    if (filter === 'verification') {
      return all.filter((u) => u.kycStatus === 'pending');
    }
    if (filter === 'banned') {
      return all.filter((u) => u.status === 'banned');
    }
    return all;
  }

  public getUserById(id: string): UserAccount | undefined {
    return db.users.get(id);
  }

  public updateUser(id: string, updatedData: Partial<UserAccount>): UserAccount | null {
    const existing = db.users.get(id);
    if (!existing) return null;
    const updated: UserAccount = { ...existing, ...updatedData };
    db.users.set(id, updated);
    return updated;
  }

  public banUser(userId: string, reason: string): boolean {
    const user = db.users.get(userId);
    if (!user) return false;
    user.status = 'banned';
    db.users.set(userId, user);

    // Reject or suspend all active listings of banned user
    for (const [lId, listing] of db.listings.entries()) {
      if (listing.sellerId === userId && listing.status === 'approved') {
        listing.status = 'rejected';
        listing.rejectionReason = `Seller account suspended: ${reason}`;
        db.listings.set(lId, listing);
      }
    }

    adminService.recordAudit('USER_BANNED', 'Users', userId, user.name, `Banned user with reason: ${reason}`);
    return true;
  }

  public unbanUser(userId: string): boolean {
    const user = db.users.get(userId);
    if (!user) return false;
    user.status = 'active';
    db.users.set(userId, user);
    adminService.recordAudit('USER_UNBANNED', 'Users', userId, user.name, 'Unbanned user');
    return true;
  }

  public verifyKyc(userId: string, status: 'verified' | 'rejected', notes?: string): boolean {
    const user = db.users.get(userId);
    if (!user) return false;
    user.kycStatus = status as KycStatus;
    db.users.set(userId, user);

    adminService.recordAudit(
      status === 'verified' ? 'KYC_APPROVED' : 'KYC_REJECTED',
      'Users',
      userId,
      user.name,
      notes || `KYC status changed to ${status}`
    );
    return true;
  }

  public submitKycDocument(
    userId: string,
    doc: { type: 'Aadhaar' | 'PAN' | 'GSTIN' | 'Passport'; docNumber: string; fileUrl: string }
  ): boolean {
    const user = db.users.get(userId);
    if (!user) return false;
    user.kycStatus = 'pending';
    user.kycDocument = {
      type: doc.type,
      docNumber: doc.docNumber,
      fileUrl: doc.fileUrl,
      submittedAt: new Date().toISOString(),
    };
    db.users.set(userId, user);
    return true;
  }

  // Favorites
  public getFavorites(userId: string): string[] {
    const set = db.favorites.get(userId);
    return set ? Array.from(set) : [];
  }

  public toggleFavorite(userId: string, listingId: string): boolean {
    let set = db.favorites.get(userId);
    if (!set) {
      set = new Set();
      db.favorites.set(userId, set);
    }
    if (set.has(listingId)) {
      set.delete(listingId);
      return false; // now un-favorited
    } else {
      set.add(listingId);
      return true; // now favorited
    }
  }
}

export const userService = new UserService();
