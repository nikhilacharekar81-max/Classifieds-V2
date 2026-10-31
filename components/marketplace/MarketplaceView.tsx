'use client';
import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Listing } from '@/lib/types';
import { calculateDistanceKm } from '@/lib/utils/distanceUtils';
import { isListingBoosted } from '@/lib/utils/boostHelper';
import {
  Search,
  MapPin,
  Heart,
  Plus,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  MessageCircle,
  Phone,
  Layers,
  ChevronDown,
  ChevronRight,
  X,
  Share2,
  Calendar,
  Sparkles,
  Rocket,
  ExternalLink,
  Shield,
  SlidersHorizontal,
  FolderTree,
  Grid,
  LayoutGrid,
  Car,
  Smartphone,
  Building2,
  Bike,
  Tv,
  Armchair,
  Briefcase,
  Shirt,
  Tag,
  Package,
  Wrench,
  Users,
  User,
  PawPrint,
  BookOpen,
  Navigation,
  Menu,
} from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { ImageWithFallback } from '@/components/common/ImageWithFallback';
import { navigateTo } from '@/lib/router/useRouter';
import { buildChillyUrl } from '@/lib/utils/seoAndUrlHelper';
import { CategoryDirectoryGrid } from './CategoryDirectoryGrid';
import { LocationSelectorInput } from './LocationSelectorInput';
import { CategorySubNavbar } from './CategorySubNavbar';
import { SeoContentBlock } from './SeoContentBlock';
import { Footer } from '@/components/common/Footer';

const ICONS_MAP: Record<string, React.FC<{ className?: string }>> = {
  Wrench,
  Car,
  Briefcase,
  Building2,
  Package,
  Users,
  Heart,
  PawPrint,
  Smartphone,
  Tv,
  Armchair,
  Bike,
  Shirt,
  BookOpen,
  Tag,
  Layers,
};

