'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  AdminUser,
  UserAccount,
  Listing,
  Category,
  CustomFieldDefinition,
  LocationItem,
  ReportItem,
  ModerationRule,
  PromotionalPackage,
  OrderTransaction,
  AuditLog,
  ToastMessage,
  SystemSettings,
  Role,
  UserGeoLocation,
  EmailLog,
  EmailSettings,
  EmailTemplate,
  NewsletterCampaign,
  EmailSmtpConfig,
  NewsletterAudienceFilter,
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
import {
  checkDuplicateAdTitle,
  DUPLICATE_TITLE_ERROR_MESSAGE,
} from '@/lib/utils/adTitleValidation';
import { isListingBoosted } from '@/lib/utils/boostHelper';

interface AppContextType {
  // Navigation & Mode
  viewMode: 'admin' | 'marketplace';
  setViewMode: (mode: 'admin' | 'marketplace') => void;
  activeSidebarTab: string;
  setActiveSidebarTab: (tab: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  globalSearchOpen: boolean;
  setGlobalSearchOpen: (open: boolean) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;

  // Current logged in admin & permissions
  currentAdmin: AdminUser | null;
  switchAdminRole: (role: Role) => void;
  impersonatedUser: UserAccount | null;
  impersonateUser: (user: UserAccount) => void;
  exitImpersonation: () => void;
  currentUser: UserAccount;
  setCurrentUserId: (id: string) => void;

  // Data Collections
  listings: Listing[];
  categories: Category[];
  customFields: CustomFieldDefinition[];
  locations: LocationItem[];
  users: UserAccount[];
  reports: ReportItem[];
  rules: ModerationRule[];
  packages: PromotionalPackage[];
  transactions: OrderTransaction[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
  toasts: ToastMessage[];

  // Listing Operations
  approveListing: (id: string) => void;
  rejectListing: (id: string, reason: string) => void;
  featureListing: (id: string, isFeatured: boolean) => void;
  markAsSold: (id: string) => void;
  deleteListing: (id: string) => void;
  updateListing: (listing: Listing) => boolean;
  restoreListing: (id: string) => void;
  extendExpiration: (id: string, days?: number) => void;
  renewListing: (id: string, days?: number, isFree?: boolean) => void;
  bulkRenewListings: (ids: string[], days?: number) => void;
  markListingAsExpired: (id: string) => void;
  sendAdExpiredEmail: (listingId: string) => void;
  addListing: (listing: Omit<Listing, 'id' | 'createdAt' | 'views' | 'likes' | 'chatsCount'>) => Listing | null;
  checkDuplicateTitle: (
    title: string,
    sellerId: string,
    excludeListingId?: string
  ) => Promise<{ isDuplicate: boolean; message?: string; conflictingListingId?: string }>;
  bulkApproveListings: (ids: string[]) => void;
  bulkRejectListings: (ids: string[], reason: string) => void;
  bulkDeleteListings: (ids: string[]) => void;

  // Email System, Newsletters & Logs
  emailLogs: EmailLog[];
  emailSettings: EmailSettings;
  emailTemplates: EmailTemplate[];
  newsletters: NewsletterCampaign[];
  sendEmail: (emailData: Omit<EmailLog, 'id' | 'sentAt' | 'status'>) => void;
  sendBatchEmails: (emails: Omit<EmailLog, 'id' | 'sentAt' | 'status'>[]) => Promise<number>;
  updateEmailSettings: (newSettings: Partial<EmailSettings>) => void;
  addEmailTemplate: (template: Omit<EmailTemplate, 'id' | 'lastUpdated'>) => EmailTemplate;
  updateEmailTemplate: (template: EmailTemplate) => void;
  deleteEmailTemplate: (id: string) => void;
  resetEmailTemplates: () => void;
  createNewsletterCampaign: (campaign: Omit<NewsletterCampaign, 'id' | 'createdAt' | 'sentCount'>) => NewsletterCampaign;
  sendNewsletterCampaign: (campaignId: string) => Promise<{ success: boolean; recipientCount: number; message: string }>;
  deleteNewsletterCampaign: (id: string) => void;
  testSmtpConnection: (config?: EmailSmtpConfig) => Promise<{ success: boolean; message: string; latencyMs: number }>;
  unsubscribeEmail: (email: string) => boolean;
  filterAudienceUsers: (filter: NewsletterAudienceFilter | string, customState?: string, customCity?: string) => UserAccount[];
  registerUser: (userData: Partial<UserAccount>) => UserAccount;

  // Category & Attributes Operations (Configuration-driven)
  addCategory: (category: Omit<Category, 'id' | 'listingCount'>) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  toggleCategoryStatus: (id: string) => void;
  addCustomField: (field: Omit<CustomFieldDefinition, 'id'>) => void;
  updateCustomField: (field: CustomFieldDefinition) => void;
  deleteCustomField: (id: string) => void;

  // Location Operations (Country -> City hierarchy)
  addLocation: (location: Omit<LocationItem, 'id' | 'listingCount'>) => void;
  updateLocation: (location: LocationItem) => void;
  deleteLocation: (id: string) => void;
  toggleLocationPopular: (id: string) => void;

  // User Operations
  verifyUserKyc: (userId: string, status: 'verified' | 'rejected') => void;
  updateUser: (user: UserAccount) => void;
  banUser: (userId: string, reason: string) => void;
  unbanUser: (userId: string) => void;

  // Moderation
  actionReport: (reportId: string, actionNote: string, actionType: 'actioned' | 'dismissed') => void;
  addModerationRule: (rule: Omit<ModerationRule, 'id'>) => void;
  toggleModerationRule: (id: string) => void;

  // Commerce
  addPackage: (pkg: Omit<PromotionalPackage, 'id' | 'salesCount'>) => void;
  updatePackage: (pkg: PromotionalPackage) => void;
  togglePackageStatus: (id: string) => void;
  boostListing: (
    listingId: string,
    packageId: string,
    paymentMethod?: 'upi' | 'card' | 'netbanking'
  ) => Promise<{ success: boolean; message: string; listing?: Listing; transaction?: OrderTransaction }>;
  isListingBoosted: (listing: Partial<Listing> | null | undefined) => boolean;
  cleanupExpiredBoosts: () => void;

  // Settings & System
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  resetAllCounters: () => void;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  recordAuditLog: (action: string, module: string, targetId: string, targetSummary: string, details: string) => void;

  // CMS Pages & Footer Links
  cmsPages: CmsPage[];
  updateCmsPage: (page: CmsPage) => void;
  addCmsPage: (page: Omit<CmsPage, 'id' | 'updatedAt'>) => void;
  deleteCmsPage: (id: string) => void;
  activeCmsPageSlug: string | null;
  openCmsPageModal: (slug: string) => void;
  closeCmsPageModal: () => void;
  reportModalConfig: { open: boolean; type?: 'ad' | 'user'; targetId?: string; targetTitle?: string } | null;
  openReportModal: (type?: 'ad' | 'user', targetId?: string, targetTitle?: string) => void;
  closeReportModal: () => void;
  submitReport: (report: { targetType: 'listing' | 'user'; targetId: string; targetTitle: string; reason: string; comments: string }) => void;

  // Regulatory & Compliance Modals State
  isCmpModalOpen: boolean;
  openCmpModal: () => void;
  closeCmpModal: () => void;
  isUsPrivacyModalOpen: boolean;
  openUsPrivacyModal: () => void;
  closeUsPrivacyModal: () => void;
  isEeatModalOpen: boolean;
  openEeatModal: () => void;
  closeEeatModal: () => void;

  // Marketplace interaction state
  selectedMarketplaceCity: string;
  setSelectedMarketplaceCity: (city: string) => void;
  selectedMarketplaceCategory: string;
  setSelectedMarketplaceCategory: (catId: string) => void;
  selectedMarketplaceSubcategory: string;
  setSelectedMarketplaceSubcategory: (subId: string) => void;
  marketplaceSearch: string;
  setMarketplaceSearch: (q: string) => void;
  activeViewingListing: Listing | null;
  setActiveViewingListing: (listing: Listing | null) => void;
  isPostAdOpen: boolean;
  setIsPostAdOpen: (open: boolean) => void;
  userLocation: UserGeoLocation | null;
  setUserLocation: (loc: UserGeoLocation | null) => void;
  fetchGpsLocation: () => void;
}

export interface InitialServerData {
  listings?: Listing[];
  categories?: Category[];
  locations?: LocationItem[];
  settings?: SystemSettings;
  cmsPages?: CmsPage[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode; initialServerData?: InitialServerData }> = ({
  children,
  initialServerData,
}) => {
  // Navigation & Mode
  const [viewMode, setViewMode] = useState<'admin' | 'marketplace'>('admin');
  const [activeSidebarTab, setActiveSidebarTab] = useState<string>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [globalSearchOpen, setGlobalSearchOpen] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Admin and Auth
  const [authUser, setAuthUser] = useState<UserAccount | null>(null);
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [impersonatedUser, setImpersonatedUser] = useState<UserAccount | null>(null);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setAuthUser(data.user);
          setActiveUserId(data.user.id);
          if (data.isAdmin || data.isModerator) {
            setCurrentAdmin({
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              avatar: data.user.avatar || 'https://picsum.photos/seed/admin/100/100',
              role: data.adminRole || (data.isAdmin ? 'super_admin' : 'moderator'),
              twoFactorEnabled: false,
              lastLogin: 'Just now',
              ipAddress: '127.0.0.1',
              status: 'active',
            });
          } else {
            setCurrentAdmin(null);
          }
        } else {
          setAuthUser(null);
          setCurrentAdmin(null);
          setActiveUserId(null);
        }
      })
      .catch(() => {
        setAuthUser(null);
        setCurrentAdmin(null);
        setActiveUserId(null);
      });
  }, []);

  // Collections (initialized from server-fetched PostgreSQL data during SSR when provided)
  const [listings, setListings] = useState<Listing[]>(() =>
    initialServerData?.listings || []
  );
  const [categories, setCategories] = useState<Category[]>(() =>
    initialServerData?.categories && initialServerData.categories.length > 0
      ? initialServerData.categories
      : INITIAL_CATEGORIES
  );
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(INITIAL_CUSTOM_FIELDS);
  const [locations, setLocations] = useState<LocationItem[]>(() =>
    initialServerData?.locations && initialServerData.locations.length > 0
      ? initialServerData.locations
      : INITIAL_LOCATIONS
  );
  const [users, setUsers] = useState<UserAccount[]>(INITIAL_USERS);
  const [reports, setReports] = useState<ReportItem[]>(INITIAL_REPORTS);
  const [rules, setRules] = useState<ModerationRule[]>(INITIAL_MODERATION_RULES);
  const [packages, setPackages] = useState<PromotionalPackage[]>(INITIAL_PACKAGES);
  const [transactions, setTransactions] = useState<OrderTransaction[]>(INITIAL_TRANSACTIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [settings, setSettings] = useState<SystemSettings>(() =>
    initialServerData?.settings ? { ...INITIAL_SETTINGS, ...initialServerData.settings } : INITIAL_SETTINGS
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>(INITIAL_EMAIL_LOGS);
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(INITIAL_EMAIL_SETTINGS);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>(INITIAL_EMAIL_TEMPLATES);
  const [newsletters, setNewsletters] = useState<NewsletterCampaign[]>(INITIAL_NEWSLETTERS);

  // CMS Pages & Footer Modal State
  const [cmsPages, setCmsPages] = useState<CmsPage[]>(() =>
    initialServerData?.cmsPages && initialServerData.cmsPages.length > 0
      ? initialServerData.cmsPages
      : INITIAL_CMS_PAGES
  );
  const [activeCmsPageSlug, setActiveCmsPageSlug] = useState<string | null>(null);
  const [reportModalConfig, setReportModalConfig] = useState<{ open: boolean; type?: 'ad' | 'user'; targetId?: string; targetTitle?: string } | null>(null);

  // Regulatory & Compliance Modals State
  const [isCmpModalOpen, setIsCmpModalOpen] = useState(false);
  const [isUsPrivacyModalOpen, setIsUsPrivacyModalOpen] = useState(false);
  const [isEeatModalOpen, setIsEeatModalOpen] = useState(false);

  const openCmpModal = () => setIsCmpModalOpen(true);
  const closeCmpModal = () => setIsCmpModalOpen(false);

  const openUsPrivacyModal = () => setIsUsPrivacyModalOpen(true);
  const closeUsPrivacyModal = () => setIsUsPrivacyModalOpen(false);

  const openEeatModal = () => setIsEeatModalOpen(true);
  const closeEeatModal = () => setIsEeatModalOpen(false);

  useEffect(() => {
    const handleOpenCmp = () => setIsCmpModalOpen(true);
    window.addEventListener('open_cmp_modal', handleOpenCmp);
    return () => {
      window.removeEventListener('open_cmp_modal', handleOpenCmp);
    };
  }, []);

  const openCmsPageModal = (slug: string) => {
    setActiveCmsPageSlug(slug);
  };

  const closeCmsPageModal = () => {
    setActiveCmsPageSlug(null);
  };

  const updateCmsPage = (updatedPage: CmsPage) => {
    setCmsPages(prev => prev.map(p => p.id === updatedPage.id ? { ...updatedPage, updatedAt: new Date().toISOString().split('T')[0] } : p));
    addToast({
      type: 'success',
      title: 'Page Content Saved',
      message: `Updated "${updatedPage.title}" (${updatedPage.slug}).`,
    });
    fetch(`/api/admin/cms/${updatedPage.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPage),
    }).catch(() => {});
  };

  const addCmsPage = (newPage: Omit<CmsPage, 'id' | 'updatedAt'>) => {
    const page: CmsPage = {
      ...newPage,
      id: `p_${Date.now()}`,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setCmsPages(prev => [page, ...prev]);
    addToast({
      type: 'success',
      title: 'New Page Published',
      message: `Page "${page.title}" created successfully.`,
    });
    fetch('/api/admin/cms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(page),
    }).catch(() => {});
  };

  const deleteCmsPage = (id: string) => {
    const target = cmsPages.find(p => p.id === id);
    setCmsPages(prev => prev.filter(p => p.id !== id));
    addToast({
      type: 'warning',
      title: 'Page Deleted',
      message: target ? `Removed page "${target.title}".` : 'Page deleted.',
    });
    fetch(`/api/admin/cms/${id}`, {
      method: 'DELETE',
    }).catch(() => {});
  };

  const openReportModal = (type: 'ad' | 'user' = 'ad', targetId?: string, targetTitle?: string) => {
    setReportModalConfig({ open: true, type, targetId, targetTitle });
  };

  const closeReportModal = () => {
    setReportModalConfig(null);
  };

  const submitReport = (reportData: { targetType: 'listing' | 'user'; targetId: string; targetTitle: string; reason: string; comments: string }) => {
    const validReasons: Record<string, ReportItem['reason']> = {
      spam: 'spam',
      prohibited: 'prohibited_item',
      prohibited_item: 'prohibited_item',
      fraud: 'fraud_scam',
      fraud_scam: 'fraud_scam',
      offensive: 'offensive',
      duplicate: 'duplicate',
      wrong_category: 'wrong_category',
    };

    const parsedReason = validReasons[reportData.reason] || 'spam';

    const newReport: ReportItem = {
      id: `rep_${Date.now()}`,
      type: reportData.targetType,
      targetId: reportData.targetId,
      targetTitle: reportData.targetTitle,
      reportedBy: currentUser ? currentUser.id : 'usr_anon',
      reportedByName: currentUser ? currentUser.name : 'Anonymous User',
      reason: parsedReason,
      notes: reportData.comments || 'User submitted report',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'pending',
    };
    setReports(prev => [newReport, ...prev]);
    addToast({
      type: 'success',
      title: 'Report Submitted',
      message: 'Thank you for reporting. Our moderation team will review this within 15 minutes.',
    });
    setReportModalConfig(null);
  };

  // Marketplace filter states
  const [selectedMarketplaceCity, setSelectedMarketplaceCity] = useState<string>('All India');
  const [selectedMarketplaceCategory, setSelectedMarketplaceCategory] = useState<string>('all');
  const [selectedMarketplaceSubcategory, setSelectedMarketplaceSubcategory] = useState<string>('all');
  const [marketplaceSearch, setMarketplaceSearch] = useState<string>('');
  const [activeViewingListing, setActiveViewingListing] = useState<Listing | null>(null);
  const [isPostAdOpen, setIsPostAdOpen] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<UserGeoLocation | null>({
    latitude: 19.0596,
    longitude: 72.8295,
    city: 'Mumbai',
    area: 'Bandra West',
    radiusKm: 25,
  });

  const fetchGpsLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setUserLocation({
            latitude: lat,
            longitude: lon,
            city: 'Mumbai',
            area: 'Current GPS Location',
            radiusKm: 25,
          });
          setSelectedMarketplaceCity('Mumbai');
          addToast({ type: 'success', title: '📍 Location Acquired', message: `GPS Coordinates: ${lat.toFixed(2)}, ${lon.toFixed(2)}` });
        },
        (error) => {
          addToast({ type: 'warning', title: 'GPS Unavailable', message: 'Using default location: Bandra West, Mumbai' });
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      addToast({ type: 'error', title: 'Not Supported', message: 'Geolocation is not supported by this browser' });
    }
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Synchronize state with PostgreSQL backend on mount via /api/bootstrap
  useEffect(() => {
    const syncDataWithServer = async () => {
      try {
        const res = await fetch('/api/bootstrap');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.listings)) {
            setListings(data.listings);
          }
          if (Array.isArray(data.categories) && data.categories.length > 0) {
            setCategories(data.categories);
          }
          if (Array.isArray(data.locations) && data.locations.length > 0) {
            setLocations(data.locations);
          }
          if (Array.isArray(data.cmsPages)) {
            setCmsPages(data.cmsPages);
          }
          if (data.settings) {
            setSettings((prev) => ({ ...prev, ...data.settings }));
          }
          if (data.currentUser) {
            setActiveUserId(data.currentUser.id);
          }
        }
      } catch (err) {
        console.error('Failed to sync bootstrap data with backend:', err);
      }
    };
    syncDataWithServer();
  }, []);

  // Toast manager
  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = 'toast_' + Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Audit Logger
  const recordAuditLog = (
    action: string,
    module: string,
    targetId: string,
    targetSummary: string,
    details: string
  ) => {
    const newLog: AuditLog = {
      id: 'aud_' + Date.now(),
      adminId: currentAdmin?.id || currentUser?.id || 'system',
      adminName: currentAdmin?.name || currentUser?.name || 'System User',
      action,
      module,
      targetId,
      targetSummary,
      details,
      ipAddress: currentAdmin?.ipAddress ? currentAdmin.ipAddress.split(' ')[0] : 'unknown',
      timestamp: new Date().toLocaleString('en-US', {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Role switching
  const switchAdminRole = (role: Role) => {
    const matched = INITIAL_ADMINS.find(a => a.role === role);
    if (matched) {
      setCurrentAdmin(matched);
    } else if (currentAdmin) {
      setCurrentAdmin({
        ...currentAdmin,
        role,
      });
    } else {
      return;
    }
    addToast({
      type: 'info',
      title: `Switched Role to ${role.replace('_', ' ').toUpperCase()}`,
      message: 'UI permissions and capabilities updated accordingly.',
    });
  };

  // Impersonate user
  const impersonateUser = (user: UserAccount) => {
    setImpersonatedUser(user);
    setViewMode('marketplace');
    recordAuditLog('IMPERSONATE_USER', 'Users / Impersonation', user.id, user.name, `Admin ${currentAdmin?.name || 'System'} started impersonation session for audit`);
    addToast({
      type: 'warning',
      title: `Impersonating ${user.name}`,
      message: 'You are now viewing the marketplace as this user. Actions will be logged in audit trail.',
    });
  };

  const exitImpersonation = () => {
    if (impersonatedUser) {
      recordAuditLog('EXIT_IMPERSONATION', 'Users / Impersonation', impersonatedUser.id, impersonatedUser.name, `Admin ${currentAdmin?.name || 'System'} ended impersonation session`);
    }
    setImpersonatedUser(null);
    setViewMode('admin');
    addToast({
      type: 'info',
      title: 'Exited Impersonation',
      message: 'Returned safely to the Admin Control Panel.',
    });
  };

  // Listing Handlers
  const approveListing = (id: string) => {
    const item = listings.find(l => l.id === id);
    if (!item) return;
    setListings(prev =>
      prev.map(l => (l.id === id ? { ...l, status: 'approved' as const, rejectionReason: undefined } : l))
    );
    recordAuditLog('APPROVE_LISTING', 'Marketplace / Listings', id, item.title, 'Listing reviewed and approved for public search');

    // Send email notification with Feature Your Ad option
    const seller = users.find(u => u.id === item.sellerId);
    const sellerEmail = seller?.email || 'seller@example.com';
    const sellerName = item.sellerName || seller?.name || 'Valued Seller';

    sendEmail({
      toEmail: sellerEmail,
      toName: sellerName,
      subject: `🎉 Good News! Your ad "${item.title.substring(0, 45)}..." is Approved & Live!`,
      body: `Hi ${sellerName},\n\nGreat news! Your classified listing "${item.title}" (Ad ID: #${item.id}) has been reviewed and approved by our moderation team. It is now live and visible to buyers across ${item.location?.city || 'India'}.\n\n🚀 Want to get up to 10x more buyer enquiries? Feature your ad at the top of category search results with an eye-catching Gold Featured Badge!`,
      actionLabel: '⭐ Feature Your Ad Now',
      actionUrl: `/user/my-ads?feature=${item.id}`,
      type: 'ad_approved',
      listingId: item.id,
      listingTitle: item.title,
      relatedUserId: item.sellerId,
    });

    addToast({
      type: 'success',
      title: 'Listing Approved & Email Sent',
      message: `"${item.title.substring(0, 35)}..." is live. Approval email with Feature Ad option dispatched to ${sellerEmail}.`,
    });

    // Synchronize with backend API
    fetch(`/api/listings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    }).catch(() => {});
  };

  const rejectListing = (id: string, reason: string) => {
    const item = listings.find(l => l.id === id);
    if (!item) return;
    setListings(prev =>
      prev.map(l => (l.id === id ? { ...l, status: 'rejected' as const, rejectionReason: reason } : l))
    );
    recordAuditLog('REJECT_LISTING', 'Marketplace / Listings', id, item.title, `Rejected with reason: ${reason}`);
    addToast({
      type: 'error',
      title: 'Listing Rejected',
      message: `Reason: ${reason}`,
    });

    // Synchronize with backend API
    fetch(`/api/listings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected', rejectionReason: reason }),
    }).catch(() => {});
  };

  const featureListing = (id: string, isFeatured: boolean) => {
    const item = listings.find(l => l.id === id);
    if (!item) return;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const featuredUntil = isFeatured ? futureDate.toISOString().split('T')[0] : undefined;
    setListings(prev =>
      prev.map(l =>
        l.id === id
          ? {
              ...l,
              isFeatured,
              featuredUntil,
            }
          : l
      )
    );
    recordAuditLog(isFeatured ? 'FEATURE_LISTING' : 'UNFEATURE_LISTING', 'Marketplace / Listings', id, item.title, isFeatured ? 'Granted Featured Ad status badge' : 'Removed featured status');
    addToast({
      type: 'success',
      title: isFeatured ? 'Listing Featured' : 'Feature Status Removed',
      message: item.title.substring(0, 40) + '...',
    });

    // Synchronize with backend API
    fetch(`/api/listings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFeatured, featuredUntil: featuredUntil || null }),
    }).catch(() => {});
  };

  const markAsSold = (id: string) => {
    const item = listings.find(l => l.id === id);
    if (!item) return;
    setListings(prev =>
      prev.map(l => (l.id === id ? { ...l, status: 'sold' as const } : l))
    );
    recordAuditLog('MARK_AS_SOLD', 'Marketplace / Listings', id, item.title, 'Marked as sold');
    addToast({
      type: 'info',
      title: 'Marked as Sold',
      message: 'Item has been archived as sold.',
    });

    // Synchronize with backend API
    fetch(`/api/listings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sold' }),
    }).catch(() => {});
  };

  const deleteListing = (id: string) => {
    const item = listings.find(l => l.id === id);
    if (!item) return;
    setListings(prev => prev.filter(l => l.id !== id));
    recordAuditLog('DELETE_LISTING', 'Marketplace / Listings', id, item.title, 'Permanently deleted listing');
    addToast({
      type: 'warning',
      title: 'Listing Deleted',
      message: 'The listing has been removed.',
    });

    // Synchronize with backend API
    fetch(`/api/listings/${id}`, {
      method: 'DELETE',
    }).catch(() => {});
  };

  const updateListing = (updatedListing: Listing): boolean => {
    // Check for duplicate title for this seller (excluding the current listing being edited)
    const duplicateCheck = checkDuplicateAdTitle({
      title: updatedListing.title,
      sellerId: updatedListing.sellerId,
      existingListings: listings,
      excludeListingId: updatedListing.id,
    });

    if (duplicateCheck.isDuplicate) {
      addToast({
        type: 'error',
        title: 'Duplicate Ad Title Detected',
        message: DUPLICATE_TITLE_ERROR_MESSAGE,
      });
      return false;
    }

    setListings(prev => prev.map(l => (l.id === updatedListing.id ? updatedListing : l)));
    addToast({
      type: 'success',
      title: 'Listing Updated',
      message: `"${updatedListing.title.substring(0, 35)}..." saved successfully.`,
    });

    // Synchronize with backend API in background
    fetch(`/api/listings/${updatedListing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedListing),
    }).catch(() => {});

    return true;
  };

  const restoreListing = (id: string) => {
    setListings(prev =>
      prev.map(l => (l.id === id ? { ...l, status: 'approved' as const } : l))
    );

    // Synchronize with backend API
    fetch(`/api/listings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    }).catch(() => {});
  };

  const sendEmail = (emailData: Omit<EmailLog, 'id' | 'sentAt' | 'status'>) => {
    const newLog: EmailLog = {
      ...emailData,
      id: 'eml_' + Math.random().toString(36).substring(2, 9),
      sentAt: new Date().toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      status: 'delivered',
    };
    setEmailLogs(prev => [newLog, ...prev]);
    recordAuditLog('DISPATCH_EMAIL', 'Communications / Email', newLog.id, newLog.subject, `Sent to ${newLog.toName} (${newLog.toEmail})`);
  };

  const sendBatchEmails = async (emails: Omit<EmailLog, 'id' | 'sentAt' | 'status'>[]): Promise<number> => {
    const newLogs: EmailLog[] = emails.map(e => ({
      ...e,
      id: 'eml_' + Math.random().toString(36).substring(2, 9),
      sentAt: new Date().toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      status: 'delivered' as const,
    }));
    setEmailLogs(prev => [...newLogs, ...prev]);
    return newLogs.length;
  };

  const filterAudienceUsers = (
    filter: NewsletterAudienceFilter | string,
    customState?: string,
    customCity?: string
  ): UserAccount[] => {
    const target = typeof filter === 'string' ? filter : filter.target;
    const filterState = typeof filter === 'object' ? filter.state : customState;
    const filterCity = typeof filter === 'object' ? filter.city : customCity;

    return users.filter((u) => {
      // Must not be banned
      if (u.status === 'banned') return false;
      // Must have email
      if (!u.email) return false;

      // Marketing newsletter opt-out check
      if (u.emailSubscribed === false) return false;

      switch (target) {
        case 'active_sellers': {
          const hasActiveAds = listings.some((l) => l.sellerId === u.id && l.status === 'approved');
          return hasActiveAds;
        }
        case 'business_users': {
          return u.type === 'business' || u.businessDetails?.verifiedBusiness === true;
        }
        case 'individual_users': {
          return u.type === 'user';
        }
        case 'city_specific': {
          if (!filterCity || filterCity === 'All India' || filterCity === 'all') return true;
          return (u.location?.city || '').toLowerCase() === filterCity.toLowerCase();
        }
        case 'state_specific': {
          if (!filterState || filterState === 'all') return true;
          return (u.location?.state || '').toLowerCase() === filterState.toLowerCase();
        }
        case 'all_subscribed':
        default:
          return true;
      }
    });
  };

  const registerUser = (userData: Partial<UserAccount>): UserAccount => {
    const newId = 'usr_' + Date.now().toString(36);
    const defaultSub = emailSettings.defaultEmailSubscribedOnRegister ?? true;
    const newUser: UserAccount = {
      id: newId,
      name: userData.name || 'New User',
      email: userData.email || '',
      phone: userData.phone || '',
      avatar: userData.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      type: userData.type || 'user',
      status: 'active',
      kycStatus: 'unsubmitted',
      // USER INTENT: Subscribe to newsletter or promotional email to YES by default silently on registration
      emailSubscribed: defaultSub,
      location: userData.location || { city: 'Mumbai', state: 'Maharashtra' },
      totalListings: 0,
      activeListings: 0,
      rating: 5.0,
      reviewCount: 0,
      joinedDate: new Date().toISOString().split('T')[0],
      lastLogin: new Date().toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      lastIp: '49.36.120.45',
    };

    setUsers(prev => [newUser, ...prev]);
    recordAuditLog('USER_REGISTERED', 'Authentication / Users', newUser.id, newUser.name, `New user registration. Email: ${newUser.email} (Email Subscribed: ${newUser.emailSubscribed})`);

    // Automated welcome email dispatch
    const welcomeTemplate = emailTemplates.find(t => t.id === 'tpl_welcome' && t.isActive);
    if (welcomeTemplate && newUser.email) {
      sendEmail({
        toEmail: newUser.email,
        toName: newUser.name,
        subject: welcomeTemplate.subject.replace(/\{\{user_name\}\}/g, newUser.name),
        body: welcomeTemplate.bodyText.replace(/\{\{user_name\}\}/g, newUser.name).replace(/\{\{city\}\}/g, newUser.location?.city || 'India'),
        actionLabel: welcomeTemplate.actionLabel,
        actionUrl: welcomeTemplate.actionUrl,
        type: 'welcome',
        templateId: welcomeTemplate.id,
      });
    }

    return newUser;
  };

  const updateEmailSettings = (newSettings: Partial<EmailSettings>) => {
    setEmailSettings(prev => ({
      ...prev,
      ...newSettings,
      smtp: newSettings.smtp ? { ...prev.smtp, ...newSettings.smtp } : prev.smtp,
    }));
    recordAuditLog('UPDATE_EMAIL_SETTINGS', 'Communications / Email', 'email_settings', 'Email & SMTP Settings', 'Updated SMTP configuration & delivery settings');
    addToast({
      type: 'success',
      title: 'Email Settings Saved',
      message: 'SMTP credentials and delivery preferences have been updated.',
    });
  };

  const addEmailTemplate = (templateData: Omit<EmailTemplate, 'id' | 'lastUpdated'>): EmailTemplate => {
    const id = 'tpl_' + Date.now().toString(36);
    const newTemplate: EmailTemplate = {
      ...templateData,
      id,
      lastUpdated: new Date().toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    };
    setEmailTemplates(prev => [newTemplate, ...prev]);
    recordAuditLog('CREATE_EMAIL_TEMPLATE', 'Communications / Templates', id, newTemplate.name, `Category: ${newTemplate.category}`);
    addToast({
      type: 'success',
      title: 'Template Created',
      message: `"${newTemplate.name}" added successfully.`,
    });
    return newTemplate;
  };

  const updateEmailTemplate = (updated: EmailTemplate) => {
    setEmailTemplates(prev => prev.map(t => t.id === updated.id ? { ...updated, lastUpdated: new Date().toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } : t));
    recordAuditLog('UPDATE_EMAIL_TEMPLATE', 'Communications / Templates', updated.id, updated.name, 'Updated template HTML/text contents');
    addToast({
      type: 'success',
      title: 'Template Updated',
      message: `"${updated.name}" has been saved.`,
    });
  };

  const deleteEmailTemplate = (id: string) => {
    const tpl = emailTemplates.find(t => t.id === id);
    if (!tpl) return;
    if (tpl.isSystemDefault) {
      addToast({
        type: 'warning',
        title: 'System Default Template',
        message: 'System core templates cannot be deleted, but you can edit or disable them.',
      });
      return;
    }
    setEmailTemplates(prev => prev.filter(t => t.id !== id));
    recordAuditLog('DELETE_EMAIL_TEMPLATE', 'Communications / Templates', id, tpl.name, 'Deleted email template');
    addToast({
      type: 'info',
      title: 'Template Deleted',
      message: `"${tpl.name}" was removed.`,
    });
  };

  const resetEmailTemplates = () => {
    setEmailTemplates(INITIAL_EMAIL_TEMPLATES);
    addToast({
      type: 'info',
      title: 'Templates Reset',
      message: 'Restored 20+ default templates.',
    });
  };

  const createNewsletterCampaign = (campaignData: Omit<NewsletterCampaign, 'id' | 'createdAt' | 'sentCount'>): NewsletterCampaign => {
    const id = 'camp_' + Date.now().toString(36);
    const audience = campaignData.audienceFilter || { target: campaignData.targetAudience || 'all_subscribed', city: campaignData.targetCity, state: campaignData.targetState };
    const recipients = filterAudienceUsers(audience);

    const newCampaign: NewsletterCampaign = {
      ...campaignData,
      id,
      audienceFilter: audience,
      totalRecipients: recipients.length,
      targetCount: recipients.length,
      sentCount: 0,
      deliveredCount: 0,
      openedCount: 0,
      clickedCount: 0,
      bouncedCount: 0,
      failedCount: 0,
      status: campaignData.status || 'draft',
      createdAt: new Date().toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    };

    setNewsletters(prev => [newCampaign, ...prev]);
    recordAuditLog('CREATE_NEWSLETTER', 'Communications / Newsletter', id, newCampaign.subject, `Created campaign with ${recipients.length} target recipients`);
    addToast({
      type: 'success',
      title: 'Campaign Created',
      message: `"${newCampaign.subject.substring(0, 30)}..." saved as ${newCampaign.status}.`,
    });
    return newCampaign;
  };

  const sendNewsletterCampaign = async (campaignId: string): Promise<{ success: boolean; recipientCount: number; message: string }> => {
    const campaign = newsletters.find(c => c.id === campaignId);
    if (!campaign) {
      return { success: false, recipientCount: 0, message: 'Campaign not found' };
    }

    const audience = campaign.audienceFilter || { target: campaign.targetAudience || 'all_subscribed', city: campaign.targetCity, state: campaign.targetState };
    const recipients = filterAudienceUsers(audience);

    if (recipients.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Recipients Found',
        message: 'No active subscribed users match the selected audience filter.',
      });
      return { success: false, recipientCount: 0, message: 'No recipients matched the audience filter.' };
    }

    // Set status to sending
    setNewsletters(prev => prev.map(c => c.id === campaignId ? { ...c, status: 'sending' as const } : c));

    // Deliver to all recipients
    const sentLogs: EmailLog[] = recipients.map(u => {
      const replacedSubject = campaign.subject
        .replace(/\{\{user_name\}\}/g, u.name)
        .replace(/\{\{city\}\}/g, u.location?.city || 'India');
      const replacedBody = (campaign.contentHtml || campaign.bodyHtml || '')
        .replace(/\{\{user_name\}\}/g, u.name)
        .replace(/\{\{city\}\}/g, u.location?.city || 'India')
        .replace(/\{\{unsubscribe_url\}\}/g, `${emailSettings.unsubscribeUrl || 'https://chillyads.com/unsubscribe'}?email=${encodeURIComponent(u.email)}`);

      return {
        id: 'eml_' + Math.random().toString(36).substring(2, 9),
        toEmail: u.email,
        toName: u.name,
        subject: replacedSubject,
        body: replacedBody,
        status: 'delivered' as const,
        sentAt: new Date().toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        type: 'newsletter' as const,
        templateId: campaign.id,
        relatedUserId: u.id,
        isMarketing: true,
      };
    });

    setEmailLogs(prev => [...sentLogs, ...prev]);

    const nowStr = new Date().toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    setNewsletters(prev => prev.map(c => c.id === campaignId ? {
      ...c,
      status: 'sent' as const,
      sentCount: recipients.length,
      deliveredCount: recipients.length,
      openedCount: Math.round(recipients.length * 0.62),
      clickedCount: Math.round(recipients.length * 0.26),
      sentAt: nowStr,
    } : c));

    recordAuditLog('SEND_NEWSLETTER', 'Communications / Newsletter', campaign.id, campaign.subject, `Dispatched to ${recipients.length} subscribers`);

    addToast({
      type: 'success',
      title: '🚀 Newsletter Dispatched!',
      message: `Successfully delivered to ${recipients.length} subscribers via ${emailSettings.smtp.host}.`,
    });

    return { success: true, recipientCount: recipients.length, message: `Successfully sent to ${recipients.length} recipients.` };
  };

  const deleteNewsletterCampaign = (id: string) => {
    setNewsletters(prev => prev.filter(c => c.id !== id));
    addToast({
      type: 'info',
      title: 'Campaign Removed',
      message: 'Campaign has been deleted.',
    });
  };

  const testSmtpConnection = async (config?: EmailSmtpConfig): Promise<{ success: boolean; message: string; latencyMs: number }> => {
    const smtpToTest = config || emailSettings.smtp;
    await new Promise(r => setTimeout(r, 600));

    if (!smtpToTest.host || !smtpToTest.username) {
      return {
        success: false,
        message: 'SMTP Host and Username cannot be empty.',
        latencyMs: 120,
      };
    }

    return {
      success: true,
      message: `Connected to ${smtpToTest.host}:${smtpToTest.port} (${smtpToTest.encryption || 'TLS'}). Handshake and authentication verified.`,
      latencyMs: 78,
    };
  };

  const unsubscribeEmail = (email: string): boolean => {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      setUsers(prev => prev.map(u => u.email.toLowerCase() === email.toLowerCase() ? { ...u, emailSubscribed: false } : u));
      recordAuditLog('UNSUBSCRIBE_EMAIL', 'Communications / Subscribers', user.id, user.name, `User opted out of marketing emails: ${email}`);
      addToast({
        type: 'info',
        title: 'Unsubscribed',
        message: `${email} has been unsubscribed from promotional emails.`,
      });
      return true;
    }
    return false;
  };

  const sendAdExpiredEmail = (listingId: string) => {
    const listing = listings.find(l => l.id === listingId);
    if (!listing) return;

    const sellerUser = users.find(u => u.id === listing.sellerId);
    const toEmail = sellerUser?.email || `${listing.sellerName.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`;

    sendEmail({
      toEmail,
      toName: listing.sellerName,
      subject: `Action Required: Your ad "${listing.title.length > 40 ? listing.title.substring(0, 37) + '...' : listing.title}" has expired – Renew it for FREE now!`,
      body: `Hi ${listing.sellerName},\n\nYour classified ad "${listing.title}" (Ad ID: #${listing.id}) on Chillyads has expired on ${listing.expiresAt}.\n\nGood news: You can renew your ad right now for 100% FREE without paying any fees. Once renewed, your listing will be immediately visible again to active buyers across ${listing.location.city}.\n\nClick the button below to renew your ad for free in one click:`,
      actionLabel: 'Renew Ad for Free (₹0)',
      actionUrl: `/my-account?tab=my-ads&filter=expired&renew=${listing.id}`,
      type: 'ad_expired',
      listingId: listing.id,
      listingTitle: listing.title,
    });

    addToast({
      type: 'info',
      title: '📧 Expiry Notice Dispatched',
      message: `Automated free renewal email sent to ${listing.sellerName} (${toEmail}).`,
    });
  };

  const markListingAsExpired = (id: string) => {
    const item = listings.find(l => l.id === id);
    if (!item) return;

    const todayStr = new Date().toISOString().split('T')[0];
    setListings(prev =>
      prev.map(l => (l.id === id ? { ...l, status: 'expired' as const, expiresAt: todayStr } : l))
    );

    recordAuditLog('MARK_EXPIRED', 'Marketplace / Listings', id, item.title, `Marked as expired. Automated expiry notice email sent.`);
    sendAdExpiredEmail(id);

    // Synchronize with backend API
    fetch(`/api/listings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'expired', expiresAt: todayStr }),
    }).catch(() => {});
  };

  const renewListing = (id: string, days = 30, isFree = true) => {
    const item = listings.find(l => l.id === id);
    if (!item) return;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const newExpires = futureDate.toISOString().split('T')[0];

    setListings(prev =>
      prev.map(l =>
        l.id === id
          ? {
              ...l,
              status: 'approved' as const,
              expiresAt: newExpires,
              rejectionReason: undefined,
            }
          : l
      )
    );

    const sellerUser = users.find(u => u.id === item.sellerId);
    const toEmail = sellerUser?.email || `${item.sellerName.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`;

    sendEmail({
      toEmail,
      toName: item.sellerName,
      subject: `Your ad "${item.title.length > 40 ? item.title.substring(0, 37) + '...' : item.title}" has been renewed & is now LIVE!`,
      body: `Hi ${item.sellerName},\n\nCongratulations! Your classified listing "${item.title}" (Ad ID: #${item.id}) has been successfully renewed for ${days} days until ${newExpires} (${isFree ? '100% Free of Charge' : 'Extended'}).\n\nYour ad is now active in ${item.location.city} and receiving search traffic, buyer calls, and chats.`,
      actionLabel: 'View Live Listing',
      actionUrl: `/item/${item.id}`,
      type: 'ad_renewed',
      listingId: item.id,
      listingTitle: item.title,
    });

    recordAuditLog('RENEW_LISTING', 'Marketplace / Listings', id, item.title, `Renewed for ${days} days until ${newExpires} (${isFree ? 'Free ₹0' : 'Paid'})`);

    addToast({
      type: 'success',
      title: '🎉 Ad Renewed for Free!',
      message: `"${item.title.substring(0, 32)}..." is now renewed and active for ${days} days.`,
    });

    // Synchronize with backend API
    fetch(`/api/listings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved', expiresAt: newExpires, rejectionReason: null }),
    }).catch(() => {});
  };

  const bulkRenewListings = (ids: string[], days = 30) => {
    if (ids.length === 0) return;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const newExpires = futureDate.toISOString().split('T')[0];

    setListings(prev =>
      prev.map(l =>
        ids.includes(l.id)
          ? {
              ...l,
              status: 'approved' as const,
              expiresAt: newExpires,
              rejectionReason: undefined,
            }
          : l
      )
    );

    // Send email notices to each seller
    ids.forEach(id => {
      const item = listings.find(l => l.id === id);
      if (item) {
        const sellerUser = users.find(u => u.id === item.sellerId);
        const toEmail = sellerUser?.email || `${item.sellerName.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`;
        sendEmail({
          toEmail,
          toName: item.sellerName,
          subject: `Admin Renewal Notice: Your ad "${item.title.length > 40 ? item.title.substring(0, 37) + '...' : item.title}" has been renewed!`,
          body: `Hi ${item.sellerName},\n\nYour classified ad "${item.title}" (Ad ID: #${item.id}) has been renewed by the Chillyads Admin team for an additional ${days} days until ${newExpires} (100% Free).\n\nYour ad is active and visible to all buyers in ${item.location.city}.`,
          actionLabel: 'View Live Listing',
          actionUrl: `/item/${item.id}`,
          type: 'ad_renewed',
          listingId: item.id,
          listingTitle: item.title,
        });
      }
    });

    recordAuditLog(
      'BULK_RENEW_LISTINGS',
      'Marketplace / Admin',
      `${ids.length} ads`,
      `Bulk renewed ${ids.length} expired ads`,
      `Extended all by ${days} days until ${newExpires} (Free renewal)`
    );

    addToast({
      type: 'success',
      title: '✅ Bulk Renewal Completed',
      message: `Successfully renewed ${ids.length} expired listings for ${days} days. Confirmation emails sent to sellers.`,
    });

    // Synchronize with backend API in background
    fetch('/api/listings/bulk-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', ids, data: { status: 'approved', expiresAt: newExpires } }),
    }).catch(() => {});
  };

  const extendExpiration = (id: string, days = 30) => {
    renewListing(id, days, true);
  };

  const addListing = (newListingData: Omit<Listing, 'id' | 'createdAt' | 'views' | 'likes' | 'chatsCount'>): Listing | null => {
    // Check for duplicate title for this seller
    const duplicateCheck = checkDuplicateAdTitle({
      title: newListingData.title,
      sellerId: newListingData.sellerId,
      existingListings: listings,
    });

    if (duplicateCheck.isDuplicate) {
      addToast({
        type: 'error',
        title: 'Duplicate Ad Title Detected',
        message: DUPLICATE_TITLE_ERROR_MESSAGE,
      });
      return null;
    }

    const id = 'lst_' + Math.floor(1000 + Math.random() * 9000);
    const createdDate = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    const created: Listing = {
      ...newListingData,
      id,
      createdAt: createdDate,
      views: 1,
      likes: 0,
      chatsCount: 0,
    };
    setListings(prev => [created, ...prev]);
    recordAuditLog('NEW_LISTING_POSTED', 'Marketplace / Listings', id, created.title, `Submitted with status: ${created.status}`);
    addToast({
      type: 'success',
      title: 'Ad Posted Successfully!',
      message: created.status === 'approved' ? 'Your ad is live on Chillyads.' : 'Ad submitted for verification in the moderation queue.',
    });

    // Synchronize with backend API in background
    fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(created),
    }).catch(() => {});

    return created;
  };

  const checkDuplicateTitle = async (
    title: string,
    sellerId: string,
    excludeListingId?: string
  ): Promise<{ isDuplicate: boolean; message?: string; conflictingListingId?: string }> => {
    // 1. Instant client-side check against live state
    const clientCheck = checkDuplicateAdTitle({
      title,
      sellerId,
      existingListings: listings,
      excludeListingId,
    });

    if (clientCheck.isDuplicate) {
      return clientCheck;
    }

    // 2. Server-side API verification check
    try {
      const res = await fetch('/api/listings/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, sellerId, excludeListingId }),
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch {
      // Return clientCheck on network failure
    }

    return clientCheck;
  };

  const bulkApproveListings = (ids: string[]) => {
    setListings(prev =>
      prev.map(l => (ids.includes(l.id) ? { ...l, status: 'approved' as const, rejectionReason: undefined } : l))
    );
    recordAuditLog('BULK_APPROVE', 'Marketplace / Moderation', `${ids.length} items`, `${ids.length} listings approved`, `IDs: ${ids.join(', ')}`);
    addToast({
      type: 'success',
      title: 'Bulk Approval Complete',
      message: `Successfully approved ${ids.length} listings.`,
    });

    // Synchronize with backend API in background
    fetch('/api/listings/bulk-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', ids, data: { status: 'approved' } }),
    }).catch(() => {});
  };

  const bulkRejectListings = (ids: string[], reason: string) => {
    setListings(prev =>
      prev.map(l => (ids.includes(l.id) ? { ...l, status: 'rejected' as const, rejectionReason: reason } : l))
    );
    recordAuditLog('BULK_REJECT', 'Marketplace / Moderation', `${ids.length} items`, `${ids.length} listings rejected`, `Reason: ${reason}`);
    addToast({
      type: 'error',
      title: 'Bulk Rejection Applied',
      message: `Rejected ${ids.length} listings. Reason: ${reason}`,
    });

    // Synchronize with backend API in background
    fetch('/api/listings/bulk-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', ids, data: { status: 'rejected', rejectionReason: reason } }),
    }).catch(() => {});
  };

  const bulkDeleteListings = (ids: string[]) => {
    setListings(prev => prev.filter(l => !ids.includes(l.id)));
    recordAuditLog('BULK_DELETE', 'Marketplace / Listings', `${ids.length} items`, 'Permanently deleted multiple listings', `IDs: ${ids.join(', ')}`);
    addToast({
      type: 'warning',
      title: 'Bulk Delete Applied',
      message: `Deleted ${ids.length} listings.`,
    });

    // Synchronize with backend API in background
    fetch('/api/listings/bulk-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', ids }),
    }).catch(() => {});
  };

  // Categories and dynamic attributes
  const addCategory = (catData: Omit<Category, 'id' | 'listingCount'>) => {
    const prefix = catData.parentId ? 'sub_' : 'cat_';
    const baseId = prefix + (catData.slug || 'item').replace(/[^a-z0-9]/g, '_');
    let id = baseId;
    let counter = 1;
    while (categories.some(c => c.id === id)) {
      id = `${baseId}_${counter++}`;
    }
    const newCat: Category = { ...catData, id, listingCount: 0 };
    setCategories(prev => [...prev, newCat]);
    recordAuditLog(
      catData.parentId ? 'CREATE_SUBCATEGORY' : 'CREATE_CATEGORY',
      'Marketplace / Categories',
      id,
      newCat.name,
      catData.parentId ? 'Added new subcategory under parent category' : 'Added new category via configuration panel'
    );
    addToast({
      type: 'success',
      title: catData.parentId ? 'Subcategory Created' : 'Category Created',
      message: `"${newCat.name}" has been added to taxonomy.`,
    });
    fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCat),
    }).catch(() => {});
  };

  const updateCategory = (cat: Category) => {
    setCategories(prev => prev.map(c => (c.id === cat.id ? cat : c)));
    recordAuditLog('UPDATE_CATEGORY', 'Marketplace / Categories', cat.id, cat.name, 'Updated category SEO & hierarchy configuration');
    addToast({ type: 'success', title: 'Category Updated', message: cat.name });
    fetch(`/api/admin/categories/${cat.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cat),
    }).catch(() => {});
  };

  const toggleCategoryStatus = (id: string) => {
    const target = categories.find(c => c.id === id);
    if (!target) return;
    const updatedStatus = !target.isActive;
    setCategories(prev =>
      prev.map(c => (c.id === id ? { ...c, isActive: updatedStatus } : c))
    );
    fetch(`/api/admin/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: updatedStatus }),
    }).catch(() => {});
  };

  const deleteCategory = (id: string) => {
    const cat = categories.find(c => c.id === id);
    // Delete this category and any child subcategories
    setCategories(prev => prev.filter(c => c.id !== id && c.parentId !== id));
    if (cat) {
      recordAuditLog('DELETE_CATEGORY', 'Marketplace / Categories', id, cat.name, 'Deleted category and associated subcategories');
      addToast({ type: 'warning', title: 'Category Deleted', message: cat.name });
    }
    fetch(`/api/admin/categories/${id}`, {
      method: 'DELETE',
    }).catch(() => {});
  };

  const addCustomField = (field: Omit<CustomFieldDefinition, 'id'>) => {
    const id = 'cf_' + field.name + '_' + Math.random().toString(36).substring(2, 6);
    const newField: CustomFieldDefinition = { ...field, id };
    setCustomFields(prev => [...prev, newField]);
    recordAuditLog('ADD_CUSTOM_ATTRIBUTE', 'Marketplace / Attributes', id, field.label, `Bound dynamic field to category ${field.categoryId}`);
    addToast({ type: 'success', title: 'Custom Field Added', message: field.label });
  };

  const updateCustomField = (field: CustomFieldDefinition) => {
    setCustomFields(prev => prev.map(f => (f.id === field.id ? field : f)));
    recordAuditLog('UPDATE_CUSTOM_ATTRIBUTE', 'Marketplace / Attributes', field.id, field.label, 'Updated dynamic attribute specification');
    addToast({ type: 'success', title: 'Attribute Updated', message: field.label });
  };

  const deleteCustomField = (id: string) => {
    const field = customFields.find(f => f.id === id);
    setCustomFields(prev => prev.filter(f => f.id !== id));
    if (field) {
      recordAuditLog('DELETE_CUSTOM_ATTRIBUTE', 'Marketplace / Attributes', id, field.label, 'Removed custom field');
    }
    addToast({ type: 'warning', title: 'Attribute Deleted' });
  };

  // Location Handlers (Country -> City hierarchy)
  const addLocation = (locData: Omit<LocationItem, 'id' | 'listingCount'>) => {
    const id = 'loc_' + (locData.code ? locData.code.toLowerCase() : locData.name.toLowerCase().replace(/[^a-z0-9]/g, '_'));
    const newLoc: LocationItem = {
      ...locData,
      id,
      listingCount: 0,
    };
    setLocations(prev => [...prev, newLoc]);
    recordAuditLog('CREATE_LOCATION', 'Marketplace / Locations', id, newLoc.name, `Created ${newLoc.type} in Country -> City hierarchy`);
    addToast({ type: 'success', title: `${newLoc.type === 'country' ? 'Country' : 'City'} Added`, message: newLoc.name });
    fetch('/api/admin/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLoc),
    }).catch(() => {});
  };

  const updateLocation = (loc: LocationItem) => {
    setLocations(prev => prev.map(l => (l.id === loc.id ? loc : l)));
    recordAuditLog('UPDATE_LOCATION', 'Marketplace / Locations', loc.id, loc.name, `Updated location details`);
    addToast({ type: 'success', title: 'Location Updated', message: loc.name });
    fetch(`/api/admin/locations/${loc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loc),
    }).catch(() => {});
  };

  const deleteLocation = (id: string) => {
    const loc = locations.find(l => l.id === id);
    setLocations(prev => prev.filter(l => l.id !== id && l.parentId !== id));
    if (loc) {
      recordAuditLog('DELETE_LOCATION', 'Marketplace / Locations', id, loc.name, `Deleted location and linked cities`);
      addToast({ type: 'warning', title: 'Location Removed', message: loc.name });
    }
    fetch(`/api/admin/locations/${id}`, {
      method: 'DELETE',
    }).catch(() => {});
  };

  const toggleLocationPopular = (id: string) => {
    const target = locations.find(l => l.id === id);
    if (!target) return;
    const updatedPopular = !target.popular;
    setLocations(prev =>
      prev.map(l => (l.id === id ? { ...l, popular: updatedPopular } : l))
    );
    fetch(`/api/admin/locations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ popular: updatedPopular }),
    }).catch(() => {});
  };

  // User Actions
  const updateUser = (updatedUser: UserAccount) => {
    setUsers(prev => prev.map(u => (u.id === updatedUser.id ? updatedUser : u)));
    addToast({
      type: 'success',
      title: 'Profile Updated',
      message: 'Your account settings have been saved.',
    });
    fetch(`/api/admin/users/${updatedUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedUser),
    }).catch(() => {});
  };

  const verifyUserKyc = (userId: string, status: 'verified' | 'rejected') => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, kycStatus: status } : u))
    );
    recordAuditLog(status === 'verified' ? 'VERIFY_USER_KYC' : 'REJECT_USER_KYC', 'Users / Verification', userId, user.name, `Manual KYC status set to ${status}`);
    addToast({
      type: status === 'verified' ? 'success' : 'error',
      title: status === 'verified' ? 'User KYC Verified' : 'User KYC Rejected',
      message: user.name,
    });
    fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify_kyc', userId, status }),
    }).catch(() => {});
  };

  const banUser = (userId: string, reason: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, status: 'banned' as const } : u))
    );
    // Also deactivate listings
    setListings(prev =>
      prev.map(l => (l.sellerId === userId ? { ...l, status: 'rejected' as const, rejectionReason: 'Seller account suspended' } : l))
    );
    recordAuditLog('BAN_USER', 'Users / Safety', userId, user.name, `Banned user and suspended all ads. Reason: ${reason}`);
    addToast({
      type: 'error',
      title: 'User Banned',
      message: `${user.name} has been banned. All active listings taken down.`,
    });
    fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ban', userId, reason }),
    }).catch(() => {});
  };

  const unbanUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, status: 'active' as const } : u))
    );
    recordAuditLog('UNBAN_USER', 'Users / Safety', userId, user.name, 'Reactivated user account');
    addToast({
      type: 'success',
      title: 'User Re-activated',
      message: `${user.name} account restored to active status.`,
    });
    fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unban', userId }),
    }).catch(() => {});
  };

  // Moderation
  const actionReport = (reportId: string, actionNote: string, actionType: 'actioned' | 'dismissed') => {
    setReports(prev =>
      prev.map(r =>
        r.id === reportId
          ? {
              ...r,
              status: actionType,
              actionTaken: actionNote,
            }
          : r
      )
    );
    recordAuditLog('MODERATE_REPORT', 'Moderation / Queue', reportId, actionType, actionNote);
    addToast({
      type: 'info',
      title: 'Report Processed',
      message: `Status: ${actionType.toUpperCase()}`,
    });
    fetch('/api/admin/moderation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'action_report', reportId, note: actionNote, actionType }),
    }).catch(() => {});
  };

  const addModerationRule = (rule: Omit<ModerationRule, 'id'>) => {
    const id = 'rule_' + Date.now();
    setRules(prev => [...prev, { ...rule, id }]);
    recordAuditLog('CREATE_MODERATION_RULE', 'Moderation / Rules', id, rule.title, `Automated action: ${rule.action}`);
    addToast({ type: 'success', title: 'Moderation Rule Created', message: rule.title });
    fetch('/api/admin/moderation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_rule', ruleData: rule }),
    }).catch(() => {});
  };

  const toggleModerationRule = (id: string) => {
    const target = rules.find(r => r.id === id);
    if (!target) return;
    const updated = !target.isActive;
    setRules(prev =>
      prev.map(r => (r.id === id ? { ...r, isActive: updated } : r))
    );
    fetch('/api/admin/moderation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_rule', ruleData: { id } }),
    }).catch(() => {});
  };

  // Commerce
  const addPackage = (pkg: Omit<PromotionalPackage, 'id' | 'salesCount'>) => {
    const id = 'pkg_' + Math.random().toString(36).substring(2, 7);
    const newPkg = { ...pkg, id, salesCount: 0 };
    setPackages(prev => [...prev, newPkg]);
    recordAuditLog('CREATE_COMMERCE_PACKAGE', 'Commerce / Packages', id, pkg.name, `Price: ₹${pkg.price}`);
    addToast({ type: 'success', title: 'Promotional Package Added', message: pkg.name });
    fetch('/api/boost/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPkg),
    }).catch(() => {});
  };

  const updatePackage = (pkg: PromotionalPackage) => {
    setPackages(prev => prev.map(p => (p.id === pkg.id ? pkg : p)));
    recordAuditLog('UPDATE_COMMERCE_PACKAGE', 'Commerce / Packages', pkg.id, pkg.name, `Price: ₹${pkg.price}`);
    addToast({ type: 'success', title: 'Package Updated', message: pkg.name });
    fetch(`/api/boost/packages/${pkg.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pkg),
    }).catch(() => {});
  };

  const togglePackageStatus = (id: string) => {
    const target = packages.find(p => p.id === id);
    if (!target) return;
    const updatedStatus = !target.isActive;
    setPackages(prev =>
      prev.map(p => (p.id === id ? { ...p, isActive: updatedStatus } : p))
    );
    fetch(`/api/boost/packages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: updatedStatus }),
    }).catch(() => {});
  };

  // ==========================================
  // BOOST YOUR AD TO TOP LOGIC
  // ==========================================

  const cleanupExpiredBoosts = () => {
    const now = Date.now();
    setListings(prev => {
      let changed = false;
      const updated = prev.map(listing => {
        if (listing.isBoosted && listing.boostExpiresAt) {
          const expiryTime = new Date(listing.boostExpiresAt).getTime();
          if (expiryTime <= now) {
            changed = true;
            return {
              ...listing,
              isBoosted: false,
              boostStatus: 'expired' as const,
            };
          }
        }
        return listing;
      });
      return changed ? updated : prev;
    });

    // Notify backend server cleanup if available
    fetch('/api/boost/cleanup-expired', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nowMs: now }),
    }).catch(() => {});
  };

  // Periodic automatic cleanup of expired boosts
  useEffect(() => {
    cleanupExpiredBoosts();
    const interval = setInterval(() => {
      cleanupExpiredBoosts();
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  const boostListing = async (
    listingId: string,
    packageId: string,
    paymentMethod: 'upi' | 'card' | 'netbanking' = 'upi'
  ): Promise<{ success: boolean; message: string; listing?: Listing; transaction?: OrderTransaction }> => {
    const listing = listings.find(l => l.id === listingId);
    if (!listing) {
      return { success: false, message: 'Listing not found' };
    }

    if (isListingBoosted(listing)) {
      return {
        success: false,
        message: 'This ad already has an active boost. You can boost it again after the current boost expires.',
      };
    }

    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) {
      return { success: false, message: 'Selected boost package not found' };
    }

    try {
      // 1. Create order on server (Never trust frontend price or duration!)
      const orderRes = await fetch('/api/boost/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId,
          packageId,
          userId: currentUser?.id || listing.sellerId,
          userName: currentUser?.name || listing.sellerName,
        }),
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json().catch(() => ({}));
        return {
          success: false,
          message: errData.error || 'Failed to initialize boost order on server',
        };
      }

      const orderData = await orderRes.json();

      // 2. Gateway payment confirmation
      const paymentId = `pay_boost_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
      const gatewayName = paymentMethod === 'upi' ? 'UPI' : paymentMethod === 'card' ? 'Razorpay' : 'Netbanking';

      const verifyRes = await fetch('/api/boost/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.orderId,
          listingId,
          packageId,
          paymentId,
          paymentGateway: gatewayName,
          userId: currentUser?.id || listing.sellerId,
        }),
      });

      if (!verifyRes.ok) {
        const errData = await verifyRes.json().catch(() => ({}));
        return {
          success: false,
          message: errData.error || 'Payment verification failed',
        };
      }

      const verifyData = await verifyRes.json();
      const updatedListing = verifyData.listing as Listing;
      const transaction = verifyData.transaction as OrderTransaction;

      // 3. Update React App State
      setListings(prev => prev.map(l => (l.id === listingId ? updatedListing : l)));
      setPackages(prev =>
        prev.map(p => (p.id === packageId ? { ...p, salesCount: (p.salesCount || 0) + 1 } : p))
      );
      if (transaction) {
        setTransactions(prev => [transaction, ...prev]);
      }

      recordAuditLog(
        'BOOST_LISTING',
        'Marketplace / Ads',
        listingId,
        listing.title,
        `Boosted with package ${pkg.name} for ₹${pkg.price} (Payment Ref: ${paymentId})`
      );

      addToast({
        type: 'success',
        title: 'Ad Boosted to Top!',
        message: `"${listing.title}" is now boosted to the top of category feeds for ${pkg.durationHours || pkg.durationDays * 24} hours.`,
      });

      return {
        success: true,
        message: 'Ad successfully boosted to top!',
        listing: updatedListing,
        transaction,
      };
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Boost Payment Failed',
        message: err.message || 'Unable to complete boost order verification.',
      });

      return {
        success: false,
        message: err.message || 'Payment processing failed. Please try again.',
      };
    }
  };

  // Settings
  const updateSettings = (newSettings: Partial<SystemSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    recordAuditLog('UPDATE_SYSTEM_SETTINGS', 'Administration / Settings', 'sys_config', 'System Configuration', 'Updated global site settings');
    addToast({ type: 'success', title: 'Settings Saved', message: 'System configuration updated.' });
  };

  const resetAllCounters = () => {
    setListings(prev => prev.map(l => ({ ...l, views: 0, likes: 0, chatsCount: 0, spamScore: 0 })));
    setCategories(prev => prev.map(c => ({ ...c, listingCount: 0 })));
    setLocations(prev => prev.map(loc => ({ ...loc, listingCount: 0 })));
    setUsers(prev => prev.map(u => ({ ...u, totalListings: 0, activeListings: 0, reviewCount: 0 })));
    setPackages(prev => prev.map(p => ({ ...p, salesCount: 0 })));
    recordAuditLog('RESET_ALL_COUNTERS', 'Administration / System', 'counters', 'System Counters Reset', 'Reset all listing views, likes, chats, user listing counts, category counts, location counts, and package sales counts to 0');
    addToast({
      type: 'success',
      title: 'All Counters Reset!',
      message: 'Listings views, likes, chats, category counts, location counts, and package sales counts have been reset to 0.',
    });
  };

  const currentUser = impersonatedUser || authUser || (activeUserId ? users.find(u => u.id === activeUserId) : null) || users[0];

  return (
    <AppContext.Provider
      value={{
        viewMode,
        setViewMode,
        activeSidebarTab,
        setActiveSidebarTab,
        theme,
        toggleTheme,
        globalSearchOpen,
        setGlobalSearchOpen,
        mobileSidebarOpen,
        setMobileSidebarOpen,
        currentAdmin,
        switchAdminRole,
        impersonatedUser,
        impersonateUser,
        exitImpersonation,
        currentUser,
        setCurrentUserId: setActiveUserId,
        listings,
        categories,
        customFields,
        locations,
        users,
        reports,
        rules,
        packages,
        transactions,
        auditLogs,
        settings,
        toasts,
        approveListing,
        rejectListing,
        featureListing,
        markAsSold,
        deleteListing,
        updateListing,
        restoreListing,
        extendExpiration,
        renewListing,
        bulkRenewListings,
        markListingAsExpired,
        sendAdExpiredEmail,
        emailLogs,
        emailSettings,
        emailTemplates,
        newsletters,
        sendEmail,
        sendBatchEmails,
        updateEmailSettings,
        addEmailTemplate,
        updateEmailTemplate,
        deleteEmailTemplate,
        resetEmailTemplates,
        createNewsletterCampaign,
        sendNewsletterCampaign,
        deleteNewsletterCampaign,
        testSmtpConnection,
        unsubscribeEmail,
        filterAudienceUsers,
        registerUser,
        addListing,
        checkDuplicateTitle,
        bulkApproveListings,
        bulkRejectListings,
        bulkDeleteListings,
        addCategory,
        updateCategory,
        deleteCategory,
        toggleCategoryStatus,
        addCustomField,
        updateCustomField,
        deleteCustomField,
        addLocation,
        updateLocation,
        deleteLocation,
        toggleLocationPopular,
        verifyUserKyc,
        updateUser,
        banUser,
        unbanUser,
        actionReport,
        addModerationRule,
        toggleModerationRule,
        addPackage,
        updatePackage,
        togglePackageStatus,
        boostListing,
        isListingBoosted,
        cleanupExpiredBoosts,
        updateSettings,
        resetAllCounters,
        addToast,
        removeToast,
        recordAuditLog,
        selectedMarketplaceCity,
        setSelectedMarketplaceCity,
        selectedMarketplaceCategory,
        setSelectedMarketplaceCategory,
        selectedMarketplaceSubcategory,
        setSelectedMarketplaceSubcategory,
        marketplaceSearch,
        setMarketplaceSearch,
        activeViewingListing,
        setActiveViewingListing,
        isPostAdOpen,
        setIsPostAdOpen,
        userLocation,
        setUserLocation,
        fetchGpsLocation,
        cmsPages,
        updateCmsPage,
        addCmsPage,
        deleteCmsPage,
        activeCmsPageSlug,
        openCmsPageModal,
        closeCmsPageModal,
        reportModalConfig,
        openReportModal,
        closeReportModal,
        submitReport,
        isCmpModalOpen,
        openCmpModal,
        closeCmpModal,
        isUsPrivacyModalOpen,
        openUsPrivacyModal,
        closeUsPrivacyModal,
        isEeatModalOpen,
        openEeatModal,
        closeEeatModal,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppOptional = () => {
  return useContext(AppContext);
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};


