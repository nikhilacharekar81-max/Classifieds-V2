'use client';
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from '@/lib/router/useRouter';
import {
  LayoutDashboard,
  Store,
  Users,
  ShieldCheck,
  CreditCard,
  Megaphone,
  MessageSquare,
  FileText,
  Search,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  ShoppingBag,
  Clock,
  Layers,
  LogOut,
  Sparkles,
  MapPin,
  Star,
  UserCheck,
  Building,
  UserX,
  AlertOctagon,
  Bot,
  AlertTriangle,
  Sliders,
  Receipt,
  RotateCcw,
  Percent,
  Coins,
  Radio,
  Share2,
  Mail,
  Send,
  Bell,
  Code,
  Globe,
  ExternalLink,
  Database,
  KeyRound,
  History,
  Workflow,
  SlidersHorizontal,
  X,
} from 'lucide-react';

export const AdminSidebar: React.FC = () => {
  const {
    activeSidebarTab,
    setActiveSidebarTab,
    listings,
    users,
    reports,
    mobileSidebarOpen,
    setMobileSidebarOpen,
  } = useApp();
  const { navigateTo } = useRouter();

  const pendingListingsCount = listings.filter((l) => l.status === 'pending').length;
  const expiredListingsCount = listings.filter((l) => l.status === 'expired').length;
  const pendingKycCount = users.filter((u) => u.kycStatus === 'pending').length;
  const openReportsCount = reports.filter((r) => r.status === 'pending').length;

  // Track expanded sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    marketplace: true,
    users: true,
    moderation: true,
    commerce: false,
    advertising: false,
    email: true,
    communication: false,
    cms: false,
    seo: false,
    analytics: false,
    administration: false,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const menuSections = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      isDirect: true,
      tab: 'dashboard',
    },
    {
      id: 'paid-features',
      label: 'Paid Features',
      icon: Sparkles,
      isDirect: true,
      tab: 'paid-features',
    },
    {
      id: 'marketplace',
      label: 'Marketplace',
      icon: Store,
      children: [
        { tab: 'marketplace/listings', label: 'Listings', icon: ShoppingBag },
        {
          tab: 'marketplace/pending',
          label: 'Pending Listings',
          icon: Clock,
          badge: pendingListingsCount > 0 ? pendingListingsCount : undefined,
          badgeVariant: 'warning',
        },
        {
          tab: 'marketplace/expired',
          label: 'Expired Ads',
          icon: RotateCcw,
          badge: expiredListingsCount > 0 ? expiredListingsCount : undefined,
          badgeVariant: 'danger',
        },
        { tab: 'marketplace/categories', label: 'Categories', icon: Layers },
        { tab: 'marketplace/attributes', label: 'Attributes', icon: SlidersHorizontal },
        { tab: 'marketplace/locations', label: 'Locations', icon: MapPin },
        { tab: 'marketplace/featured', label: 'Featured Listings', icon: Star },
      ],
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
      children: [
        { tab: 'users/all', label: 'All Users', icon: Users },
        { tab: 'users/regular', label: 'Regular Users', icon: Users },
        { tab: 'users/businesses', label: 'Businesses', icon: Building },
        {
          tab: 'users/verification',
          label: 'Verification',
          icon: UserCheck,
          badge: pendingKycCount > 0 ? pendingKycCount : undefined,
          badgeVariant: 'warning',
        },
        { tab: 'users/banned', label: 'Banned Users', icon: UserX },
      ],
    },
    {
      id: 'moderation',
      label: 'Moderation',
      icon: ShieldCheck,
      children: [
        {
          tab: 'moderation/reports',
          label: 'Reports',
          icon: AlertOctagon,
          badge: openReportsCount > 0 ? openReportsCount : undefined,
          badgeVariant: 'danger',
        },
        { tab: 'moderation/spam', label: 'Spam', icon: Bot },
        { tab: 'moderation/fraud', label: 'Fraud Flags', icon: AlertTriangle },
        { tab: 'moderation/reviews', label: 'Reviews', icon: Star },
        { tab: 'moderation/rules', label: 'Moderation Rules', icon: Sliders },
      ],
    },
    {
      id: 'commerce',
      label: 'Commerce',
      icon: CreditCard,
      children: [
        { tab: 'paid-features', label: 'Paid Features Engine', icon: Sparkles },
        { tab: 'commerce/orders', label: 'Orders', icon: ShoppingBag },
        { tab: 'commerce/transactions', label: 'Transactions', icon: Receipt },
        { tab: 'commerce/subscriptions', label: 'Subscriptions', icon: Coins },
        { tab: 'commerce/packages', label: 'Packages', icon: Sparkles },
        { tab: 'commerce/coupons', label: 'Coupons', icon: Percent },
        { tab: 'commerce/refunds', label: 'Refunds', icon: RotateCcw },
        { tab: 'commerce/taxes', label: 'Taxes', icon: Receipt },
      ],
    },
    {
      id: 'advertising',
      label: 'Advertising',
      icon: Megaphone,
      children: [
        { tab: 'advertising/campaigns', label: 'Campaigns', icon: Megaphone },
        { tab: 'advertising/banners', label: 'Banners', icon: Share2 },
        { tab: 'advertising/sponsored', label: 'Sponsored Listings', icon: Star },
        { tab: 'advertising/advertisers', label: 'Advertisers', icon: Building },
      ],
    },
    {
      id: 'email',
      label: 'Email & Newsletter',
      icon: Mail,
      children: [
        { tab: 'email/dashboard', label: 'Email Dashboard', icon: LayoutDashboard },
        { tab: 'email/send', label: 'Send Newsletter', icon: Send },
        { tab: 'email/campaigns', label: 'Newsletter History', icon: Megaphone },
        { tab: 'email/templates', label: 'Email Templates', icon: FileText },
        { tab: 'email/settings', label: 'Email Settings', icon: Settings },
        { tab: 'email/logs', label: 'Email Logs / History', icon: History },
      ],
    },
    {
      id: 'communication',
      label: 'Communication',
      icon: MessageSquare,
      children: [
        { tab: 'communication/messages', label: 'Messages', icon: MessageSquare },
        { tab: 'communication/email', label: 'Email', icon: Mail },
        { tab: 'communication/sms', label: 'SMS', icon: Radio },
        { tab: 'communication/push', label: 'Push Notifications', icon: Send },
        { tab: 'communication/templates', label: 'Templates', icon: Bell },
      ],
    },
    {
      id: 'cms',
      label: 'CMS',
      icon: FileText,
      children: [
        { tab: 'cms/pages', label: 'Pages', icon: FileText },
        { tab: 'cms/blog', label: 'Blog', icon: FileText },
        { tab: 'cms/faq', label: 'FAQ', icon: FileText },
        { tab: 'cms/media', label: 'Media', icon: FileText },
        { tab: 'cms/menus', label: 'Menus', icon: Layers },
      ],
    },
    {
      id: 'seo',
      label: 'SEO',
      icon: Search,
      children: [
        { tab: 'seo/metadata', label: 'Metadata', icon: Search },
        { tab: 'seo/redirects', label: 'Redirects', icon: Share2 },
        { tab: 'seo/sitemap', label: 'Sitemap', icon: Globe },
        { tab: 'seo/templates', label: 'SEO Templates', icon: Code },
      ],
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      children: [
        { tab: 'analytics/marketplace', label: 'Marketplace', icon: BarChart3 },
        { tab: 'analytics/users', label: 'Users', icon: Users },
        { tab: 'analytics/listings', label: 'Listings', icon: ShoppingBag },
        { tab: 'analytics/revenue', label: 'Revenue', icon: CreditCard },
        { tab: 'analytics/reports', label: 'Reports', icon: FileText },
      ],
    },
    {
      id: 'administration',
      label: 'Administration',
      icon: Settings,
      children: [
        { tab: 'admin/users', label: 'Admin Users', icon: Users },
        { tab: 'admin/roles', label: 'Roles & Permissions', icon: KeyRound },
        { tab: 'admin/logs', label: 'Audit Logs', icon: History },
        { tab: 'admin/settings', label: 'System Settings', icon: Settings },
        { tab: 'admin/gateways', label: 'Payment Gateways', icon: Database },
        { tab: 'admin/integrations', label: 'Integrations', icon: Workflow },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none h-screen transform transition-transform duration-300 md:translate-x-0 md:static md:w-64 ${
          mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-slate-950 text-xl tracking-tighter shadow-md shadow-emerald-500/20">
            chillyads
          </div>
          <div>
            <div className="font-bold text-white text-sm tracking-tight flex items-center gap-1.5">
              Admin Suite
              <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                v2.4
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Chillyads Marketplace</div>
          </div>
        </div>
        <button
          onClick={() => setMobileSidebarOpen(false)}
          className="md:hidden p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
        {/* Quick Back to Live Site link above Dashboard */}
        <button
          type="button"
          onClick={() => {
            navigateTo('/');
            setMobileSidebarOpen(false);
          }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer shadow-xs mb-2 group"
          title="Return to the live public marketplace"
        >
          <div className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Back to Live Site</span>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-emerald-400/80" />
        </button>

        {menuSections.map((section) => {
          if (section.isDirect) {
            const isActive = activeSidebarTab === section.tab;
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => {
                  setActiveSidebarTab(section.tab!);
                  navigateTo('/admin/' + section.tab);
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{section.label}</span>
              </button>
            );
          }

          const isExpanded = !!expandedSections[section.id];
          const Icon = section.icon;
          const hasActiveChild = section.children?.some((c) => c.tab === activeSidebarTab);

          return (
            <div key={section.id} className="pt-1">
              <button
                onClick={() => toggleSection(section.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                  hasActiveChild
                    ? 'text-white bg-slate-800/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-slate-400" />
                  <span>{section.label}</span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {isExpanded && section.children && (
                <div className="mt-1 ml-3 pl-3 border-l border-slate-800/80 space-y-0.5">
                  {section.children.map((child) => {
                    const isChildActive = activeSidebarTab === child.tab;
                    const ChildIcon = child.icon;
                    return (
                      <button
                        key={child.tab}
                        onClick={() => {
                          setActiveSidebarTab(child.tab);
                          navigateTo('/admin/' + child.tab);
                          setMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          isChildActive
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <ChildIcon
                            className={`w-3.5 h-3.5 ${
                              isChildActive ? 'text-white' : 'text-slate-400'
                            }`}
                          />
                          <span className="truncate">{child.label}</span>
                        </div>
                        {child.badge !== undefined && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                              child.badgeVariant === 'danger'
                                ? 'bg-rose-500 text-white'
                                : 'bg-amber-500 text-slate-950 font-bold'
                            }`}
                          >
                            {child.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Log Out / Exit Admin Section */}
      <div className="p-3 border-t border-slate-800/80">
        <button
          onClick={() => navigateTo('/')}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm group"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-400 group-hover:text-white transition-colors" />
          <span>Log Out / Exit Admin</span>
        </button>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400 flex items-center justify-between">
        <div>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
          Cluster: in-mum-prod-01
        </div>
        <div className="font-mono text-[10px]">PHP 8.3 / L11</div>
      </div>
    </aside>
    </>
  );
};