export const MarketplaceView: React.FC = () => {
  const {
    listings,
    categories,
    selectedMarketplaceCity,
    setSelectedMarketplaceCity,
    selectedMarketplaceCategory,
    setSelectedMarketplaceCategory,
    selectedMarketplaceSubcategory,
    setSelectedMarketplaceSubcategory,
    marketplaceSearch,
    setMarketplaceSearch,
    addToast,
    userLocation,
  } = useApp();

  // Category & Subcategory Directory Grid is the default view
  const [activeViewMode, setActiveViewMode] = useState<'listings' | 'directory'>('directory');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Properties filters states
  const [propTypeFilter, setPropTypeFilter] = useState<string>('all');
  const [propConfigFilter, setPropConfigFilter] = useState<string>('all');
  const [propStatusFilter, setPropStatusFilter] = useState<string>('all');
  const [propListedByFilter, setPropListedByFilter] = useState<string>('all');
  const [propFurnishingFilter, setPropFurnishingFilter] = useState<string>('all');
  const [propMinPriceFilter, setPropMinPriceFilter] = useState<string>('');
  const [propMaxPriceFilter, setPropMaxPriceFilter] = useState<string>('');
  const [propMinAreaFilter, setPropMinAreaFilter] = useState<string>('');
  const [propMaxAreaFilter, setPropMaxAreaFilter] = useState<string>('');

  // Rental specific filters states
  const [rentDepositMaxFilter, setRentDepositMaxFilter] = useState<string>('');
  const [rentBrokerageFilter, setRentBrokerageFilter] = useState<string>('all');
  const [rentTenantPrefFilter, setRentTenantPrefFilter] = useState<string>('all');
  const [rentAvailabilityFilter, setRentAvailabilityFilter] = useState<string>('all');
  const [rentPetsFilter, setRentPetsFilter] = useState<string>('all');

  // Synchronize view mode with active category selection
  React.useEffect(() => {
    if (selectedMarketplaceCategory !== 'all') {
      setActiveViewMode('listings');
    } else {
      setActiveViewMode('directory');
    }
  }, [selectedMarketplaceCategory, selectedMarketplaceSubcategory]);

  const rootCategories = categories.filter((c) => !c.parentId && c.isActive);
  const activeMainCat = categories.find((c) => c.id === selectedMarketplaceCategory);
  const currentSubcategories = activeMainCat
    ? categories.filter((c) => c.parentId === activeMainCat.id && c.isActive)
    : [];

  // Filter approved listings for public marketplace
  const marketplaceListings = listings.filter((l) => {
    if (l.status !== 'approved' && !l.isFeatured) return false;

    // Category & Subcategory Hierarchy Filter
    if (selectedMarketplaceCategory !== 'all') {
      if (selectedMarketplaceSubcategory !== 'all') {
        // Specific subcategory selected
        if (l.subcategoryId !== selectedMarketplaceSubcategory && l.categoryId !== selectedMarketplaceSubcategory) {
          return false;
        }
      } else {
        // Main category selected, accept either exact match on categoryId or any listing under subcategories
        const childSubIds = categories.filter((c) => c.parentId === selectedMarketplaceCategory).map((c) => c.id);
        const matchesMain = l.categoryId === selectedMarketplaceCategory;
        const matchesSub = l.subcategoryId ? childSubIds.includes(l.subcategoryId) : false;
        if (!matchesMain && !matchesSub) return false;
      }
    }

    // Properties specific advanced filters
    if (selectedMarketplaceCategory === 'cat_housing_realestate') {
      const attrs = l.customAttributes || {};
      
      if (propTypeFilter !== 'all' && attrs.property_type !== propTypeFilter) {
        return false;
      }
      if (propConfigFilter !== 'all' && attrs.configuration !== propConfigFilter) {
        return false;
      }
      if (propStatusFilter !== 'all' && attrs.property_status !== propStatusFilter) {
        return false;
      }
      if (propListedByFilter !== 'all' && attrs.listed_by !== propListedByFilter) {
        return false;
      }
      if (propFurnishingFilter !== 'all' && attrs.furnishing !== propFurnishingFilter) {
        return false;
      }
      if (propMinPriceFilter) {
        if (l.price < Number(propMinPriceFilter)) return false;
      }
      if (propMaxPriceFilter) {
        if (l.price > Number(propMaxPriceFilter)) return false;
      }
      if (propMinAreaFilter) {
        const area = Number(attrs.carpet_area || attrs.built_up_area || attrs.plot_area || 0);
        if (area < Number(propMinAreaFilter)) return false;
      }
      if (propMaxAreaFilter) {
        const area = Number(attrs.carpet_area || attrs.built_up_area || attrs.plot_area || 0);
        if (area > Number(propMaxAreaFilter)) return false;
      }

      // Rent-specific attributes filters
      if (selectedMarketplaceSubcategory === 'sub_house_apt_rent') {
        if (rentDepositMaxFilter) {
          const dep = Number(attrs.security_deposit || 0);
          if (dep > Number(rentDepositMaxFilter)) return false;
        }
        if (rentBrokerageFilter !== 'all' && attrs.brokerage !== rentBrokerageFilter) {
          return false;
        }
        if (rentTenantPrefFilter !== 'all' && attrs.tenant_preference !== rentTenantPrefFilter) {
          return false;
        }
        if (rentAvailabilityFilter !== 'all' && attrs.available_from !== rentAvailabilityFilter) {
          return false;
        }
        if (rentPetsFilter !== 'all' && attrs.pets_allowed !== rentPetsFilter) {
          return false;
        }
      }
    }

    if (selectedMarketplaceCity !== 'All India' && selectedMarketplaceCity !== 'All Cities') {
      const locCity = selectedMarketplaceCity.toLowerCase();
      const matchCity = l.location.city.toLowerCase().includes(locCity);
      if (!matchCity) {
        return false;
      }
    }

    if (marketplaceSearch.trim()) {
      const q = marketplaceSearch.toLowerCase();
      const matchTitle = l.title.toLowerCase().includes(q);
      const matchDesc = l.description.toLowerCase().includes(q);
      const matchCity = l.location.city.toLowerCase().includes(q);
      const matchLocality = l.location.locality?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCity && !matchLocality) return false;
    }

    return true;
  });

  // Sort by Boosted status first (active boosted ads at top), then featured, then distance or newest first
  const sortedMarketplaceListings = [...marketplaceListings].sort((a, b) => {
    // 1. Active Boosted Priority (server-authoritative: boost_status = active AND boost_expires_at > current_time)
    const aBoosted = isListingBoosted(a);
    const bBoosted = isListingBoosted(b);
    if (aBoosted && !bBoosted) return -1;
    if (!aBoosted && bBoosted) return 1;

    // 2. Featured priority
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;

    // 3. Distance sorting if user location is set
    if (userLocation) {
      const distA = a.location.latitude && a.location.longitude 
        ? calculateDistanceKm(userLocation.latitude, userLocation.longitude, a.location.latitude, a.location.longitude) 
        : 9999;
      const distB = b.location.latitude && b.location.longitude 
        ? calculateDistanceKm(userLocation.latitude, userLocation.longitude, b.location.latitude, b.location.longitude) 
        : 9999;
      return distA - distB;
    }

    // 4. Chronological sorting (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Filter and sort for the "Latest Ads" section under directory
  const latestAds = useMemo(() => {
    // Filter active/approved ads
    let filtered = listings.filter((l) => l.status === 'approved' || l.isFeatured);

    // Filter by selected city if any
    if (selectedMarketplaceCity !== 'All India' && selectedMarketplaceCity !== 'All Cities') {
      const locCity = selectedMarketplaceCity.toLowerCase();
      filtered = filtered.filter((l) => l.location.city.toLowerCase().includes(locCity));
    }

    // Sort: Featured ads first, then newest first
    return filtered.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }).slice(0, 10);
  }, [listings, selectedMarketplaceCity]);

  const getCategoryIcon = (iconName?: string) => {
    const IconComp = (iconName && ICONS_MAP[iconName]) || Layers;
    return IconComp;
  };

  const getCategoryName = (catId?: string, subId?: string) => {
    if (subId) {
      const sub = categories.find((c) => c.id === subId);
      if (sub) return sub.name;
    }
    if (catId) {
      const cat = categories.find((c) => c.id === catId);
      if (cat) return cat.name;
    }
    return '';
  };

  const handleDirectorySelectCategory = (catId: string) => {
    setSelectedMarketplaceCategory(catId);
    setSelectedMarketplaceSubcategory('all');
    setActiveViewMode('listings');
    const cat = categories.find((c) => c.id === catId);
    const targetUrl = buildChillyUrl({
      city: selectedMarketplaceCity,
      categoryId: catId,
      subcategoryId: 'all',
      categories,
    });
    navigateTo(targetUrl);
    addToast({
      type: 'info',
      title: `${cat?.name || 'Category'} Selected`,
      message: `Browsing listings under ${cat?.name}.`,
    });
  };

  const handleDirectorySelectSubcategory = (catId: string, subId: string) => {
    setSelectedMarketplaceCategory(catId);
    setSelectedMarketplaceSubcategory(subId);
    setActiveViewMode('listings');
    const sub = categories.find((c) => c.id === subId);
    const targetUrl = buildChillyUrl({
      city: selectedMarketplaceCity,
      categoryId: catId,
      subcategoryId: subId,
      categories,
    });
    navigateTo(targetUrl);
    addToast({
      type: 'success',
      title: `${sub?.name || 'Subcategory'} Selected`,
      message: `Filtering listings by ${sub?.name}.`,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans overflow-x-hidden">
      {/* Top Notification Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-6 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>India’s Leading Real-Time Classifieds Marketplace</span>
          <span className="hidden md:inline text-slate-500">•</span>
          <span className="hidden md:inline text-slate-400">
            Over 2,40,000+ verified active listings across 500+ Indian cities
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo('/admin/dashboard')}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-xs transition-colors cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5" /> Back to Admin Panel
          </button>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          {/* Desktop & Top Mobile Bar */}
          <div className="flex items-center justify-between gap-4">
            {/* Logo & Mobile Menu Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="sm:hidden p-2 text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Open Chillyads Menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <button
                onClick={() => {
                  setSelectedMarketplaceCategory('all');
                  setSelectedMarketplaceSubcategory('all');
                  setMarketplaceSearch('');
                  setActiveViewMode('directory');
                  navigateTo('/');
                }}
                className="w-12 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center font-black text-2xl tracking-tighter cursor-pointer hover:bg-slate-800 transition-colors"
              >
                chillyads
              </button>

              {/* Typeable Location Selector (Desktop) */}
              <div className="hidden sm:block">
                <LocationSelectorInput />
              </div>
            </div>

            {/* Search Bar (Desktop View) */}
            <div className="hidden sm:flex flex-1 max-w-2xl relative">
              <input
                type="text"
                value={marketplaceSearch}
                onChange={(e) => setMarketplaceSearch(e.target.value)}
                placeholder="Find Cars, Mobile Phones, Apartments, Bikes and more..."
                className="w-full text-xs rounded-xl border-2 border-slate-900 pl-4 pr-10 py-2.5 focus:outline-none placeholder:text-slate-400 font-medium"
              />
              <button
                onClick={() => navigateTo(`/search?q=${encodeURIComponent(marketplaceSearch)}`)}
                className="absolute right-1 top-1 bottom-1 px-3 bg-slate-900 text-white rounded-lg flex items-center justify-center hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* Actions: My Account & SELL Button */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => navigateTo('/my-account')}
                className="px-3 py-2 text-slate-800 hover:text-blue-600 font-extrabold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-300 rounded-xl hover:bg-slate-100"
                title="User Account & Ads Panel"
              >
                <User className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">My Account</span>
              </button>

              <button
                onClick={() => navigateTo('/post')}
                className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 border-2 border-slate-950 transition-all uppercase tracking-wider cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> <span className="hidden xs:inline">+</span> SELL
              </button>
            </div>
          </div>

          {/* Mobile Search Box (Below Logo & Top Bar on Mobile View) */}
          <div className="sm:hidden mt-3 relative">
            <input
              type="text"
              value={marketplaceSearch}
              onChange={(e) => setMarketplaceSearch(e.target.value)}
              placeholder="Find Cars, Mobiles, Bikes, Properties..."
              className="w-full text-xs rounded-xl border-2 border-slate-900 pl-4 pr-10 py-2.5 focus:outline-none placeholder:text-slate-400 font-medium bg-slate-50"
            />
            <button
              onClick={() => navigateTo(`/search?q=${encodeURIComponent(marketplaceSearch)}`)}
              className="absolute right-1 top-1 bottom-1 px-3 bg-slate-900 text-white rounded-lg flex items-center justify-center hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Location Selector Bar */}
        <div className="sm:hidden px-4 pb-2.5 pt-1 border-t border-slate-100">
          <LocationSelectorInput className="w-full" />
        </div>
      </header>

      {/* OLX Style Horizontal Category Sub-Navbar with "ALL CATEGORIES" dropdown */}
      <CategorySubNavbar
        currentCity={selectedMarketplaceCity}
        activeCategoryId={selectedMarketplaceCategory}
        activeSubcategoryId={selectedMarketplaceSubcategory}
      />

      {/* Chillyads Mobile Drop Menu / Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Slide-out Menu Panel */}
          <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl z-10 flex flex-col animate-in slide-in-from-left duration-300">
            {/* Drawer Header */}
            <div className="p-4 bg-slate-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl tracking-tighter">
                  chillyads
                </div>
                <div>
                  <h3 className="text-sm font-bold">Welcome to Chillyads</h3>
                  <p className="text-[11px] text-slate-400">India’s Marketplace</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Navigation Links */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setSelectedMarketplaceCategory('all');
                    setSelectedMarketplaceSubcategory('all');
                    setActiveViewMode('directory');
                    setMobileMenuOpen(false);
                    navigateTo('/');
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <FolderTree className="w-4 h-4 text-blue-600" />
                  <span>All Categories Directory</span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigateTo('/post');
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-extrabold text-amber-900 bg-amber-50 hover:bg-amber-100 flex items-center gap-3 transition-colors cursor-pointer border border-amber-200"
                >
                  <Plus className="w-4 h-4 text-amber-600" />
                  <span>Post Free Ad (+ SELL)</span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigateTo('/my-account');
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>My Account & Saved Ads</span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigateTo('/admin/dashboard');
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-purple-600" />
                  <span>Admin Panel & Moderation</span>
                </button>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
                  Browse Categories
                </h4>
                <div className="space-y-1">
                  {rootCategories.map((cat) => {
                    const IconComponent = ICONS_MAP[cat.icon || 'Tag'] || Tag;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSelectedMarketplaceCategory(cat.id);
                          setSelectedMarketplaceSubcategory('all');
                          setActiveViewMode('listings');
                          setMobileMenuOpen(false);
                          const targetUrl = buildChillyUrl({
                            city: selectedMarketplaceCity,
                            categoryId: cat.id,
                            subcategoryId: 'all',
                            categories,
                          });
                          navigateTo(targetUrl);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-3 transition-colors cursor-pointer"
                      >
                        <div className="p-1.5 rounded-lg bg-slate-100 text-slate-800">
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Properties Advanced Filters */}
              {selectedMarketplaceCategory === 'cat_housing_realestate' && (
                <div className="border-t border-slate-200 pt-3 space-y-3">
                  <div className="flex items-center justify-between px-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Property Filters
                    </h4>
                    {(propTypeFilter !== 'all' || 
                      propConfigFilter !== 'all' || 
                      propStatusFilter !== 'all' || 
                      propListedByFilter !== 'all' || 
                      propFurnishingFilter !== 'all' || 
                      propMinPriceFilter || 
                      propMaxPriceFilter || 
                      propMinAreaFilter || 
                      propMaxAreaFilter ||
                      rentDepositMaxFilter ||
                      rentBrokerageFilter !== 'all' ||
                      rentTenantPrefFilter !== 'all' ||
                      rentAvailabilityFilter !== 'all' ||
                      rentPetsFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setPropTypeFilter('all');
                          setPropConfigFilter('all');
                          setPropStatusFilter('all');
                          setPropListedByFilter('all');
                          setPropFurnishingFilter('all');
                          setPropMinPriceFilter('');
                          setPropMaxPriceFilter('');
                          setPropMinAreaFilter('');
                          setPropMaxAreaFilter('');
                          setRentDepositMaxFilter('');
                          setRentBrokerageFilter('all');
                          setRentTenantPrefFilter('all');
                          setRentAvailabilityFilter('all');
                          setRentPetsFilter('all');
                        }}
                        className="text-[10px] font-bold text-rose-600 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="px-3 space-y-3">
                    {/* Property Type Dropdown */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Property Type</label>
                      <select
                        value={propTypeFilter}
                        onChange={(e) => setPropTypeFilter(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                      >
                        <option value="all">All Types</option>
                        <option value="Apartment / Flat">Apartment / Flat</option>
                        <option value="Independent House">Independent House</option>
                        <option value="Villa">Villa</option>
                        <option value="Builder Floor">Builder Floor</option>
                        <option value="Studio Apartment">Studio Apartment</option>
                        <option value="Penthouse">Penthouse</option>
                        <option value="Duplex">Duplex</option>
                        <option value="Triplex">Triplex</option>
                        <option value="Farm House">Farm House</option>
                        <option value="Row House / Townhouse">Row House / Townhouse</option>
                      </select>
                    </div>

                    {/* BHK Configuration Button Group */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Configuration</label>
                      <div className="grid grid-cols-4 gap-1">
                        {['all', '1 RK', '1 BHK', '2 BHK', '3 BHK', '4 BHK', '5 BHK', '6+ BHK'].map((cfg) => {
                          const isSel = propConfigFilter === cfg;
                          return (
                            <button
                              key={cfg}
                              onClick={() => setPropConfigFilter(cfg)}
                              className={`p-1 rounded-lg text-[10px] font-bold text-center border cursor-pointer transition-colors ${
                                isSel
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-slate-50 text-slate-700 border-slate-200'
                              }`}
                            >
                              {cfg === 'all' ? 'All' : cfg.split(' ')[0]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Price Range */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Price (₹)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          value={propMinPriceFilter}
                          onChange={(e) => setPropMinPriceFilter(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 px-2 text-xs font-semibold"
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          value={propMaxPriceFilter}
                          onChange={(e) => setPropMaxPriceFilter(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 px-2 text-xs font-semibold"
                        />
                      </div>
                    </div>

                    {/* Furnishing */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Furnishing</label>
                      <select
                        value={propFurnishingFilter}
                        onChange={(e) => setPropFurnishingFilter(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold"
                      >
                        <option value="all">Any Furnishing</option>
                        <option value="Furnished">Furnished</option>
                        <option value="Semi Furnished">Semi Furnished</option>
                        <option value="Unfurnished">Unfurnished</option>
                      </select>
                    </div>

                    {selectedMarketplaceSubcategory === 'sub_house_apt_rent' && (
                      <div className="space-y-3 pt-2 border-t border-slate-200">
                        <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Rent Specific Options</div>
                        
                        {/* Security Deposit Max */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Max Deposit (₹)</label>
                          <input
                            type="number"
                            placeholder="Any Amount"
                            value={rentDepositMaxFilter}
                            onChange={(e) => setRentDepositMaxFilter(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold"
                          />
                        </div>

                        {/* Brokerage select */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Brokerage</label>
                          <select
                            value={rentBrokerageFilter}
                            onChange={(e) => setRentBrokerageFilter(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold"
                          >
                            <option value="all">Any Brokerage</option>
                            <option value="No Brokerage">No Brokerage</option>
                            <option value="15 Days Rent">15 Days Rent</option>
                            <option value="1 Month Rent">1 Month Rent</option>
                            <option value="2 Months Rent">2 Months Rent</option>
                            <option value="Custom / Fixed Fee">Custom / Fixed Fee</option>
                          </select>
                        </div>

                        {/* Tenant Preference */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tenant Preference</label>
                          <select
                            value={rentTenantPrefFilter}
                            onChange={(e) => setRentTenantPrefFilter(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold"
                          >
                            <option value="all">Any Preference</option>
                            <option value="Anyone">Anyone</option>
                            <option value="Families Only">Families Only</option>
                            <option value="Bachelors Only">Bachelors Only</option>
                            <option value="Working Professionals">Working Professionals</option>
                            <option value="Females Only">Females Only</option>
                            <option value="Males Only">Males Only</option>
                          </select>
                        </div>

                        {/* Available From */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available From</label>
                          <select
                            value={rentAvailabilityFilter}
                            onChange={(e) => setRentAvailabilityFilter(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold"
                          >
                            <option value="all">Any Availability</option>
                            <option value="Immediate">Immediate</option>
                            <option value="Within 15 Days">Within 15 Days</option>
                            <option value="Within 30 Days">Within 30 Days</option>
                            <option value="Custom Date">Custom Date</option>
                          </select>
                        </div>

                        {/* Pets Allowed */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pets Allowed</label>
                          <select
                            value={rentPetsFilter}
                            onChange={(e) => setRentPetsFilter(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold"
                          >
                            <option value="all">Any Choice</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                            <option value="Cats Only">Cats Only</option>
                            <option value="Dogs Only">Dogs Only</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 text-center">
              <p className="text-[11px] text-slate-500 font-medium">Chillyads Classifieds India • v2.5</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Classifieds Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 space-y-6">
        {/* Directory Grid View (Default) */}
        {activeViewMode === 'directory' ? (
          <div className="space-y-10 animate-in fade-in duration-200">
            <CategoryDirectoryGrid
              categories={categories}
              selectedCategoryId={selectedMarketplaceCategory}
              selectedSubcategoryId={selectedMarketplaceSubcategory}
              onSelectCategory={handleDirectorySelectCategory}
              onSelectSubcategory={handleDirectorySelectSubcategory}
            />

            {/* Latest Ads Section */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>Latest Ads {selectedMarketplaceCity !== 'All India' && selectedMarketplaceCity !== 'All Cities' && `in ${selectedMarketplaceCity}`}</span>
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Freshly posted ads, with featured listings highlighted on top (maximum 10 ads)
                  </p>
                </div>
              </div>

              {latestAds.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-8 text-center text-slate-500">
                  <p className="text-xs font-semibold">No active ads posted in this city yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {latestAds.map((listing: Listing) => {
                    const subName = getCategoryName(listing.categoryId, listing.subcategoryId);
                    return (
                      <div
                        key={listing.id}
                        onClick={() => navigateTo(buildChillyUrl({ listing, categories }))}
                        className="bg-white rounded-xl border border-slate-200 hover:border-slate-400 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group relative"
                      >
                        <div className="relative">
                          <ImageWithFallback
                            src={listing.images[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&auto=format&fit=crop&q=80'}
                            alt={listing.title}
                            categoryId={listing.categoryId}
                            className="w-full h-36 object-cover group-hover:scale-[1.02] transition-transform duration-200"
                          />
                          {listing.isFeatured && (
                            <span className="absolute top-2 left-2 bg-amber-500 text-white font-extrabold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                              <Sparkles className="w-2 h-2 fill-white text-white" />
                              <span>Featured</span>
                            </span>
                          )}
                        </div>

                        <div className="p-3.5 space-y-1.5 flex-1 flex flex-col justify-between">
                          <div className="space-y-1">
                            <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider block truncate">
                              {subName || 'Classified'}
                            </span>
                            <h3 className="font-extrabold text-xs text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1" title={listing.title}>
                              {listing.title}
                            </h3>
                            <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{listing.location.locality ? `${listing.location.locality}, ` : ''}{listing.location.city}</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 mt-auto">
                            <span className="text-xs font-black text-slate-900">
                              ₹{listing.price.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium shrink-0">
                              {new Date(listing.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Listings Section (when category/subcategory is selected or user searches) */
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in duration-200">
            {/* Desktop Only Category and Subcategory Sidebar */}
            <div className="hidden md:block md:col-span-1 space-y-4 self-start">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-2.5">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">All Categories</h3>
                </div>
                <div className="space-y-1">
                  {/* Reset to Directory Option */}
                  <button
                    onClick={() => {
                      setActiveViewMode('directory');
                      setSelectedMarketplaceCategory('all');
                      setSelectedMarketplaceSubcategory('all');
                      navigateTo(buildChillyUrl({ city: selectedMarketplaceCity, categories }));
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer hover:bg-slate-50 text-slate-500`}
                  >
                    <FolderTree className="w-4 h-4 text-slate-400" />
                    <span>All Categories Directory</span>
                  </button>

                  {rootCategories.map((cat) => {
                    const IconComponent = ICONS_MAP[cat.icon || 'Tag'] || Tag;
                    const isSelected = selectedMarketplaceCategory === cat.id;
                    const childSubs = categories.filter((c) => c.parentId === cat.id && c.isActive);

                    return (
                      <div key={cat.id} className="space-y-1">
                        <button
                          onClick={() => {
                            setSelectedMarketplaceCategory(cat.id);
                            setSelectedMarketplaceSubcategory('all');
                            setActiveViewMode('listings');
                            const targetUrl = buildChillyUrl({
                              city: selectedMarketplaceCity,
                              categoryId: cat.id,
                              subcategoryId: 'all',
                              categories,
                            });
                            navigateTo(targetUrl);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 text-blue-700 shadow-xs'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1 rounded-lg ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                              <IconComponent className="w-3.5 h-3.5" />
                            </div>
                            <span>{cat.name}</span>
                          </div>
                          {childSubs.length > 0 && (
                            <ChevronDown className={`w-3 h-3 transition-transform ${isSelected ? 'rotate-180 text-blue-500' : 'text-slate-400'}`} />
                          )}
                        </button>

                        {/* Nested Subcategories List if Parent Category is Selected */}
                        {isSelected && childSubs.length > 0 && (
                          <div className="pl-6 pr-2 py-1 space-y-1 border-l-2 border-slate-100 ml-5 animate-in slide-in-from-top-1 duration-150">
                            <button
                              onClick={() => {
                                setSelectedMarketplaceSubcategory('all');
                                setActiveViewMode('listings');
                                const targetUrl = buildChillyUrl({
                                  city: selectedMarketplaceCity,
                                  categoryId: cat.id,
                                  subcategoryId: 'all',
                                  categories,
                                });
                                navigateTo(targetUrl);
                              }}
                              className={`w-full text-left py-1 text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                                selectedMarketplaceSubcategory === 'all'
                                  ? 'text-blue-600 font-bold'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                              <span>All in {cat.name}</span>
                            </button>

                            {childSubs.map((sub) => {
                              const isSubSelected = selectedMarketplaceSubcategory === sub.id;
                              return (
                                <button
                                  key={sub.id}
                                  onClick={() => {
                                    setSelectedMarketplaceSubcategory(sub.id);
                                    setActiveViewMode('listings');
                                    const targetUrl = buildChillyUrl({
                                      city: selectedMarketplaceCity,
                                      categoryId: cat.id,
                                      subcategoryId: sub.id,
                                      categories,
                                    });
                                    navigateTo(targetUrl);
                                  }}
                                  className={`w-full text-left py-1 text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                                    isSubSelected
                                      ? 'text-blue-600 font-bold'
                                      : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${isSubSelected ? 'bg-blue-600' : 'bg-slate-300'}`} />
                                  <span>{sub.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Properties Advanced Filters Panel */}
              {selectedMarketplaceCategory === 'cat_housing_realestate' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4 animate-in fade-in duration-200">
                  <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Property Filters</h3>
                    </div>
                    {(propTypeFilter !== 'all' || 
                      propConfigFilter !== 'all' || 
                      propStatusFilter !== 'all' || 
                      propListedByFilter !== 'all' || 
                      propFurnishingFilter !== 'all' || 
                      propMinPriceFilter || 
                      propMaxPriceFilter || 
                      propMinAreaFilter || 
                      propMaxAreaFilter ||
                      rentDepositMaxFilter ||
                      rentBrokerageFilter !== 'all' ||
                      rentTenantPrefFilter !== 'all' ||
                      rentAvailabilityFilter !== 'all' ||
                      rentPetsFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setPropTypeFilter('all');
                          setPropConfigFilter('all');
                          setPropStatusFilter('all');
                          setPropListedByFilter('all');
                          setPropFurnishingFilter('all');
                          setPropMinPriceFilter('');
                          setPropMaxPriceFilter('');
                          setPropMinAreaFilter('');
                          setPropMaxAreaFilter('');
                          setRentDepositMaxFilter('');
                          setRentBrokerageFilter('all');
                          setRentTenantPrefFilter('all');
                          setRentAvailabilityFilter('all');
                          setRentPetsFilter('all');
                        }}
                        className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                      >
                        Reset All
                      </button>
                    )}
                  </div>

                  {/* Property Type Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Property Type</label>
                    <select
                      value={propTypeFilter}
                      onChange={(e) => setPropTypeFilter(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors cursor-pointer"
                    >
                      <option value="all">All Types</option>
                      <option value="Apartment / Flat">Apartment / Flat</option>
                      <option value="Independent House">Independent House</option>
                      <option value="Villa">Villa</option>
                      <option value="Builder Floor">Builder Floor</option>
                      <option value="Studio Apartment">Studio Apartment</option>
                      <option value="Penthouse">Penthouse</option>
                      <option value="Duplex">Duplex</option>
                      <option value="Triplex">Triplex</option>
                      <option value="Farm House">Farm House</option>
                      <option value="Row House / Townhouse">Row House / Townhouse</option>
                    </select>
                  </div>

                  {/* BHK Configuration Button Group */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Configuration</label>
                    <div className="grid grid-cols-4 gap-1">
                      {['all', '1 RK', '1 BHK', '2 BHK', '3 BHK', '4 BHK', '5 BHK', '6+ BHK'].map((cfg) => {
                        const isSel = propConfigFilter === cfg;
                        return (
                          <button
                            key={cfg}
                            onClick={() => setPropConfigFilter(cfg)}
                            className={`p-1 rounded-lg text-[10px] font-bold text-center border cursor-pointer transition-colors ${
                              isSel
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {cfg === 'all' ? 'All' : cfg}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Price Range */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Price Range (₹)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                        <input
                          type="number"
                          placeholder="Min"
                          value={propMinPriceFilter}
                          onChange={(e) => setPropMinPriceFilter(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-5 pr-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                        <input
                          type="number"
                          placeholder="Max"
                          value={propMaxPriceFilter}
                          onChange={(e) => setPropMaxPriceFilter(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-5 pr-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Area Range (Sq. Ft.) */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Area (Sq. Ft.)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Min Area"
                        value={propMinAreaFilter}
                        onChange={(e) => setPropMinAreaFilter(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors"
                      />
                      <input
                        type="number"
                        placeholder="Max Area"
                        value={propMaxAreaFilter}
                        onChange={(e) => setPropMaxAreaFilter(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* More Filters Selectors */}
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Furnishing</label>
                      <select
                        value={propFurnishingFilter}
                        onChange={(e) => setPropFurnishingFilter(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors cursor-pointer"
                      >
                        <option value="all">Any Furnishing</option>
                        <option value="Furnished">Furnished</option>
                        <option value="Semi Furnished">Semi Furnished</option>
                        <option value="Unfurnished">Unfurnished</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Property Status</label>
                      <select
                        value={propStatusFilter}
                        onChange={(e) => setPropStatusFilter(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors cursor-pointer"
                      >
                        <option value="all">Any Status</option>
                        <option value="Ready to Move">Ready to Move</option>
                        <option value="Under Construction">Under Construction</option>
                        <option value="New Property">New Property</option>
                        <option value="Resale Property">Resale Property</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Listed By</label>
                      <select
                        value={propListedByFilter}
                        onChange={(e) => setPropListedByFilter(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors cursor-pointer"
                      >
                        <option value="all">Any Lister</option>
                        <option value="Owner">Owner</option>
                        <option value="Dealer / Agent">Dealer / Agent</option>
                        <option value="Builder / Developer">Builder / Developer</option>
                      </select>
                    </div>

                    {selectedMarketplaceSubcategory === 'sub_house_apt_rent' && (
                      <div className="space-y-3 pt-3 border-t border-slate-100 animate-in fade-in duration-200">
                        <div className="border-b border-slate-100 pb-1 flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">Rent Specific Options</span>
                        </div>
                        
                        {/* Security Deposit Max */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Max Security Deposit</label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                            <input
                              type="number"
                              placeholder="Any Amount"
                              value={rentDepositMaxFilter}
                              onChange={(e) => setRentDepositMaxFilter(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-5 pr-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors"
                            />
                          </div>
                        </div>

                        {/* Brokerage select */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Brokerage</label>
                          <select
                            value={rentBrokerageFilter}
                            onChange={(e) => setRentBrokerageFilter(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors cursor-pointer"
                          >
                            <option value="all">Any Brokerage</option>
                            <option value="No Brokerage">No Brokerage</option>
                            <option value="15 Days Rent">15 Days Rent</option>
                            <option value="1 Month Rent">1 Month Rent</option>
                            <option value="2 Months Rent">2 Months Rent</option>
                            <option value="Custom / Fixed Fee">Custom / Fixed Fee</option>
                          </select>
                        </div>

                        {/* Tenant Preference */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Tenant Preference</label>
                          <select
                            value={rentTenantPrefFilter}
                            onChange={(e) => setRentTenantPrefFilter(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors cursor-pointer"
                          >
                            <option value="all">Any Preference</option>
                            <option value="Anyone">Anyone</option>
                            <option value="Families Only">Families Only</option>
                            <option value="Bachelors Only">Bachelors Only</option>
                            <option value="Working Professionals">Working Professionals</option>
                            <option value="Females Only">Females Only</option>
                            <option value="Males Only">Males Only</option>
                          </select>
                        </div>

                        {/* Available From */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Available From</label>
                          <select
                            value={rentAvailabilityFilter}
                            onChange={(e) => setRentAvailabilityFilter(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors cursor-pointer"
                          >
                            <option value="all">Any Availability</option>
                            <option value="Immediate">Immediate</option>
                            <option value="Within 15 Days">Within 15 Days</option>
                            <option value="Within 30 Days">Within 30 Days</option>
                            <option value="Custom Date">Custom Date</option>
                          </select>
                        </div>

                        {/* Pets Allowed */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pets Allowed</label>
                          <select
                            value={rentPetsFilter}
                            onChange={(e) => setRentPetsFilter(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors cursor-pointer"
                          >
                            <option value="all">Any Choice</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                            <option value="Cats Only">Cats Only</option>
                            <option value="Dogs Only">Dogs Only</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Main Listings Column */}
            <div className="md:col-span-3 space-y-6">
              {/* Active Filter Header and Breadcrumb with Return to Directory Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  <button
                    onClick={() => {
                      setActiveViewMode('directory');
                      setSelectedMarketplaceCategory('all');
                      setSelectedMarketplaceSubcategory('all');
                      navigateTo(buildChillyUrl({ city: selectedMarketplaceCity, categories }));
                    }}
                    className="flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Categories Directory</span>
                  </button>

                  {activeMainCat && (
                    <>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                      <button
                        onClick={() => {
                          setSelectedMarketplaceCategory(activeMainCat.id);
                          setSelectedMarketplaceSubcategory('all');
                          const targetUrl = buildChillyUrl({
                            city: selectedMarketplaceCity,
                            categoryId: activeMainCat.id,
                            subcategoryId: 'all',
                            categories,
                          });
                          navigateTo(targetUrl);
                        }}
                        className={`hover:text-blue-600 font-medium cursor-pointer ${
                          selectedMarketplaceSubcategory === 'all' ? 'text-slate-900 font-bold' : ''
                        }`}
                      >
                        {activeMainCat.name}
                      </button>
                    </>
                  )}

                  {selectedMarketplaceSubcategory !== 'all' && (
                    <>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                      <span className="font-bold text-blue-600">
                        {categories.find((c) => c.id === selectedMarketplaceSubcategory)?.name}
                      </span>
                    </>
                  )}
                </div>

                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {selectedMarketplaceSubcategory !== 'all'
                    ? categories.find((c) => c.id === selectedMarketplaceSubcategory)?.name
                    : activeMainCat
                    ? activeMainCat.name
                    : 'Search Results'}{' '}
                  in {selectedMarketplaceCity}
                </h2>
                <p className="text-xs text-slate-500">
                  Showing {marketplaceListings.length} verified listings
                </p>
              </div>

              {/* Action buttons on right */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => {
                    setActiveViewMode('directory');
                    setSelectedMarketplaceCategory('all');
                    setSelectedMarketplaceSubcategory('all');
                    navigateTo(buildChillyUrl({ city: selectedMarketplaceCity, categories }));
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FolderTree className="w-3.5 h-3.5 text-blue-600" />
                  <span>All Categories</span>
                </button>

                {(selectedMarketplaceCategory !== 'all' || selectedMarketplaceCity !== 'All India' || marketplaceSearch) && (
                  <button
                    onClick={() => {
                      setSelectedMarketplaceCategory('all');
                      setSelectedMarketplaceSubcategory('all');
                      setSelectedMarketplaceCity('All India');
                      setMarketplaceSearch('');
                      setActiveViewMode('directory');
                      navigateTo('/');
                    }}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Clear All Filters
                  </button>
                )}
              </div>
            </div>

          {/* Listings Grid */}
          {sortedMarketplaceListings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900">No Listings Found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No ads matched your active subcategory or search filters in {selectedMarketplaceCity}. Try selecting a different subcategory or post the first ad!
              </p>
              <button
                onClick={() => navigateTo('/post')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow cursor-pointer transition-colors"
              >
                Post an Ad in this Subcategory
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sortedMarketplaceListings.map((listing) => {
                const subName = getCategoryName(listing.categoryId, listing.subcategoryId);
                const distanceKm = userLocation && listing.location.latitude && listing.location.longitude
                  ? calculateDistanceKm(userLocation.latitude, userLocation.longitude, listing.location.latitude, listing.location.longitude)
                  : null;

                return (
                  <div
                    key={listing.id}
                    onClick={() => navigateTo(buildChillyUrl({ listing, categories }))}
                    className="bg-white rounded-xl border border-slate-200 hover:border-slate-400 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div className="relative">
                      <ImageWithFallback
                        src={listing.images[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&auto=format&fit=crop&q=80'}
                        alt={listing.title}
                        categoryId={listing.categoryId}
                        className="w-full h-44 object-cover group-hover:scale-[1.02] transition-transform duration-200"
                      />
                      {isListingBoosted(listing) && (
                        <div className="absolute top-2 left-2 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-md flex items-center gap-1 uppercase tracking-wider z-10 ring-1 ring-white/30">
                          <Rocket className="w-3 h-3 text-amber-300 fill-amber-300" /> BOOSTED
                        </div>
                      )}
                      {listing.isFeatured && !isListingBoosted(listing) && (
                        <div className="absolute top-2 left-2 bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded shadow flex items-center gap-1 uppercase">
                          <Sparkles className="w-3 h-3" /> FEATURED
                        </div>
                      )}
                      {listing.isFeatured && isListingBoosted(listing) && (
                        <div className="absolute top-8 left-2 bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded shadow flex items-center gap-1 uppercase z-10">
                          <Sparkles className="w-2.5 h-2.5" /> FEATURED
                        </div>
                      )}
                      {subName && (
                        <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded">
                          {subName}
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToast({
                            type: 'info',
                            title: 'Saved to Favorites',
                            message: `"${listing.title}" saved to your watchlist.`,
                          });
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 hover:bg-white text-slate-700 hover:text-rose-500 transition-colors shadow cursor-pointer"
                      >
                        <Heart className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        {distanceKm !== null && (
                          <div className="mb-1.5 text-[11px] font-bold text-blue-600 flex items-center gap-1 bg-blue-50/80 px-2 py-0.5 rounded-md">
                            <Navigation className="w-3 h-3 text-blue-600 shrink-0" />
                            <span>{distanceKm} km away • {listing.location.locality || listing.location.city}</span>
                          </div>
                        )}

                         <div className="text-lg font-black text-slate-950 flex items-baseline gap-1">
                          <span>₹{listing.price.toLocaleString('en-IN')}</span>
                          {(listing.subcategoryId === 'sub_house_apt_rent' || 
                            listing.subcategoryId === 'sub_house_shops_rent' || 
                            listing.subcategoryId === 'sub_house_pg_guest' ||
                            listing.title.toLowerCase().includes('for rent') ||
                            listing.title.toLowerCase().includes('rental')
                          ) && (
                            <span className="text-xs font-bold text-slate-500">/ month</span>
                          )}
                        </div>

                        {/* Dynamic Attributes Chips */}
                        {listing.customAttributes && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {listing.customAttributes.year && (
                              <span className="text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                {String(listing.customAttributes.year)}
                              </span>
                            )}
                            {listing.customAttributes.km_driven && (
                              <span className="text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                {Number(listing.customAttributes.km_driven).toLocaleString()} km
                              </span>
                            )}
                            {listing.customAttributes.fuel && (
                              <span className="text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                {String(listing.customAttributes.fuel)}
                              </span>
                            )}
                            {listing.customAttributes.storage && (
                              <span className="text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                {String(listing.customAttributes.storage)}
                              </span>
                            )}
                            {listing.customAttributes.bhk && (
                              <span className="text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                {String(listing.customAttributes.bhk)}
                              </span>
                            )}
                            {listing.customAttributes.property_type && (
                              <span className="text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                {String(listing.customAttributes.property_type)}
                              </span>
                            )}
                            {listing.customAttributes.configuration && (
                              <span className="text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                {String(listing.customAttributes.configuration)}
                              </span>
                            )}
                            {listing.customAttributes.furnishing && (
                              <span className="text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                {String(listing.customAttributes.furnishing)}
                              </span>
                            )}
                            {listing.customAttributes.tenant_preference && (
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                                Prefer: {String(listing.customAttributes.tenant_preference)}
                              </span>
                            )}
                            {listing.customAttributes.security_deposit && (
                              <span className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                                Deposit: ₹{Number(listing.customAttributes.security_deposit).toLocaleString('en-IN')}
                              </span>
                            )}
                            {listing.customAttributes.brokerage && (
                              <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                                {String(listing.customAttributes.brokerage)}
                              </span>
                            )}
                            {listing.customAttributes.property_status && (
                              <span className="text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                {String(listing.customAttributes.property_status)}
                              </span>
                            )}
                          </div>
                        )}

                        <h3 className="text-xs font-semibold text-slate-800 line-clamp-2 mt-1.5">
                          {listing.title}
                        </h3>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="truncate max-w-[120px]">
                          {listing.location.locality ? `${listing.location.locality}, ` : ''}
                          {listing.location.city}
                        </span>
                        <span>{listing.createdAt.split(' ')[0]}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
        )}
      </main>
      <SeoContentBlock
        locationName={selectedMarketplaceCity || 'All India'}
        categoryName={
          selectedMarketplaceSubcategory !== 'all'
            ? categories.find((c) => c.id === selectedMarketplaceSubcategory)?.name || 'Directory'
            : selectedMarketplaceCategory !== 'all'
            ? categories.find((c) => c.id === selectedMarketplaceCategory)?.name || 'Directory'
            : 'Classifieds'
        }
        categoryId={
          selectedMarketplaceSubcategory !== 'all'
            ? selectedMarketplaceSubcategory
            : selectedMarketplaceCategory !== 'all'
            ? selectedMarketplaceCategory
            : 'home'
        }
      />
      <Footer />
    </div>
  );
};
