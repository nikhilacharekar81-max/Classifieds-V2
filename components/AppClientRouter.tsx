'use client';

import React, { useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { DashboardModule } from '@/components/admin/modules/DashboardModule';
import { ListingsModule } from '@/components/admin/modules/ListingsModule';
import { CategoriesModule } from '@/components/admin/modules/CategoriesModule';
import { AttributesModule } from '@/components/admin/modules/AttributesModule';
import { UsersModule } from '@/components/admin/modules/UsersModule';
import { ModerationModule } from '@/components/admin/modules/ModerationModule';
import { CommerceModule } from '@/components/admin/modules/CommerceModule';
import { LocationsModule } from '@/components/admin/modules/LocationsModule';
import { AdvertisingModule } from '@/components/admin/modules/AdvertisingModule';
import { CommunicationModule } from '@/components/admin/modules/CommunicationModule';
import { CmsSeoModule } from '@/components/admin/modules/CmsSeoModule';
import { AnalyticsModule } from '@/components/admin/modules/AnalyticsModule';
import { AdminSettingsModule } from '@/components/admin/modules/AdminSettingsModule';
import { EmailManagementModule } from '@/components/admin/modules/EmailManagementModule';
import { PaidFeaturesModule } from '@/components/admin/modules/PaidFeaturesModule';
import { MarketplaceView } from '@/components/marketplace/MarketplaceView';
import { ListingDetailPage } from '@/components/marketplace/ListingDetailPage';
import { PostAdPage } from '@/components/marketplace/PostAdPage';
import { UserPanelPage } from '@/components/user/UserPanelPage';
import { GlobalSearchPage } from '@/components/admin/pages/GlobalSearchPage';
import { KycVerificationPage } from '@/components/admin/pages/KycVerificationPage';
import { ToastContainer } from '@/components/common/ToastContainer';
import { CmsPageModal } from '@/components/common/CmsPageModal';
import { ReportModal } from '@/components/common/ReportModal';
import { CmpConsentModal } from '@/components/common/CmpConsentModal';
import { UsPrivacyModal } from '@/components/common/UsPrivacyModal';
import { EeatSchemaModal } from '@/components/common/EeatSchemaModal';
import { useRouter } from '@/lib/router/useRouter';
import { parseChillyPath, updateSeoAndCanonical, findListingById } from '@/lib/utils/seoAndUrlHelper';
import { AppProvider, InitialServerData, useAppOptional } from '@/context/AppContext';
import { Listing } from '@/lib/types';

function renderAdminModule(path: string, activeSidebarTab: string) {
  // Special Sub-pages with their own full views
  if (path.startsWith('/admin/users/kyc/')) {
    const userId = path.split('/')[4];
    return <KycVerificationPage userId={userId} />;
  }

  if (path === '/admin/search' || path.startsWith('/admin/search')) {
    return <GlobalSearchPage />;
  }

  // Sub-routes for nested modules
  const sub = path.replace(/^\/admin\/?/, '') || activeSidebarTab || 'dashboard';

  if (sub.startsWith('marketplace/categories')) {
    return <CategoriesModule />;
  }
  if (sub.startsWith('marketplace/attributes')) {
    return <AttributesModule />;
  }
  if (sub.startsWith('commerce/packages')) {
    return <CommerceModule />;
  }
  if (sub.startsWith('moderation/rules')) {
    return <ModerationModule />;
  }
  if (sub.startsWith('email/')) {
    const tab = sub.replace('email/', '') as any;
    return <EmailManagementModule initialTab={tab || 'dashboard'} />;
  }

  switch (sub) {
    case 'dashboard':
      return <DashboardModule />;

    // Email & Newsletters
    case 'email':
    case 'email/dashboard':
      return <EmailManagementModule initialTab="dashboard" />;
    case 'email/send':
      return <EmailManagementModule initialTab="send" />;
    case 'email/campaigns':
      return <EmailManagementModule initialTab="campaigns" />;
    case 'email/templates':
      return <EmailManagementModule initialTab="templates" />;
    case 'email/settings':
      return <EmailManagementModule initialTab="settings" />;
    case 'email/logs':
      return <EmailManagementModule initialTab="logs" />;

    // Marketplace & Listings
    case 'marketplace/listings':
      return <ListingsModule initialStatusFilter="all" />;
    case 'marketplace/pending':
      return <ListingsModule initialStatusFilter="pending" />;
    case 'marketplace/expired':
      return <ListingsModule initialStatusFilter="expired" />;
    case 'marketplace/featured':
      return <ListingsModule initialStatusFilter="all" />;
    case 'marketplace/locations':
      return <LocationsModule />;

    // Users & KYC
    case 'users/all':
      return <UsersModule initialTab="all" />;
    case 'users/regular':
      return <UsersModule initialTab="users" />;
    case 'users/businesses':
      return <UsersModule initialTab="businesses" />;
    case 'users/verification':
      return <UsersModule initialTab="verification" />;
    case 'users/banned':
      return <UsersModule initialTab="banned" />;

    // Moderation & Trust/Safety
    case 'moderation/reports':
    case 'moderation/spam':
    case 'moderation/fraud':
    case 'moderation/rules':
    case 'moderation/reviews':
      return <ModerationModule />;

    // Paid Features Control Engine
    case 'paid-features':
      return <PaidFeaturesModule />;

    // Commerce, Payments & Monetization
    case 'commerce/orders':
    case 'commerce/transactions':
    case 'commerce/subscriptions':
    case 'commerce/packages':
    case 'commerce/coupons':
    case 'commerce/refunds':
    case 'commerce/taxes':
      return <CommerceModule />;

    // Advertising & Banners
    case 'advertising/campaigns':
    case 'advertising/banners':
    case 'advertising/sponsored':
    case 'advertising/advertisers':
      return <AdvertisingModule />;

    // Communications & Alerts
    case 'communication/messages':
    case 'communication/email':
    case 'communication/sms':
    case 'communication/push':
    case 'communication/templates':
      return <CommunicationModule />;

    // CMS & SEO
    case 'cms/pages':
    case 'cms/blog':
    case 'cms/faq':
    case 'cms/media':
    case 'cms/menus':
    case 'seo/metadata':
    case 'seo/redirects':
    case 'seo/sitemap':
    case 'seo/templates':
      return <CmsSeoModule />;

    // Analytics & Metrics
    case 'analytics/marketplace':
    case 'analytics/users':
    case 'analytics/listings':
    case 'analytics/revenue':
    case 'analytics/reports':
      return <AnalyticsModule />;

    // Administration, RBAC & Logs
    case 'admin/users':
    case 'admin/roles':
    case 'admin/logs':
    case 'admin/settings':
    case 'admin/gateways':
    case 'admin/integrations':
      return <AdminSettingsModule />;

    default:
      return <DashboardModule />;
  }
}

export interface AppClientRouterProps {
  initialPath?: string;
  initialQuery?: Record<string, string>;
  initialListing?: Listing | null;
  initialListings?: Listing[];
  initialTotalListings?: number;
  initialPage?: number;
  initialServerData?: InitialServerData;
}

function AppClientRouterInner({
  initialPath,
  initialQuery,
  initialListing,
  initialListings,
  initialTotalListings,
  initialPage,
}: AppClientRouterProps) {
  const {
    activeSidebarTab,
    setActiveSidebarTab,
    theme,
    locations,
    categories,
    listings,
    settings,
    selectedMarketplaceCity,
    setSelectedMarketplaceCity,
    selectedMarketplaceCategory,
    setSelectedMarketplaceCategory,
    selectedMarketplaceSubcategory,
    setSelectedMarketplaceSubcategory,
    marketplaceSearch,
    setMarketplaceSearch,
  } = useApp();
  const { path, query } = useRouter(initialPath, initialQuery);

  const parsedRoute = useMemo(() => {
    return parseChillyPath(path, locations, categories);
  }, [path, locations, categories]);

  useEffect(() => {
    // 1. Sync City
    if (parsedRoute.city && parsedRoute.city !== selectedMarketplaceCity) {
      setSelectedMarketplaceCity(parsedRoute.city);
    }

    // 2. Sync Category & Subcategory if on public marketplace
    if (parsedRoute.routeType !== 'admin') {
      if (parsedRoute.categoryId !== selectedMarketplaceCategory) {
        setSelectedMarketplaceCategory(parsedRoute.categoryId);
      }
      if (parsedRoute.subcategoryId !== selectedMarketplaceSubcategory) {
        setSelectedMarketplaceSubcategory(parsedRoute.subcategoryId);
      }
    }

    // 3. Sync search query if on search route or ?q= param
    if (query.q !== undefined && query.q !== marketplaceSearch) {
      setMarketplaceSearch(query.q);
    }

    // 4. Find active listing if on item page
    const activeListing = parsedRoute.listingId
      ? findListingById(initialListings || listings, parsedRoute.listingId) || initialListing || null
      : null;

    // 5. Update Document SEO & Canonical Link Tag
    updateSeoAndCanonical(parsedRoute, {
      listing: activeListing,
      categories,
      siteName: settings?.siteName || 'Chillyads',
    });
  }, [
    parsedRoute,
    query.q,
    listings,
    initialListings,
    initialListing,
    categories,
    settings,
    selectedMarketplaceCity,
    selectedMarketplaceCategory,
    selectedMarketplaceSubcategory,
    marketplaceSearch,
    setSelectedMarketplaceCity,
    setSelectedMarketplaceCategory,
    setSelectedMarketplaceSubcategory,
    setMarketplaceSearch,
  ]);

  useEffect(() => {
    if (path.startsWith('/admin')) {
      const sub = path.replace(/^\/admin\/?/, '');
      if (
        sub &&
        !sub.startsWith('users/kyc') &&
        !sub.startsWith('search') &&
        !sub.startsWith('laravel')
      ) {
        const parts = sub.split('/');
        let targetTab = sub;
        if (parts.length >= 3 && (parts[2] === 'new' || parts[2] === 'edit')) {
          targetTab = `${parts[0]}/${parts[1]}`;
        }
        if (targetTab && targetTab !== activeSidebarTab) {
          setActiveSidebarTab(targetTab);
        }
      }
    }
  }, [path, activeSidebarTab, setActiveSidebarTab]);

  const renderGlobalOverlays = () => (
    <>
      <CmsPageModal />
      <ReportModal />
      {settings?.enablePrivacyChoices && <CmpConsentModal />}
      {settings?.enablePrivacyChoices && <UsPrivacyModal />}
      <EeatSchemaModal />
      <ToastContainer />
    </>
  );

  // Route: Listing Detail View (/ad/:id or /item/:id or /mumbai/cars/used-cars/...)
  if (parsedRoute.routeType === 'listing' && parsedRoute.listingId) {
    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
        <ListingDetailPage
          listingId={parsedRoute.listingId}
          initialListing={initialListing}
          initialListings={initialListings}
        />
        {renderGlobalOverlays()}
      </div>
    );
  }

  // Route: User Panel & Account Management (/my-account or /my-ads)
  if (parsedRoute.routeType === 'user-panel') {
    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
        <UserPanelPage />
        {renderGlobalOverlays()}
      </div>
    );
  }

  // Route: Post Ad / Sell Page (/post or /sell)
  if (parsedRoute.routeType === 'post') {
    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
        <PostAdPage />
        {renderGlobalOverlays()}
      </div>
    );
  }

  // Route: Admin Section (/admin/*)
  if (parsedRoute.routeType === 'admin') {
    return (
      <div
        className={`min-h-screen bg-slate-100 dark:bg-slate-950 flex transition-colors ${
          theme === 'dark' ? 'dark' : ''
        }`}
      >
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden h-screen">
          <AdminHeader />
          <main className="flex-1 pb-16">{renderAdminModule(path, activeSidebarTab)}</main>
        </div>
        {renderGlobalOverlays()}
      </div>
    );
  }

  // Default Route: Public Marketplace / Home / City / Category / Search
  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <MarketplaceView
        initialRoute={parsedRoute}
        initialQuery={query}
        initialListings={initialListings}
        initialTotalListings={initialTotalListings}
        initialPage={initialPage}
      />
      {renderGlobalOverlays()}
    </div>
  );
}

export function AppClientRouter(props: AppClientRouterProps = {}) {
  const existingContext = useAppOptional();
  if (!existingContext) {
    return (
      <AppProvider initialServerData={props.initialServerData}>
        <AppClientRouterInner {...props} />
      </AppProvider>
    );
  }
  return <AppClientRouterInner {...props} />;
}

