import { db } from '@/server/db';
import {
  Category,
  CustomFieldDefinition,
  LocationItem,
  SystemSettings,
  CmsPage,
  AuditLog,
} from '@/lib/types';
import { boostService } from './boost.service';

export class AdminService {
  public getDashboardMetrics() {
    const allListings = Array.from(db.listings.values());
    const allUsers = Array.from(db.users.values());
    const allReports = Array.from(db.reports.values());
    const allTransactions = Array.from(db.transactions.values());

    const totalListings = allListings.length;
    const activeUsers = allUsers.filter((u) => u.status === 'active').length;
    const pendingModeration = allListings.filter((l) => l.status === 'pending').length;
    const pendingKyc = allUsers.filter((u) => u.kycStatus === 'pending').length;
    const openReports = allReports.filter((r) => r.status === 'pending').length;

    let totalRevenue = 0;
    for (const tx of allTransactions) {
      if (tx.status === 'completed') {
        totalRevenue += tx.totalAmount || tx.amount;
      }
    }

    const boostAnalytics = boostService.getBoostAnalytics();
    const recentAuditLogs = Array.from(db.auditLogs.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    return {
      totalListings,
      activeUsers,
      totalRevenue,
      pendingModeration,
      pendingKyc,
      openReports,
      activeBoosts: boostAnalytics.activeBoostsCount,
      boostRevenue: boostAnalytics.totalBoostRevenue,
      recentAuditLogs,
    };
  }

  // Categories
  public getCategories(): Category[] {
    return Array.from(db.categories.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  public addCategory(catData: Omit<Category, 'id' | 'listingCount'>): Category {
    const id = 'cat_' + Date.now();
    const category: Category = {
      ...catData,
      id,
      listingCount: 0,
      isActive: catData.isActive !== undefined ? catData.isActive : true,
      order: catData.order || db.categories.size + 1,
    };
    db.categories.set(id, category);
    this.recordAudit('CATEGORY_CREATED', 'Categories', id, category.name, `Created category "${category.name}"`);
    return category;
  }

  public updateCategory(id: string, updatedData: Partial<Category>): Category | null {
    const existing = db.categories.get(id);
    if (!existing) return null;
    const updated: Category = { ...existing, ...updatedData };
    db.categories.set(id, updated);
    this.recordAudit('CATEGORY_UPDATED', 'Categories', id, updated.name, `Updated category "${updated.name}"`);
    return updated;
  }

  public deleteCategory(id: string): boolean {
    const cat = db.categories.get(id);
    if (!cat) return false;
    db.categories.delete(id);
    // Delete child subcategories as well
    for (const [subId, sub] of db.categories.entries()) {
      if (sub.parentId === id) {
        db.categories.delete(subId);
      }
    }
    this.recordAudit('CATEGORY_DELETED', 'Categories', id, cat.name, `Deleted category "${cat.name}"`);
    return true;
  }

  // Custom Fields (EAV)
  public getCustomFields(categoryId?: string): CustomFieldDefinition[] {
    const all = Array.from(db.customFields.values());
    if (categoryId && categoryId !== 'all') {
      return all.filter((f) => f.categoryId === categoryId);
    }
    return all;
  }

  public addCustomField(fieldData: Omit<CustomFieldDefinition, 'id'>): CustomFieldDefinition {
    const id = 'fld_' + Date.now();
    const field: CustomFieldDefinition = {
      ...fieldData,
      id,
    };
    db.customFields.set(id, field);
    this.recordAudit('ATTRIBUTE_CREATED', 'Attributes', id, field.label, `Added attribute "${field.label}"`);
    return field;
  }

  public updateCustomField(id: string, updatedData: Partial<CustomFieldDefinition>): CustomFieldDefinition | null {
    const existing = db.customFields.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updatedData };
    db.customFields.set(id, updated);
    this.recordAudit('ATTRIBUTE_UPDATED', 'Attributes', id, updated.label, `Updated attribute "${updated.label}"`);
    return updated;
  }

  public deleteCustomField(id: string): boolean {
    const existing = db.customFields.get(id);
    if (!existing) return false;
    db.customFields.delete(id);
    this.recordAudit('ATTRIBUTE_DELETED', 'Attributes', id, existing.label, `Deleted attribute "${existing.label}"`);
    return true;
  }

  // Locations
  public getLocations(): LocationItem[] {
    return Array.from(db.locations.values());
  }

  public addLocation(locData: Omit<LocationItem, 'id' | 'listingCount'>): LocationItem {
    const id = 'loc_' + Date.now();
    const loc: LocationItem = {
      ...locData,
      id,
      listingCount: 0,
    };
    db.locations.set(id, loc);
    return loc;
  }

  public updateLocation(id: string, updatedData: Partial<LocationItem>): LocationItem | null {
    const existing = db.locations.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updatedData };
    db.locations.set(id, updated);
    return updated;
  }

  public deleteLocation(id: string): boolean {
    return db.locations.delete(id);
  }

  // System Settings
  public getSettings(): SystemSettings {
    return db.settings;
  }

  public updateSettings(newSettings: Partial<SystemSettings>): SystemSettings {
    db.settings = { ...db.settings, ...newSettings };
    this.recordAudit('SETTINGS_UPDATED', 'Settings', 'primary', 'System Settings', 'Updated platform settings');
    return db.settings;
  }

  // CMS Pages
  public getCmsPages(): CmsPage[] {
    return Array.from(db.cmsPages.values());
  }

  public getCmsPageBySlug(slug: string): CmsPage | undefined {
    return Array.from(db.cmsPages.values()).find((p) => p.slug === slug);
  }

  public updateCmsPage(id: string, updatedData: Partial<CmsPage>): CmsPage | null {
    const existing = db.cmsPages.get(id);
    if (!existing) return null;
    const updated: CmsPage = {
      ...existing,
      ...updatedData,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    db.cmsPages.set(id, updated);
    return updated;
  }

  public addCmsPage(data: Omit<CmsPage, 'id' | 'updatedAt'>): CmsPage {
    const id = 'p_' + Date.now();
    const page: CmsPage = {
      ...data,
      id,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    db.cmsPages.set(id, page);
    return page;
  }

  public deleteCmsPage(id: string): boolean {
    return db.cmsPages.delete(id);
  }

  // Audit Logging
  public recordAudit(action: string, module: string, targetId: string, targetSummary: string, details: string) {
    const id = `audit_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const log: AuditLog = {
      id,
      adminId: 'adm_1',
      adminName: 'Rajesh Sharma',
      action,
      module,
      targetId,
      targetSummary,
      details,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
    };
    db.auditLogs.set(id, log);
    return log;
  }

  public getAuditLogs(): AuditLog[] {
    return Array.from(db.auditLogs.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}

export const adminService = new AdminService();
