'use client';
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Listing, UserAccount, OrderTransaction } from '@/lib/types';
import {
  User,
  ShoppingBag,
  Heart,
  Receipt,
  MessageSquare,
  Settings,
  ShieldCheck,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  Eye,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Rocket,
  Download,
  FileText,
  Upload,
  Search,
  Check,
  X,
  Lock,
  ArrowLeft,
  Building,
  AlertCircle,
  RotateCcw,
  Layers,
  Star,
} from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { ImageWithFallback } from '@/components/common/ImageWithFallback';
import { navigateTo } from '@/lib/router/useRouter';
import { DUPLICATE_TITLE_ERROR_MESSAGE } from '@/lib/utils/adTitleValidation';
import { BoostAdModal } from '@/components/marketplace/BoostAdModal';
import { FeatureAdModal } from '@/components/marketplace/FeatureAdModal';
import { isListingBoosted, formatBoostTimeRemaining } from '@/lib/utils/boostHelper';

export const UserPanelPage: React.FC = () => {
  const {
    users,
    listings,
    categories,
    transactions,
    emailLogs,
    updateListing,
    deleteListing,
    markAsSold,
    featureListing,
    renewListing,
    updateUser,
    addToast,
    theme,
    toggleTheme,
    checkDuplicateTitle,
    settings,
  } = useApp();

  // Active user selection (defaults to first active seller in system, e.g. Rajesh Sharma)
  const [activeUserId, setActiveUserId] = useState<string>(() => {
    return users.find((u) => u.type === 'user' || u.type === 'business')?.id || users[0]?.id || 'usr_101';
  });

  const currentUser = users.find((u) => u.id === activeUserId) || users[0];

  // Active tab state
  const [activeTab, setActiveTab] = useState<'my-ads' | 'saved-ads' | 'orders-receipts' | 'messages' | 'email-notifications' | 'account-settings'>(
    'my-ads'
  );

  // Status sub-filter for My Ads
  const [adStatusFilter, setAdStatusFilter] = useState<'all' | 'approved' | 'pending' | 'expired' | 'sold' | 'rejected'>('all');
  const [adSearchQuery, setAdSearchQuery] = useState('');

  // Editing listing modal state
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [editTitleError, setEditTitleError] = useState<string | null>(null);

  // Boost modal state
  const [boostTargetListing, setBoostTargetListing] = useState<Listing | null>(null);

  // Feature modal state
  const [featureModalListing, setFeatureModalListing] = useState<Listing | null>(null);

  // KYC submission modal state
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [kycDocType, setKycDocType] = useState<'Aadhaar' | 'PAN' | 'GSTIN' | 'Passport'>('Aadhaar');
  const [kycDocNumber, setKycDocNumber] = useState('');

  // Account Settings Form State
  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    city: currentUser?.location?.city || '',
    state: currentUser?.location?.state || '',
    companyName: currentUser?.businessDetails?.companyName || '',
    gstNumber: currentUser?.businessDetails?.gstNumber || '',
  });

  // Keep form in sync when active user changes
  React.useEffect(() => {
    if (currentUser) {
      setProfileForm({
        name: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone,
        city: currentUser.location.city,
        state: currentUser.location.state,
        companyName: currentUser.businessDetails?.companyName || '',
        gstNumber: currentUser.businessDetails?.gstNumber || '',
      });
    }
  }, [currentUser]);

  // Emails for this user
  const userEmails = React.useMemo(() => {
    if (!currentUser) return [];
    return emailLogs.filter(
      (e) =>
        (e.toEmail && currentUser.email && e.toEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
        e.relatedUserId === currentUser.id
    );
  }, [emailLogs, currentUser]);

  // Handle URL feature query parameter (e.g. /user/my-ads?feature=lst_1001)
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const featureTargetId = urlParams.get('feature');
    if (featureTargetId) {
      const target = listings.find((l) => l.id === featureTargetId);
      if (target) {
        setFeatureModalListing(target);
      }
    }
  }, [listings]);

  // Listings owned by this user
  const userListings = listings.filter((l) => l.sellerId === currentUser.id);
  const activeUserApprovedListingsCount = userListings.filter((l) => l.status === 'approved').length;
  const freeQuotaLimit = settings.freeListingsLimit ?? 3;
  const extraListingFeeRate = settings.extraListingFee ?? 99;
  const isQuotaExceeded = activeUserApprovedListingsCount >= freeQuotaLimit;
  const freeQuotaSlotsRemaining = Math.max(0, freeQuotaLimit - activeUserApprovedListingsCount);

  const filteredUserListings = userListings.filter((l) => {
    if (adStatusFilter !== 'all' && l.status !== adStatusFilter) return false;
    if (adSearchQuery.trim()) {
      const q = adSearchQuery.toLowerCase();
      return l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q);
    }
    return true;
  });

  // Transactions / Order receipts for this user
  const userTransactions = transactions.filter((t) => t.userId === currentUser.id);

  // Save profile modifications
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const updated: UserAccount = {
      ...currentUser,
      name: profileForm.name,
      email: profileForm.email,
      phone: profileForm.phone,
      location: {
        city: profileForm.city,
        state: profileForm.state,
      },
      businessDetails: profileForm.companyName
        ? {
            companyName: profileForm.companyName,
            gstNumber: profileForm.gstNumber,
            verifiedBusiness: currentUser.businessDetails?.verifiedBusiness || false,
          }
        : currentUser.businessDetails,
    };

    updateUser(updated);
  };

  // Submit KYC Document
  const handleKycSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycDocNumber.trim()) {
      addToast({ type: 'error', title: 'KYC Document Required', message: 'Please enter a valid document number.' });
      return;
    }

    const updated: UserAccount = {
      ...currentUser,
      kycStatus: 'pending',
      kycDocument: {
        type: kycDocType,
        docNumber: kycDocNumber,
        submittedAt: new Date().toISOString().split('T')[0],
        fileUrl: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=400&q=80',
      },
    };

    updateUser(updated);
    setKycModalOpen(false);
    setKycDocNumber('');
    addToast({
      type: 'success',
      title: 'KYC Document Submitted',
      message: 'Your verification request has been sent for admin compliance review.',
    });
  };

  // Save changes to edited listing
  const handleSaveListingEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing) return;

    // Check duplicate title for this seller, excluding this listing
    const duplicateCheck = await checkDuplicateTitle(
      editingListing.title,
      editingListing.sellerId,
      editingListing.id
    );

    if (duplicateCheck.isDuplicate) {
      const errorMsg = duplicateCheck.message || DUPLICATE_TITLE_ERROR_MESSAGE;
      setEditTitleError(errorMsg);
      addToast({
        type: 'error',
        title: 'Duplicate Ad Title Detected',
        message: errorMsg,
      });
      return;
    }

    const success = updateListing(editingListing);
    if (success) {
      setEditingListing(null);
      setEditTitleError(null);
    } else {
      setEditTitleError(DUPLICATE_TITLE_ERROR_MESSAGE);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-12 overflow-x-hidden">
      {/* Top Header Navigation */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateTo('/')}
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Live Site</span>
            </button>
            <div className="h-4 w-[1px] bg-slate-800" />
            <h1 className="text-base font-extrabold tracking-tight flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" />
              <span>User Dashboard & Listing Manager</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* User Account Switcher (For Testing & Demo) */}
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
              <span className="text-slate-400 font-medium">Switch User:</span>
              <select
                value={activeUserId}
                onChange={(e) => setActiveUserId(e.target.value)}
                className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                    {u.name} ({u.type.toUpperCase()}) - {u.location.city}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => navigateTo('/post')}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Post New Ad
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* User Profile Banner Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-20 h-20 rounded-2xl object-cover ring-4 ring-slate-100 dark:ring-slate-800 shadow"
              />
              <span className="absolute -bottom-1 -right-1 p-1 bg-blue-600 text-white rounded-lg shadow" title="Verified Seller">
                <ShieldCheck className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{currentUser.name}</h2>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {currentUser.type} Account
                </span>

                {currentUser.kycStatus === 'verified' && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> KYC Verified Seller
                  </span>
                )}

                {currentUser.kycStatus === 'pending' && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600" /> KYC Pending Review
                  </span>
                )}

                {currentUser.kycStatus === 'unsubmitted' && (
                  <button
                    onClick={() => setKycModalOpen(true)}
                    className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <AlertTriangle className="w-3 h-3 text-rose-600" /> Complete KYC Verification
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {currentUser.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> {currentUser.phone}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {currentUser.location.city}, {currentUser.location.state}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 text-center min-w-[90px]">
              <div className="text-lg font-black text-slate-900 dark:text-white">{userListings.length}</div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Ads</div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 text-center min-w-[90px]">
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {activeUserApprovedListingsCount}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Active Live</div>
            </div>

            {/* Freemium Volume Quota Box */}
            <div className={`px-4 py-2.5 rounded-xl border text-center min-w-[125px] ${
              isQuotaExceeded
                ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                : 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
            }`}>
              <div className="text-lg font-black tracking-tight flex items-center justify-center gap-1">
                <span className={isQuotaExceeded ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}>
                  {activeUserApprovedListingsCount} / {freeQuotaLimit}
                </span>
              </div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Free Quota
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 text-center min-w-[90px]">
              <div className="text-lg font-black text-blue-600 dark:text-blue-400">
                {userListings.reduce((sum, l) => sum + l.views, 0)}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Views</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none pb-0.5">
          {[
            { id: 'my-ads', label: 'My Classified Ads', icon: ShoppingBag, count: userListings.length },
            { id: 'email-notifications', label: 'Email Notifications & Approvals', icon: Mail, count: userEmails.length },
            { id: 'orders-receipts', label: 'Purchases & Invoices', icon: Receipt, count: userTransactions.length },
            { id: 'messages', label: 'Chat Enquiries', icon: MessageSquare, count: userListings.reduce((sum, l) => sum + l.chatsCount, 0) },
            { id: 'account-settings', label: 'Account Profile & Security', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 font-extrabold text-xs border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-xl shadow-xs'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-t-xl'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: MY CLASSIFIED ADS MANAGER */}
        {activeTab === 'my-ads' && (
          <div className="space-y-4">
            {/* Freemium Volume Quota Policy Banner */}
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs ${
              isQuotaExceeded
                ? 'bg-amber-50/90 border-amber-300 text-amber-950 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
                : 'bg-emerald-50/90 border-emerald-300 text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl text-white shrink-0 ${isQuotaExceeded ? 'bg-amber-500' : 'bg-emerald-600'}`}>
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold flex items-center gap-2 flex-wrap">
                    <span>Freemium Active Ads Quota: {activeUserApprovedListingsCount} of {freeQuotaLimit} Free Active Ads Used</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-black tracking-wider ${
                      isQuotaExceeded ? 'bg-amber-200 text-amber-950' : 'bg-emerald-200 text-emerald-950'
                    }`}>
                      {isQuotaExceeded ? '⚡ Free Quota Reached' : `✓ ${freeQuotaSlotsRemaining} Free Slot${freeQuotaSlotsRemaining === 1 ? '' : 's'} Remaining`}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-1">
                    {isQuotaExceeded
                      ? `You have reached your baseline quota of ${freeQuotaLimit} free active listings. Publishing additional ads will incur a volume quota fee of ₹${extraListingFeeRate}/ad.`
                      : `Your account includes a baseline of ${freeQuotaLimit} free active ad listings. You can post ${freeQuotaSlotsRemaining} more ad${freeQuotaSlotsRemaining === 1 ? '' : 's'} for free.`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigateTo('/post')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shrink-0 cursor-pointer flex items-center gap-1.5 shadow-sm hover:scale-102"
              >
                <Plus className="w-4 h-4" />
                <span>Post New Ad</span>
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                {[
                  { id: 'all', label: 'All Ads', count: userListings.length },
                  { id: 'approved', label: 'Active Live', count: userListings.filter((l) => l.status === 'approved').length },
                  { id: 'pending', label: 'Pending Review', count: userListings.filter((l) => l.status === 'pending').length },
                  { id: 'expired', label: 'Expired Ads', count: userListings.filter((l) => l.status === 'expired').length },
                  { id: 'sold', label: 'Archived Sold', count: userListings.filter((l) => l.status === 'sold').length },
                  { id: 'rejected', label: 'Rejected', count: userListings.filter((l) => l.status === 'rejected').length },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => setAdStatusFilter(btn.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      adStatusFilter === btn.id
                        ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                    }`}
                  >
                    {btn.label} ({btn.count})
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={adSearchQuery}
                  onChange={(e) => setAdSearchQuery(e.target.value)}
                  placeholder="Search my ads..."
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-3 py-1.5 focus:outline-none"
                />
              </div>
            </div>

            {/* Ads List Grid */}
            {filteredUserListings.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
                <ShoppingBag className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Ads Found</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  You do not have any listings under this filter state. Create a new listing to start receiving buyers!
                </p>
                <button
                  onClick={() => navigateTo('/post')}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" /> Post Your Ad Now
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUserListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <img
                        src={listing.images[0] || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80'}
                        alt={listing.title}
                        className="w-24 h-24 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-800 shrink-0"
                      />

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                            {listing.title}
                          </h3>

                          {listing.status === 'approved' && (
                            <Badge variant="success" size="sm">Active Live</Badge>
                          )}
                          {listing.status === 'pending' && (
                            <Badge variant="warning" size="sm">Pending Approval</Badge>
                          )}
                          {listing.status === 'sold' && (
                            <Badge variant="neutral" size="sm">Sold</Badge>
                          )}
                          {listing.status === 'expired' && (
                            <Badge variant="danger" size="sm">Expired</Badge>
                          )}
                          {listing.status === 'rejected' && (
                            <Badge variant="danger" size="sm">Rejected</Badge>
                          )}

                          {listing.isFeatured && (
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400 text-slate-950 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 fill-slate-950" /> Featured Ad
                            </span>
                          )}

                          {isListingBoosted(listing) && (
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white flex items-center gap-1 shadow-xs">
                              <Rocket className="w-3 h-3 text-amber-300 fill-amber-300" /> Boosted ({formatBoostTimeRemaining(listing.boostExpiresAt)})
                            </span>
                          )}
                        </div>

                        <div className="text-base font-black text-blue-600 dark:text-blue-400">
                          ₹{listing.price.toLocaleString('en-IN')}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" /> {listing.location.city}, {listing.location.locality}
                          </span>
                          <span>• Posted: {listing.createdAt}</span>
                          <span>• Expires: {listing.expiresAt}</span>
                        </div>

                        {listing.status === 'expired' && (
                          <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-900 p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 mt-1">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Your ad has expired. Please renew it for free to restore live visibility!</span>
                            </div>
                            <button
                              onClick={() => renewListing(listing.id, 30)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shrink-0 transition-colors shadow-xs cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Renew Free
                            </button>
                          </div>
                        )}

                        {listing.rejectionReason && (
                          <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 p-2 rounded-lg text-xs font-semibold flex items-center gap-2 mt-1">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>Rejection Note: {listing.rejectionReason}</span>
                          </div>
                        )}

                        {/* Engagement Stats */}
                        <div className="flex items-center gap-4 pt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
                          <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            <Eye className="w-3.5 h-3.5 text-blue-500" /> {listing.views} Views
                          </span>
                          <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            <Heart className="w-3.5 h-3.5 text-rose-500" /> {listing.likes} Favorites
                          </span>
                          <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-500" /> {listing.chatsCount} Buyer Enquiries
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Listing Action Controls */}
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 pt-3 md:pt-0">
                      <button
                        onClick={() => navigateTo(`/mumbai_g1/item/${listing.id}`)}
                        className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        title="View Live Ad"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span className="md:hidden">View</span>
                      </button>

                      <button
                        onClick={() => {
                          setEditingListing(listing);
                          setEditTitleError(null);
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Ad</span>
                      </button>

                      {listing.status === 'expired' && (
                        <button
                          onClick={() => renewListing(listing.id, 30)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                          title="Renew Ad for Free (+30 Days)"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Renew For Free</span>
                        </button>
                      )}

                      {listing.status === 'approved' && (
                        <button
                          onClick={() => markAsSold(listing.id)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Mark Sold</span>
                        </button>
                      )}

                      {listing.isFeatured ? (
                        <button
                          onClick={() => setFeatureModalListing(listing)}
                          className="px-3.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 dark:bg-amber-950/80 dark:text-amber-200 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          title="Ad is Featured - Click to extend featured duration"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                          <span>⭐ Featured (Extend)</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setFeatureModalListing(listing)}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-slate-950 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:shadow-md hover:scale-102"
                          title="Feature your ad at top search positions for up to 10x buyer leads"
                        >
                          <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                          <span>⭐ Feature Ad</span>
                        </button>
                      )}

                      {listing.status === 'approved' && (
                        isListingBoosted(listing) ? (
                          <div className="px-3 py-1.5 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs">
                            <Rocket className="w-3.5 h-3.5 text-violet-600 animate-pulse" />
                            <span>Boost Active</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setBoostTargetListing(listing)}
                            className="px-3 py-1.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md hover:shadow-lg"
                            title="Boost ad to appear near the top of relevant listings"
                          >
                            <Rocket className="w-3.5 h-3.5 text-amber-300" />
                            <span>Boost to Top</span>
                          </button>
                        )
                      )}

                      <button
                        onClick={() => deleteListing(listing.id)}
                        className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Delete Listing"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: EMAIL NOTIFICATIONS & APPROVALS */}
        {activeTab === 'email-notifications' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <span>Email Notifications & Ad Approval Alerts</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Official emails dispatched to <strong className="text-slate-700 dark:text-slate-300">{currentUser.email}</strong> regarding ad approvals, featured opportunities, and system notices.
                </p>
              </div>
              <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold text-xs rounded-full border border-blue-200 dark:border-blue-800">
                {userEmails.length} Email{userEmails.length === 1 ? '' : 's'}
              </span>
            </div>

            {userEmails.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Mail className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Email Logs Yet</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  When you submit a new ad and an admin reviews it, you will receive an instant approval notification email right here!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {userEmails.map((email) => {
                  const targetListing = listings.find((l) => l.id === email.listingId);
                  const isApprovalEmail = email.type === 'ad_approved' || email.subject.toLowerCase().includes('approved');

                  return (
                    <div
                      key={email.id}
                      className={`p-5 rounded-2xl border transition-all space-y-3 ${
                        isApprovalEmail
                          ? 'bg-gradient-to-r from-emerald-500/5 via-amber-500/5 to-transparent border-emerald-200 dark:border-emerald-900/60'
                          : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
                        <div className="flex items-center gap-2">
                          {isApprovalEmail ? (
                            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 shrink-0">
                              <CheckCircle2 className="w-4 h-4" />
                            </span>
                          ) : (
                            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 shrink-0">
                              <Mail className="w-4 h-4" />
                            </span>
                          )}
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
                            {email.subject}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{email.sentAt}</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                            {email.status}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-normal">
                        {email.body}
                      </div>

                      {/* FEATURE YOUR AD ACTION IN APPROVAL EMAIL */}
                      {(isApprovalEmail || email.actionLabel) && (
                        <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-amber-400/20 via-yellow-400/10 to-transparent border border-amber-300 dark:border-amber-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                          <div className="space-y-0.5">
                            <div className="text-xs font-black text-amber-950 dark:text-amber-300 flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 fill-amber-500 text-amber-600" />
                              <span>⭐ Featured Ad Promotion Available!</span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300">
                              Promote this approved listing to the top of search results for maximum buyer calls and inquiries.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (targetListing) {
                                setFeatureModalListing(targetListing);
                              } else {
                                const matched = listings.find((l) => l.sellerId === currentUser.id);
                                if (matched) setFeatureModalListing(matched);
                              }
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                          >
                            <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                            <span>{email.actionLabel || '⭐ Feature Your Ad Now'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PURCHASES & TAX INVOICES */}
        {activeTab === 'orders-receipts' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Purchases & Payment Invoices</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Billing history for paid subcategory posting fees, featured ad promotions, and seller packages.
                </p>
              </div>

              <div className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                GSTIN: {currentUser.businessDetails?.gstNumber || '27AABCU9603R1ZN'}
              </div>
            </div>

            {userTransactions.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-xs">
                No past transactions found for this account.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                      <th className="p-3 font-extrabold">Transaction ID</th>
                      <th className="p-3 font-extrabold">Package / Fee Type</th>
                      <th className="p-3 font-extrabold">Payment Method</th>
                      <th className="p-3 font-extrabold">Amount</th>
                      <th className="p-3 font-extrabold">Status</th>
                      <th className="p-3 font-extrabold">Date</th>
                      <th className="p-3 font-extrabold text-right">Tax Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {userTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">{tx.id}</td>
                        <td className="p-3 font-bold">{tx.packageName}</td>
                        <td className="p-3 text-slate-500 dark:text-slate-400">{tx.paymentGateway}</td>
                        <td className="p-3 font-black text-blue-600 dark:text-blue-400">₹{tx.amount.toLocaleString('en-IN')}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {tx.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500">{tx.createdAt}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              addToast({
                                type: 'success',
                                title: 'Tax Invoice Downloaded',
                                message: `GST Invoice for ${tx.id} saved as PDF.`,
                              });
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold rounded-lg text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Download className="w-3 h-3 text-blue-500" />
                            <span>Invoice</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CHAT ENQUIRIES & MESSAGES */}
        {activeTab === 'messages' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Buyer & Seller Enquiry Chat Threads</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct chat enquiries received on your active marketplace listings.
              </p>
            </div>

            <div className="space-y-3">
              {userListings.map((l) => (
                <div key={l.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <ImageWithFallback src={l.images[0]} alt={l.title} categoryId={l.categoryId} className="w-12 h-12 rounded-lg object-cover" />
                    <div>
                      <div className="font-extrabold text-xs text-slate-900 dark:text-white">{l.title}</div>
                      <div className="text-[11px] text-slate-500">₹{l.price.toLocaleString('en-IN')} • {l.chatsCount} Enquiry Messages</div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      addToast({
                        type: 'info',
                        title: 'Chat Messenger Opened',
                        message: `Connecting to buyer inbox thread for "${l.title.substring(0, 30)}..."`,
                      });
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Reply to Buyers
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: ACCOUNT PROFILE & SECURITY SETTINGS */}
        {activeTab === 'account-settings' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Account Settings Form */}
            <form onSubmit={handleSaveProfile} className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 text-xs">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Account Settings & Contact Information</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Mobile Phone Number (Indian OTP Verified)</label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Primary City</label>
                  <input
                    type="text"
                    value={profileForm.city}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Building className="w-4 h-4 text-blue-500" /> Business Account Details (Optional)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold mb-1">Company / Store Name</label>
                    <input
                      type="text"
                      value={profileForm.companyName}
                      onChange={(e) => setProfileForm({ ...profileForm, companyName: e.target.value })}
                      placeholder="e.g. Sharma Motors Pvt Ltd"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1">GSTIN Registration Number</label>
                    <input
                      type="text"
                      value={profileForm.gstNumber}
                      onChange={(e) => setProfileForm({ ...profileForm, gstNumber: e.target.value })}
                      placeholder="e.g. 27AABCU9603R1ZN"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow cursor-pointer transition-colors"
                >
                  Save Profile Settings
                </button>
              </div>
            </form>

            {/* Account Security Side Card */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-3 text-xs">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <span>Account Trust & Safety</span>
                </div>

                <div className="space-y-2 text-slate-600 dark:text-slate-400">
                  <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                    <span>KYC Verification Status</span>
                    <span className="font-extrabold uppercase text-emerald-600">{currentUser.kycStatus}</span>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                    <span>Mobile Phone OTP</span>
                    <span className="font-extrabold text-blue-600">Verified</span>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                    <span>Account Rating</span>
                    <span className="font-extrabold text-amber-500">★ {currentUser.rating} / 5.0</span>
                  </div>
                </div>

                <button
                  onClick={() => setKycModalOpen(true)}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Submit / Update KYC Documents
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* KYC Document Submission Modal */}
      {kycModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 dark:text-white">
                <ShieldCheck className="w-5 h-5 text-blue-500" />
                <span>Submit KYC Seller Document</span>
              </div>
              <button onClick={() => setKycModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleKycSubmit} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Select Document Type</label>
                <select
                  value={kycDocType}
                  onChange={(e) => setKycDocType(e.target.value as any)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
                >
                  <option value="Aadhaar">Aadhaar Card (12-Digit Number)</option>
                  <option value="PAN">PAN Card (10-Digit Alphanumeric)</option>
                  <option value="GSTIN">GSTIN Certificate (15-Digit Code)</option>
                  <option value="Passport">Indian Passport</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Document Registration Number</label>
                <input
                  type="text"
                  value={kycDocNumber}
                  onChange={(e) => setKycDocNumber(e.target.value)}
                  placeholder="e.g. 5489 1029 4812"
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
                  required
                />
              </div>

              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 p-4 rounded-xl text-center space-y-1">
                <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                <div className="font-bold text-slate-700 dark:text-slate-300">Upload Front Document Scan</div>
                <div className="text-[10px] text-slate-400">PDF, JPG or PNG up to 5MB</div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setKycModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-lg shadow"
                >
                  Submit for Compliance Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Listing Modal */}
      {editingListing && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 dark:text-white">
                <Edit3 className="w-5 h-5 text-blue-500" />
                <span>Edit Listing: {editingListing.title}</span>
              </div>
              <button onClick={() => setEditingListing(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveListingEdit} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Ad Title</label>
                <input
                  type="text"
                  value={editingListing.title}
                  onChange={(e) => {
                    setEditingListing({ ...editingListing, title: e.target.value });
                    if (editTitleError) setEditTitleError(null);
                  }}
                  className={`w-full text-xs rounded-lg border p-2.5 font-medium transition-all ${
                    editTitleError
                      ? 'border-2 border-red-500 bg-red-50/20 text-red-900 focus:ring-2 focus:ring-red-300'
                      : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                  }`}
                  required
                />
                {editTitleError && (
                  <div
                    id="edit-duplicate-title-alert"
                    className="mt-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 flex items-start gap-2 animate-in fade-in"
                  >
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span className="text-[11px] font-semibold">{editTitleError}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={editingListing.price}
                    onChange={(e) => setEditingListing({ ...editingListing, price: Number(e.target.value) })}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">City Location</label>
                  <input
                    type="text"
                    value={editingListing.location.city}
                    onChange={(e) =>
                      setEditingListing({
                        ...editingListing,
                        location: { ...editingListing.location, city: e.target.value },
                      })
                    }
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Description</label>
                <textarea
                  value={editingListing.description}
                  onChange={(e) => setEditingListing({ ...editingListing, description: e.target.value })}
                  rows={4}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
                  required
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                  🔒 Live clickable links are disabled in ad descriptions for safety & anti-spam compliance.
                </span>
              </div>

              {/* Photos Management (Max 5 Photos) */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    Listing Photos ({editingListing.images.length}/5 Max)
                  </label>
                  {editingListing.images.length < 5 && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingListing({
                          ...editingListing,
                          images: [...editingListing.images, ''],
                        });
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      + Add Photo
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {editingListing.images.map((img, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="url"
                        value={img}
                        onChange={(e) => {
                          const updated = [...editingListing.images];
                          updated[idx] = e.target.value;
                          setEditingListing({ ...editingListing, images: updated });
                        }}
                        placeholder={`Photo URL #${idx + 1}`}
                        className="flex-1 text-[11px] border border-slate-300 dark:border-slate-700 rounded p-1.5 bg-white dark:bg-slate-900 font-mono"
                      />
                      {editingListing.images.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = editingListing.images.filter((_, i) => i !== idx);
                            setEditingListing({ ...editingListing, images: updated });
                          }}
                          className="text-[10px] font-bold text-rose-600 hover:underline px-1"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingListing(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-lg shadow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Boost Your Ad Modal */}
      {boostTargetListing && (
        <BoostAdModal
          listing={boostTargetListing}
          isOpen={!!boostTargetListing}
          onClose={() => setBoostTargetListing(null)}
          onBoostSuccess={() => setBoostTargetListing(null)}
        />
      )}

      {/* Feature Your Ad Modal */}
      {featureModalListing && (
        <FeatureAdModal
          listing={featureModalListing}
          isOpen={!!featureModalListing}
          onClose={() => setFeatureModalListing(null)}
          onSuccess={() => setFeatureModalListing(null)}
        />
      )}
    </div>
  );
};
