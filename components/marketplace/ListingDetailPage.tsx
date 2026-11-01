'use client';
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Listing } from '@/lib/types';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Eye,
  ShieldCheck,
  Phone,
  MessageCircle,
  Share2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Rocket,
  Send,
  Shield,
  Search,
  User,
  Plus,
} from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { ImageWithFallback } from '@/components/common/ImageWithFallback';
import { navigateTo } from '@/lib/router/useRouter';
import { Footer } from '@/components/common/Footer';
import { buildChillyUrl, findListingById } from '@/lib/utils/seoAndUrlHelper';
import { LocationSelectorInput } from './LocationSelectorInput';
import { BoostAdModal } from './BoostAdModal';
import { ListingMapWidget } from './ListingMapWidget';
import { CategorySubNavbar } from './CategorySubNavbar';
import { isListingBoosted, formatBoostTimeRemaining } from '@/lib/utils/boostHelper';
import { renderUnclickableDescription } from '@/lib/utils/unclickableLinks';

interface ListingDetailPageProps {
  listingId: string;
  initialListing?: Listing | null;
  initialListings?: Listing[];
}

export const ListingDetailPage: React.FC<ListingDetailPageProps> = ({
  listingId,
  initialListing,
  initialListings,
}) => {
  const {
    listings,
    categories,
    addToast,
    setSelectedMarketplaceCategory,
    setSelectedMarketplaceSubcategory,
    setSelectedMarketplaceCity,
    marketplaceSearch,
    setMarketplaceSearch,
    selectedMarketplaceCity,
    theme,
    currentUser,
  } = useApp();
  const sourceListings = initialListings && initialListings.length > 0 ? initialListings : listings;
  const listing = findListingById(sourceListings, listingId) || findListingById(listings, listingId) || initialListing || null;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showPhone, setShowPhone] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isBoostModalOpen, setIsBoostModalOpen] = useState(false);

  // Check if active user is seller of this ad
  const isOwner = !!(listing && currentUser && listing.sellerId === currentUser.id);

  // Interactive Live Chat Simulator
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'seller'; text: string; time: string }>>([
    {
      sender: 'seller',
      text: 'Namaste! Thanks for your interest in this listing. Feel free to ask any questions or schedule an inspection.',
      time: 'Just now',
    },
  ]);
  const [newChatInput, setNewChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  if (!listing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Classified Ad Not Found</h2>
        <p className="text-sm text-slate-500 max-w-md mt-1 mb-6">
          The listing #{listingId} may have been sold, removed, or expired.
        </p>
        <a
          href="/"
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Classifieds Home
        </a>
      </div>
    );
  }

  const category = categories.find((c) => c.id === listing.categoryId);
  const subcategory = listing.subcategoryId ? categories.find((c) => c.id === listing.subcategoryId) : null;
  const relatedListings = sourceListings
    .filter((l) => l.id !== listing.id && l.status === 'approved' && (l.categoryId === listing.categoryId || l.subcategoryId === listing.subcategoryId || l.location.city === listing.location.city))
    .slice(0, 4);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatInput.trim()) return;

    const userMsg = newChatInput.trim();
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages((prev) => [...prev, { sender: 'user', text: userMsg, time: now }]);
    setNewChatInput('');

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'seller',
          text: `Yes, the ${listing.title} is available in ${listing.location.city}. You are welcome to inspect it!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 1200);
  };

  const cityUrl = buildChillyUrl({
    city: listing.location.city || 'All India',
    categories,
  });

  const categoryUrl = buildChillyUrl({
    city: listing.location.city || 'All India',
    categoryId: listing.categoryId,
    subcategoryId: 'all',
    categories: categories,
  });

  const subcategoryUrl = subcategory ? buildChillyUrl({
    city: listing.location.city || 'All India',
    categoryId: listing.categoryId,
    subcategoryId: subcategory.id,
    categories: categories,
  }) : '';

  const handleCategoryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (category) {
      setSelectedMarketplaceCategory(category.id);
      setSelectedMarketplaceSubcategory('all');
      if (listing.location.city) {
        setSelectedMarketplaceCity(listing.location.city);
      }
      navigateTo(categoryUrl);
    }
  };

  const handleSubcategoryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (category && subcategory) {
      setSelectedMarketplaceCategory(category.id);
      setSelectedMarketplaceSubcategory(subcategory.id);
      if (listing.location.city) {
        setSelectedMarketplaceCity(listing.location.city);
      }
      navigateTo(subcategoryUrl);
    }
  };

  const handleShare = () => {
    const fullUrl = window.location.href;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    addToast({
      title: 'Link Copied',
      message: 'Classified ad webpage URL copied to your clipboard.',
      type: 'success',
    });
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20">
      {/* Top Notification Bar */}
      <div className="bg-slate-900 text-slate-300 text-[10px] sm:text-xs py-2 px-4 sm:px-6 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="truncate">India’s Leading Real-Time Classifieds Marketplace</span>
          <span className="hidden md:inline text-slate-500">•</span>
          <span className="hidden md:inline text-slate-400 truncate">
            Over 2,40,000+ verified active listings across 500+ Indian cities
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigateTo('/admin/dashboard')}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-[10px] sm:text-xs transition-colors cursor-pointer"
          >
            <Shield className="w-3 h-3" /> Back to Admin Panel
          </button>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <a
              href="/"
              className="w-12 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center font-black text-2xl tracking-tighter cursor-pointer hover:bg-slate-800 transition-colors"
            >
              chillyads
            </a>

            {/* Typeable Location Selector */}
            <div className="hidden sm:block">
              <LocationSelectorInput currentCity={listing.location?.city} />
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl relative">
            <input
              type="text"
              value={marketplaceSearch}
              onChange={(e) => setMarketplaceSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  navigateTo(`/search?q=${encodeURIComponent(marketplaceSearch)}`);
                }
              }}
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
            <a
              href="/my-account"
              className="px-3 py-2 text-slate-800 dark:text-slate-200 hover:text-blue-600 font-extrabold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              title="User Account & Ads Panel"
            >
              <User className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">My Account</span>
            </a>

            <a
              href="/post"
              className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 border-2 border-slate-950 transition-all uppercase tracking-wider cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> + SELL
            </a>
          </div>
        </div>

        {/* Mobile Location Selector Bar */}
        <div className="sm:hidden px-4 pb-2.5 pt-1">
          <LocationSelectorInput className="w-full" currentCity={listing.location?.city} />
        </div>
      </header>

      {/* OLX Style Horizontal Category Sub-Navbar with "ALL CATEGORIES" dropdown */}
      <CategorySubNavbar
        currentCity={listing.location?.city}
        activeCategoryId={listing.categoryId}
        activeSubcategoryId={listing.subcategoryId}
      />

      {/* Top Breadcrumb Bar - OLX Style */}
      <nav aria-label="Breadcrumb" className="bg-white border-b border-slate-200 listing-breadcrumb text-slate-500">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between text-xs overflow-x-auto whitespace-nowrap scrollbar-none">
          <div className="flex items-center gap-2">
            <a
              href="/"
              className="hover:text-blue-600 font-medium flex items-center gap-1 shrink-0"
            >
              Home
            </a>
            {listing.location?.city && (
              <>
                <span className="text-slate-300">/</span>
                <a
                  href={cityUrl}
                  className="hover:text-blue-600 font-medium transition-colors cursor-pointer shrink-0"
                >
                  {listing.location.city}
                </a>
              </>
            )}
            <span className="text-slate-300">/</span>
            {category && (
              <>
                <a
                  href={categoryUrl}
                  className="hover:text-blue-600 font-medium transition-colors cursor-pointer shrink-0"
                >
                  {category.name}
                </a>
                <span className="text-slate-300">/</span>
              </>
            )}
            {subcategory && (
              <>
                <a
                  href={subcategoryUrl}
                  className="hover:text-blue-600 font-medium transition-colors cursor-pointer shrink-0"
                >
                  {subcategory.name}
                </a>
                <span className="text-slate-300">/</span>
              </>
            )}
            <span className="text-slate-900 font-semibold truncate max-w-xs sm:max-w-md">
              {listing.title} {listing.location.locality ? `in ${listing.location.locality}` : ''} {listing.location.city ? `, ${listing.location.city}` : ''}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-slate-400 shrink-0 pl-4">
            <span>AD ID: #{listing.id}</span>
            <button
              onClick={handleShare}
              className="flex items-center gap-1 hover:text-blue-600 cursor-pointer text-slate-600 font-semibold"
            >
              <Share2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{copiedLink ? 'Copied!' : 'Share'}</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <article itemScope itemType="https://schema.org/Product" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Hidden metadata for search engine indexing */}
          <meta itemProp="name" content={listing.title} />
          <meta itemProp="description" content={listing.description} />
          <meta itemProp="image" content={listing.images[0]} />
          <div itemProp="offers" itemScope itemType="https://schema.org/Offer" className="hidden">
            <meta itemProp="price" content={String(listing.price)} />
            <meta itemProp="priceCurrency" content="INR" />
            <meta itemProp="availability" content={listing.status === 'sold' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock'} />
            <meta itemProp="itemCondition" content="https://schema.org/UsedCondition" />
          </div>

          {/* Main Left Column (7 cols): Images & Full Specs */}
          <div className="lg:col-span-7 space-y-6">
            {/* Gallery Viewer */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="relative bg-slate-950 h-80 sm:h-96 flex items-center justify-center">
                <ImageWithFallback
                  src={listing.images[activeImageIndex] || listing.images[0]}
                  alt={listing.title}
                  categoryId={listing.categoryId}
                  className="w-full h-full object-contain"
                />

                {listing.isFeatured && (
                  <div className="absolute top-4 left-4 bg-amber-400 text-slate-950 font-black text-xs px-3 py-1 rounded-md uppercase tracking-wider shadow flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Featured Ad
                  </div>
                )}

                {listing.images.length > 1 && (
                  <div className="absolute bottom-3 right-4 bg-black/60 text-white text-xs px-2.5 py-1 rounded-lg backdrop-blur-sm">
                    {activeImageIndex + 1} / {listing.images.length}
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {listing.images.length > 1 && (
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2 overflow-x-auto">
                  {listing.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                        activeImageIndex === idx ? 'border-blue-600 ring-2 ring-blue-400' : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <ImageWithFallback src={img} alt="Thumb" categoryId={listing.categoryId} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dynamic Custom Specifications & Attributes */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 pb-2 border-b border-slate-100">
                Specifications & Dynamic Attributes
              </h3>

              {listing.customAttributes && Object.keys(listing.customAttributes).length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(listing.customAttributes).map(([key, val]) => (
                    <div key={key} className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                        {String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No custom category attributes specified for this listing.</p>
              )}
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  Description
                </h3>
                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  🔒 Links are unclickable for anti-spam safety
                </span>
              </div>
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {renderUnclickableDescription(listing.description)}
              </div>
            </div>

            {/* Location & Map Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>Location</span>
                <span className="text-xs font-normal text-slate-400">
                  {listing.location.city}, {listing.location.state}
                </span>
              </h3>
              <div className="flex items-center gap-3 text-slate-700 text-sm">
                <MapPin className="w-5 h-5 text-rose-500 shrink-0" />
                <span>
                  {listing.location.locality ? `${listing.location.locality}, ` : ''}
                  {listing.location.city}, {listing.location.state}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Price, Seller & Interactive Chat */}
          <div className="lg:col-span-5 space-y-6">
            {/* Owner Management Controls & Boost Promotion */}
            {isOwner && (
              <div className="bg-gradient-to-br from-indigo-50/80 to-blue-50/80 dark:bg-slate-800/80 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    You Own This Ad
                  </span>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">Seller Dashboard</span>
                </div>

                {isListingBoosted(listing) ? (
                  <div className="p-3.5 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-700 rounded-xl text-xs space-y-1.5">
                    <div className="font-extrabold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                      <Rocket className="w-4 h-4 text-amber-400 fill-amber-400 animate-bounce" />
                      <span>Boost Active • Top Category Placement</span>
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      Package: <span className="font-semibold text-slate-700 dark:text-slate-300">{listing.boostPackageName || 'Top Boost'}</span> • Expires in <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatBoostTimeRemaining(listing.boostExpiresAt)}</span>
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                      Elevate your ad to the top of category feeds to get up to 8x more verified buyer views and chat inquiries.
                    </p>
                    <button
                      onClick={() => setIsBoostModalOpen(true)}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white font-extrabold rounded-xl text-xs shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Rocket className="w-4 h-4 text-amber-300" />
                      <span>Boost Your Ad to Top</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Price & Summary Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div>
                {isListingBoosted(listing) && (
                  <div className="mb-3 p-2.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white rounded-xl flex items-center justify-between text-xs font-black shadow-md">
                    <div className="flex items-center gap-1.5">
                      <Rocket className="w-4 h-4 text-amber-300 fill-amber-300" />
                      <span>BOOSTED AD • TOP PLACEMENT</span>
                    </div>
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold">
                      {formatBoostTimeRemaining(listing.boostExpiresAt)} left
                    </span>
                  </div>
                )}

                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Direct Seller Listing
                </span>
                <div className="text-3xl font-black text-slate-900 mt-2 flex items-baseline gap-1">
                  <span>₹{listing.price.toLocaleString('en-IN')}</span>
                  {(listing.subcategoryId === 'sub_house_apt_rent' || 
                    listing.subcategoryId === 'sub_house_shops_rent' || 
                    listing.subcategoryId === 'sub_house_pg_guest' ||
                    listing.title.toLowerCase().includes('for rent') ||
                    listing.title.toLowerCase().includes('rental')
                  ) && (
                    <span className="text-sm font-bold text-slate-500">/ month</span>
                  )}
                </div>
                <h1 className="text-lg font-bold text-slate-800 mt-1 leading-snug">
                  {listing.title}
                </h1>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{listing.location.locality || listing.location.city}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {listing.createdAt.split(' ')[0]}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    {listing.views} views
                  </span>
                </div>
              </div>
            </div>

            {/* Seller Contact & Verification */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Seller Information
              </h4>

              <div className="flex items-center gap-3.5">
                {listing.sellerAvatar ? (
                  <img
                    src={listing.sellerAvatar}
                    alt={listing.sellerName}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-full object-cover border-2 border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-slate-900 text-white font-black text-lg flex items-center justify-center border-2 border-slate-200 shrink-0">
                    {(listing.sellerName || 'S').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                    <span className="truncate">{listing.sellerName}</span>
                    <span title="Verified KYC Account">
                      <ShieldCheck className="w-4 h-4 text-blue-500" />
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Government KYC Verified
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Active on Chillyads since 2024 • Fast responder
                  </div>
                </div>
              </div>

              {/* Call & Reveal Phone Button */}
              <div className="pt-2">
                {showPhone ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 font-bold text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-600" />
                      <span>{listing.sellerPhone}</span>
                    </div>
                    <span className="text-[11px] font-normal text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">
                      Verified
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowPhone(true)}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-sm transition-all"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Show Phone Number</span>
                  </button>
                )}
              </div>
            </div>

            {/* Interactive Live Chat with Seller (Embedded Page Component) */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-xs">Chat with {listing.sellerName}</span>
                </div>
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Online
                </span>
              </div>

              <div className="p-4 bg-slate-50 space-y-3 h-64 overflow-y-auto text-xs">
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-2xl ${
                        msg.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                      }`}
                    >
                      <p>{msg.text}</p>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-0.5 px-1">{msg.time}</span>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex items-center gap-1 text-slate-400 italic text-[11px]">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                    <span>Seller is typing...</span>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
                <input
                  type="text"
                  value={newChatInput}
                  onChange={(e) => setNewChatInput(e.target.value)}
                  placeholder="Type your message or offer..."
                  className="flex-1 text-xs border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!newChatInput.trim()}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow text-xs font-semibold flex items-center gap-1 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Google Maps Location Widget (OLX Style) */}
            <ListingMapWidget
              cityName={listing.location.city}
              locality={listing.location.locality}
              state={listing.location.state}
              title={listing.title}
              priceFormatted={`₹${listing.price.toLocaleString('en-IN')}`}
            />

            {/* Buyer Safety Tips Banner */}
            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-amber-900 text-xs space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <ShieldCheck className="w-4 h-4 text-amber-600" /> Safety Tips for Indian Buyers
              </div>
              <ul className="space-y-1 text-[11px] list-disc list-inside text-amber-800/90 leading-relaxed">
                <li>Meet in person in a safe, public daytime location.</li>
                <li>Never transfer advance token money via UPI or QR code.</li>
                <li>Verify vehicle registration/RC or electronic bills before payment.</li>
              </ul>
            </div>
          </div>
        </article>

        {/* Similar / Related Listings Section */}
        {relatedListings.length > 0 && (
          <div className="mt-12 pt-8 border-t border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              Similar Classifieds in {listing.location.city}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {relatedListings.map((item) => {
                const itemUrl = buildChillyUrl({ listing: item, categories });
                return (
                  <a
                    key={item.id}
                    href={itemUrl}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition-all group block"
                  >
                    <div className="relative h-40 bg-slate-900 overflow-hidden">
                      <ImageWithFallback
                        src={item.images[0]}
                        alt={item.title}
                        categoryId={item.categoryId}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white font-bold text-xs px-2 py-0.5 rounded">
                        ₹{item.price.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="font-bold text-xs text-slate-800 truncate">{item.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" /> {item.location.city}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Boost Your Ad Modal */}
      {listing && (
        <BoostAdModal
          listing={listing}
          isOpen={isBoostModalOpen}
          onClose={() => setIsBoostModalOpen(false)}
          onBoostSuccess={() => setIsBoostModalOpen(false)}
        />
      )}

      <Footer />
    </div>
  );
};
