'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { LocationItem } from '@/lib/types';
import {
  ArrowLeft,
  Upload,
  CheckCircle2,
  Tag,
  IndianRupee,
  MapPin,
  Image as ImageIcon,
  Sparkles,
  ChevronRight,
  CornerDownRight,
  Car,
  Smartphone,
  Building2,
  Bike,
  Tv,
  Armchair,
  Briefcase,
  Shirt,
  Package,
  Layers,
  Wrench,
  Users,
  Heart,
  PawPrint,
  BookOpen,
  CreditCard,
  Plus,
  X,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { navigateTo } from '@/lib/router/useRouter';
import { buildChillyUrl } from '@/lib/utils/seoAndUrlHelper';
import { CustomFieldDefinition } from '@/lib/types';
import { LocalityCombobox } from './LocalityCombobox';
import { DUPLICATE_TITLE_ERROR_MESSAGE } from '@/lib/utils/adTitleValidation';

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
  PackageIcon: Package,
  Layers,
};

export const PostAdPage: React.FC = () => {
  const { categories, addListing, addToast, customFields, locations, currentUser, checkDuplicateTitle, settings, listings } = useApp();

  const countries = locations.filter((l) => l.type === 'country');
  const states = locations.filter((l) => l.type === 'state');
  const cities = locations.filter((l) => l.type === 'city');
  const localities = locations.filter((l) => l.type === 'locality');

  const rootCategories = categories.filter((c) => !c.parentId && c.isActive);
  const initialRoot = rootCategories[0]?.id || 'cat_services';
  const initialSubs = categories.filter((c) => c.parentId === initialRoot && c.isActive);

  const [postForm, setPostForm] = useState({
    title: '',
    categoryId: initialRoot,
    subcategoryId: initialSubs[0]?.id || '',
    price: '',
    description: '',
    country: 'India', // Fixed to India for the Indian marketplace
    state: '', // Starts completely blank
    city: '', // Starts completely blank
    locality: '',
    images: [] as string[],
    dynamicAttributes: {} as Record<string, any>,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 5 - postForm.images.length;
    if (remainingSlots <= 0) {
      addToast({
        title: 'Photo Limit Reached',
        message: 'Maximum 5 photos are allowed per listing.',
        type: 'warning',
      });
      return;
    }

    const filesArray = Array.from(files).slice(0, remainingSlots);

    filesArray.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        addToast({
          title: 'File Too Large',
          message: `${file.name} is larger than 5MB. Please upload a smaller image.`,
          type: 'error',
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPostForm((prev) => ({
            ...prev,
            images: [...prev.images, reader.result as string],
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    const updated = postForm.images.filter((_, i) => i !== index);
    setPostForm((prev) => ({
      ...prev,
      images: updated,
    }));
  };

  const [titleError, setTitleError] = useState<string | null>(null);
  const [isCheckingTitle, setIsCheckingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [wantFeatured, setWantFeatured] = useState(false);

  // Freemium Volume Quota calculations
  const userActiveListingsCount = useMemo(() => {
    if (!currentUser?.id) return 0;
    return listings.filter((l) => l.sellerId === currentUser.id && l.status === 'approved').length;
  }, [listings, currentUser]);

  // Paid Features Configuration Guards
  const paidCfg = settings.paidFeatures;
  const currencySymbol = settings.currencySymbol || '₹';
  const isMasterMonetized = paidCfg ? paidCfg.masterMonetizationEnabled : true;
  const isQuotaEnabled = isMasterMonetized && (paidCfg ? paidCfg.freemiumQuotaEnabled : true);
  const isSubcatFeeEnabled = isMasterMonetized && (paidCfg ? paidCfg.paidSubcategoriesEnabled : true);
  const isFeaturedEnabled = isMasterMonetized && (paidCfg ? paidCfg.featuredAdEnabled : true);

  const freeQuotaLimit = paidCfg?.freeListingsLimit ?? settings.freeListingsLimit ?? 3;
  const extraListingFeeRate = paidCfg?.extraListingFee ?? settings.extraListingFee ?? 99;

  const isVolumeQuotaExceeded = isQuotaEnabled && userActiveListingsCount >= freeQuotaLimit;
  const volumeQuotaFee = isVolumeQuotaExceeded ? extraListingFeeRate : 0;
  const remainingFreeListings = Math.max(0, freeQuotaLimit - userActiveListingsCount);

  // As-you-type debounced duplicate title check for immediate user feedback
  useEffect(() => {
    if (!postForm.title.trim()) {
      if (titleError !== null) setTitleError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingTitle(true);
      const res = await checkDuplicateTitle(postForm.title, currentUser?.id || 'usr_101');
      if (res.isDuplicate) {
        setTitleError(res.message || DUPLICATE_TITLE_ERROR_MESSAGE);
      } else {
        setTitleError(null);
      }
      setIsCheckingTitle(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [postForm.title, currentUser?.id, checkDuplicateTitle]);

  // Dynamic cascading location hierarchy (India -> State -> City)
  const sortedStates: LocationItem[] = useMemo(() => {
    return states.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [states]);

  const availableCities: LocationItem[] = useMemo(() => {
    if (!postForm.state) return [];
    const stateObj = states.find((s) => s.name === postForm.state);
    if (!stateObj) return [];
    return cities
      .filter((c) => c.parentId === stateObj.id)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [states, cities, postForm.state]);

  const selectedCategory = categories.find((c) => c.id === postForm.categoryId);
  const selectedSubcategory = categories.find((c) => c.id === postForm.subcategoryId);
  const currentSubcategories = categories.filter(
    (c) => c.parentId === postForm.categoryId && c.isActive
  );

  const isPaidSubcategory = isSubcatFeeEnabled && !!(selectedSubcategory?.isPaid || selectedCategory?.isPaid);
  const postingFeeAmount = selectedSubcategory?.postingFee || selectedCategory?.postingFee || paidCfg?.defaultSubcategoryFee || 149;

  const featuredAdPrice = paidCfg?.featuredAdPrice ?? 100;
  const featuredFee = isFeaturedEnabled && wantFeatured ? featuredAdPrice : 0;
  const baseFee = isPaidSubcategory ? postingFeeAmount : 0;
  const totalFee = isMasterMonetized ? (baseFee + volumeQuotaFee + featuredFee) : 0;
  const requiresPayment = totalFee > 0;

  // Dynamic fields from parent category or subcategory (prefer subcategory-specific fields if available)
  const activeCategoryFields = customFields.filter((f) => {
    if (postForm.subcategoryId) {
      const subFieldsExist = customFields.some((cf) => cf.categoryId === postForm.subcategoryId);
      if (subFieldsExist) {
        return f.categoryId === postForm.subcategoryId;
      }
    }
    return f.categoryId === postForm.categoryId;
  });

  const handleDynamicAttrChange = (key: string, value: any) => {
    setPostForm((prev) => ({
      ...prev,
      dynamicAttributes: {
        ...prev.dynamicAttributes,
        [key]: value,
      },
    }));
  };

  const getCategoryIcon = (iconName?: string) => {
    const IconComp = (iconName && ICONS_MAP[iconName]) || Layers;
    return IconComp;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!postForm.title || !postForm.price) {
      addToast({
        title: 'Required Fields Missing',
        message: 'Please provide at least a title and valid price in ₹.',
        type: 'warning',
      });
      return;
    }

    if (!postForm.state || !postForm.city) {
      addToast({
        title: 'Location Required',
        message: 'Please select your State and City in India where the item or service is located.',
        type: 'warning',
      });
      return;
    }

    // Immediate duplicate check before submitting
    const duplicateCheck = await checkDuplicateTitle(postForm.title, currentUser?.id || 'usr_101');
    if (duplicateCheck.isDuplicate) {
      const errorMsg = duplicateCheck.message || DUPLICATE_TITLE_ERROR_MESSAGE;
      setTitleError(errorMsg);
      titleInputRef.current?.focus();
      titleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      addToast({
        title: 'Duplicate Ad Title Detected',
        message: errorMsg,
        type: 'error',
      });
      return;
    }

    const sellerId = currentUser?.id || 'usr_101';
    const sellerName = currentUser?.name || 'Rohit Verma';
    const sellerType = (currentUser?.type as any) || 'user';
    const sellerPhone = currentUser?.phone || '+91 98201 54321';
    const sellerAvatar = currentUser?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80';

    if (postForm.images.length === 0) {
      addToast({
        title: 'Photo Required',
        message: 'Please upload at least 1 photo of your item or service from your device.',
        type: 'warning',
      });
      return;
    }

    const finalImages = postForm.images.slice(0, 5);

    const newAd = addListing({
      title: postForm.title,
      categoryId: postForm.categoryId,
      subcategoryId: postForm.subcategoryId || undefined,
      sellerId,
      sellerName,
      sellerType,
      sellerPhone,
      sellerAvatar,
      price: Number(postForm.price),
      description: postForm.description || 'Genuine item, well maintained and used with care.',
      images: finalImages,
      status: requiresPayment ? 'approved' : 'pending', // Instant approval on payment!
      isFeatured: wantFeatured,
      featuredUntil: wantFeatured ? new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] : undefined,
      isBoosted: wantFeatured,
      location: {
        city: postForm.city,
        state: postForm.state,
        locality: postForm.locality,
      },
      customAttributes: postForm.dynamicAttributes,
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    });

    if (!newAd) {
      setTitleError(DUPLICATE_TITLE_ERROR_MESSAGE);
      titleInputRef.current?.focus();
      return;
    }

    if (requiresPayment) {
      const quotaDetails = isVolumeQuotaExceeded ? ` (includes ₹${volumeQuotaFee} Volume Quota Fee for ad #${userActiveListingsCount + 1})` : '';
      addToast({
        title: `Payment Processed: ₹${totalFee}`,
        message: `Payment of ₹${totalFee}${quotaDetails} received via ${paymentMethod.toUpperCase()}. Your ad #${newAd.id} is now live!`,
        type: 'success',
      });
    } else {
      addToast({
        title: 'Free Classified Ad Submitted!',
        message: `Your ad #${newAd.id} was posted using your free quota (${userActiveListingsCount + 1}/${freeQuotaLimit} active ads used).`,
        type: 'success',
      });
    }

    // Navigate to listing detail
    navigateTo(buildChillyUrl({ listing: newAd, categories }));
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 overflow-x-hidden">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateTo('/')}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
              title="Return to Classifieds"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-slate-950 tracking-tighter">
                Chillyads<span className="text-emerald-600">.in</span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Post Free Classified Ad
              </span>
            </div>
          </div>

          <button
            onClick={() => navigateTo('/')}
            className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
          >
            Cancel & Exit
          </button>
        </div>
      </header>

      {/* Main Posting Form */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Create Your Free Classified Listing
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Choose your main department and subcategory. Custom fields adapt dynamically to your selection.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Freemium Volume Quotas Policy Banner */}
          <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs transition-all ${
            isVolumeQuotaExceeded
              ? 'bg-amber-50/90 border-amber-300'
              : 'bg-emerald-50/90 border-emerald-300'
          }`}>
            <div className="flex items-start gap-3.5">
              <div className={`p-3 rounded-xl shrink-0 ${
                isVolumeQuotaExceeded ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
              }`}>
                <Layers className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Freemium Volume Quota Policy
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isVolumeQuotaExceeded
                      ? 'bg-amber-200 text-amber-950'
                      : 'bg-emerald-200 text-emerald-950'
                  }`}>
                    {isVolumeQuotaExceeded ? '⚡ Quota Reached' : `✓ ${remainingFreeListings} Free Active Slot${remainingFreeListings === 1 ? '' : 's'} Remaining`}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {isVolumeQuotaExceeded ? (
                    <>
                      You currently have <strong className="text-amber-900">{userActiveListingsCount} active listing{userActiveListingsCount === 1 ? '' : 's'}</strong>, reaching your baseline limit of <strong>{freeQuotaLimit} free active ads</strong>. Publishing this additional listing requires a volume quota fee of <strong className="text-amber-950 font-black">₹{extraListingFeeRate}</strong>.
                    </>
                  ) : (
                    <>
                      Your account receives a baseline of <strong className="text-emerald-900">{freeQuotaLimit} free active ad listings</strong>. You currently have <strong>{userActiveListingsCount} active ad{userActiveListingsCount === 1 ? '' : 's'}</strong> live. This ad will be published for <strong className="text-emerald-900 font-extrabold">FREE (₹0)</strong>.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="shrink-0 w-full sm:w-auto text-left sm:text-right bg-white/70 p-3 rounded-xl border border-slate-200/60">
              <div className="text-[11px] font-bold text-slate-700">
                Quota Usage ({userActiveListingsCount} / {freeQuotaLimit} Active Ads)
              </div>
              <div className="w-full sm:w-36 h-2 bg-slate-200 rounded-full overflow-hidden mt-1.5">
                <div
                  className={`h-full transition-all duration-500 ${
                    isVolumeQuotaExceeded ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (userActiveListingsCount / freeQuotaLimit) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 font-medium mt-1 block">
                {isVolumeQuotaExceeded ? `₹${extraListingFeeRate} per extra listing` : '₹0 within free quota'}
              </span>
            </div>
          </div>
          {/* Section 1: Choose Category & Subcategory */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-600" />
                1. Select Category & Subcategory
              </h2>
              {selectedCategory && (
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                  {selectedCategory.name}
                  {selectedSubcategory && ` › ${selectedSubcategory.name}`}
                </span>
              )}
            </div>

            {/* Step 1A: Parent Category Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Select Department / Main Category *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                {rootCategories.map((cat) => {
                  const isSelected = postForm.categoryId === cat.id;
                  const IconComp = getCategoryIcon(cat.icon);
                  const subCount = categories.filter((c) => c.parentId === cat.id).length;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        const childSubs = categories.filter((c) => c.parentId === cat.id && c.isActive);
                        setPostForm({
                          ...postForm,
                          categoryId: cat.id,
                          subcategoryId: childSubs[0]?.id || '',
                          dynamicAttributes: {}, // reset custom attributes on category switch
                        });
                      }}
                      className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-500/20 text-blue-950 font-bold shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] leading-tight font-bold">{cat.name}</span>
                      {subCount > 0 && (
                        <span className="text-[9px] text-slate-400 font-normal">
                          {subCount} subcategories
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 1B: Subcategory Selector */}
            {currentSubcategories.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 animate-in fade-in duration-150">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CornerDownRight className="w-4 h-4 text-blue-600" />
                  Select Specific Subcategory for <span className="text-blue-600">{selectedCategory?.name}</span> *
                </label>
                <div className="flex flex-wrap gap-2">
                  {currentSubcategories.map((sub) => {
                    const isSubSelected = postForm.subcategoryId === sub.id;
                    const SubIcon = getCategoryIcon(sub.icon);

                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          setPostForm({
                            ...postForm,
                            subcategoryId: sub.id,
                          });
                        }}
                        className={`px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-all cursor-pointer ${
                          isSubSelected
                            ? 'bg-blue-600 text-white font-bold shadow-sm ring-2 ring-blue-500/30'
                            : 'bg-white border border-slate-300 hover:border-slate-400 text-slate-800 font-medium'
                        }`}
                      >
                        <SubIcon className={`w-3.5 h-3.5 ${isSubSelected ? 'text-white' : 'text-slate-500'}`} />
                        <span>{sub.name}</span>
                        {isSubSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Ad Title & Description */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              2. Include Some Details
            </h2>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="ad-title-input" className="block text-xs font-semibold text-slate-700">
                  Ad Title *
                </label>
                {isCheckingTitle && (
                  <span className="text-[11px] text-slate-400 animate-pulse">Checking uniqueness...</span>
                )}
              </div>
              <input
                id="ad-title-input"
                ref={titleInputRef}
                type="text"
                required
                value={postForm.title}
                onChange={(e) => {
                  setPostForm({ ...postForm, title: e.target.value });
                  if (titleError) setTitleError(null);
                }}
                placeholder="e.g. 2023 Hyundai Creta SX (O) Turbo Automatic Sunroof"
                className={`w-full text-sm rounded-xl px-4 py-2.5 transition-all focus:outline-none ${
                  titleError
                    ? 'border-2 border-red-500 bg-red-50/20 text-slate-900 focus:ring-2 focus:ring-red-300'
                    : 'border border-slate-300 focus:ring-2 focus:ring-blue-500'
                }`}
              />

              {/* Prominent Duplicate Title Detection Error Alert */}
              {titleError && (
                <div
                  id="duplicate-title-alert"
                  className="mt-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-2.5 animate-in fade-in duration-150"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1.5 flex-1">
                    <div className="font-bold text-red-900 leading-snug">
                      {titleError}
                    </div>
                    <div className="text-[11px] text-red-700 leading-relaxed">
                      Titles must be unique per seller (ignoring case and extra spaces). You can add distinct details such as year, variant, condition, or color.
                    </div>
                    <div className="pt-1 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => navigateTo('/user')}
                        className="text-[11px] font-extrabold text-blue-700 hover:text-blue-900 underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        View & Edit your existing ads &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <span className="text-[11px] text-slate-400 mt-1 block">
                Mention key features, brand, model, and condition (must be unique among your ads).
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description *
              </label>
              <textarea
                rows={4}
                required
                value={postForm.description}
                onChange={(e) => setPostForm({ ...postForm, description: e.target.value })}
                placeholder="Describe what makes your ad unique. Include service history, accessories, reason for selling, etc."
                className="w-full text-sm border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
              />

              <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 flex items-start gap-2.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong className="text-slate-900 font-bold">Anti-Spam & Security Link Policy:</strong> Live clickable links are disabled in ad descriptions. Any web URLs entered will render as unclickable plain text on the listing page.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Category Dynamic Custom Attributes (EAV System) */}
          {activeCategoryFields.length > 0 && selectedCategory && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  3. {selectedSubcategory ? selectedSubcategory.name : selectedCategory.name} Specifications
                </h2>
                <span className="text-[11px] text-slate-400 font-mono">Dynamic Category Attributes</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeCategoryFields.map((field: CustomFieldDefinition) => (
                  <div key={field.name}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {field.label} {field.unit && <span className="text-slate-400 font-normal">({field.unit})</span>} {field.required && <span className="text-rose-500">*</span>}
                    </label>

                    {field.type === 'select' && field.options ? (
                      <select
                        required={field.required}
                        value={postForm.dynamicAttributes[field.name] || ''}
                        onChange={(e) => handleDynamicAttrChange(field.name, e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                      >
                        <option value="">Select {field.label}...</option>
                        {field.options.map((opt: string) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'radio' && field.options ? (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {field.options.map((opt: string) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleDynamicAttrChange(field.name, opt)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              postForm.dynamicAttributes[field.name] === opt
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type={field.type === 'number' ? 'number' : 'text'}
                          required={field.required}
                          value={postForm.dynamicAttributes[field.name] || ''}
                          onChange={(e) => handleDynamicAttrChange(field.name, e.target.value)}
                          placeholder={`Enter ${field.label.toLowerCase()}${field.unit ? ` (${field.unit})` : ''}`}
                          className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        {field.unit && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-400 pointer-events-none">
                            {field.unit}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Set a Price */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-blue-600" />
              4. Set a Price (₹)
            </h2>

            <div className="max-w-xs">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Asking Price in Rupees *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold text-sm">₹</span>
                <input
                  type="number"
                  required
                  value={postForm.price}
                  onChange={(e) => setPostForm({ ...postForm, price: e.target.value })}
                  placeholder="e.g. 850000"
                  className="w-full text-base font-bold pl-8 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              {postForm.price && (
                <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
                  ₹{Number(postForm.price).toLocaleString('en-IN')}
                </span>
              )}
            </div>
          </div>

          {/* Section 5: Photos & Upload Gallery (Up to 5 Photos Max) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                5. Upload Listing Photos (Up to 5 Photos Max)
              </h2>
              <span className={`px-3 py-1 rounded-full text-xs font-black ${
                postForm.images.length >= 5
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}>
                {postForm.images.length} / 5 Photos
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Upload actual photographs of your item or service directly from your device. Photo #1 serves as the primary cover image.
            </p>

            {/* Custom Device File Upload Zone */}
            <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 transition-all duration-150 text-center bg-slate-50 relative cursor-pointer group">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                disabled={postForm.images.length >= 5}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-full shadow-xs border border-slate-100 group-hover:scale-105 transition-transform text-blue-600">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-800">
                  {postForm.images.length >= 5 ? 'Photo limit reached' : 'Click to Upload or Drag Photos Here'}
                </div>
                <div className="text-[11px] text-slate-500">
                  Supports PNG, JPG, JPEG, WEBP (Max 5MB each)
                </div>
              </div>
            </div>

            {/* Render uploaded image previews */}
            {postForm.images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-2">
                {postForm.images.map((imgUrl, index) => (
                  <div key={index} className="relative aspect-square rounded-xl border border-slate-200 overflow-hidden bg-slate-100 group shadow-xs">
                    <img src={imgUrl} alt={`Uploaded Preview ${index + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute top-1.5 left-1.5">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-sm border ${
                        index === 0
                          ? 'bg-emerald-500 text-white border-emerald-600'
                          : 'bg-white/90 text-slate-800 border-slate-200'
                      }`}>
                        {index === 0 ? 'Cover' : `#${index + 1}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1.5 right-1.5 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md hover:scale-110 transition-transform cursor-pointer"
                      title="Remove Photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 6: Confirm Your Location */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  6. Location in India (State → City → Locality)
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Specify the exact location where buyers can view or collect this item
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <span>🇮🇳 India</span>
                  {postForm.state && (
                    <>
                      <span className="text-slate-300">›</span>
                      <span>{postForm.state}</span>
                    </>
                  )}
                  {postForm.city && (
                    <>
                      <span className="text-slate-300">›</span>
                      <span>{postForm.city}</span>
                    </>
                  )}
                </span>

                {currentUser?.location?.city && (postForm.city !== currentUser.location.city || postForm.state !== currentUser.location.state) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPostForm((prev) => ({
                        ...prev,
                        country: 'India',
                        state: currentUser.location.state,
                        city: currentUser.location.city,
                        locality: '',
                      }));
                      addToast({
                        title: 'Location Set from Profile',
                        message: `Set to ${currentUser.location.city}, ${currentUser.location.state}`,
                        type: 'info',
                      });
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-full transition-colors cursor-pointer flex items-center gap-1"
                    title={`Autofill ${currentUser.location.city}, ${currentUser.location.state}`}
                  >
                    <MapPin className="w-3 h-3" />
                    Use My Profile Location
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* State Selection (Tier 1 for India) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  State / Union Territory *
                </label>
                <select
                  value={postForm.state}
                  onChange={(e) => {
                    const selectedState = e.target.value;
                    setPostForm({
                      ...postForm,
                      state: selectedState,
                      city: '', // Dynamically reset city to empty whenever state changes
                      locality: '',
                    });
                  }}
                  className={`w-full text-xs border rounded-xl px-3 py-2.5 bg-slate-50 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer ${
                    !postForm.state ? 'border-amber-300 bg-amber-50/40 text-slate-700 font-semibold' : 'border-slate-300'
                  }`}
                >
                  <option value="">— Select State / Union Territory —</option>
                  {sortedStates.map((st) => (
                    <option key={st.id} value={st.name}>
                      🏛️ {st.name} {st.code ? `(${st.code})` : ''}
                    </option>
                  ))}
                </select>
                {!postForm.state && (
                  <span className="text-[10px] text-amber-600 font-medium mt-1 block">
                    Please select your state first
                  </span>
                )}
              </div>

              {/* City Selection (Tier 2 - Cascades dynamically based on State) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  City / District *
                </label>
                <select
                  value={postForm.city}
                  disabled={!postForm.state}
                  onChange={(e) => setPostForm({ ...postForm, city: e.target.value, locality: '' })}
                  className={`w-full text-xs border rounded-xl px-3 py-2.5 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer ${
                    !postForm.state
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : !postForm.city
                      ? 'bg-amber-50/40 border-amber-300 text-slate-700 font-semibold'
                      : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <option value="">
                    {!postForm.state
                      ? '— Select State First —'
                      : availableCities.length > 0
                      ? `— Select City in ${postForm.state} (${availableCities.length} Cities) —`
                      : `— Select City in ${postForm.state} —`}
                  </option>
                  {availableCities.map((city) => (
                    <option key={city.id} value={city.name}>
                      📍 {city.name} {city.code ? `(${city.code})` : ''}
                    </option>
                  ))}
                </select>
                {postForm.state && !postForm.city && (
                  <span className="text-[10px] text-amber-600 font-medium mt-1 block">
                    {availableCities.length > 0
                      ? `${availableCities.length} cities available in ${postForm.state}`
                      : `Select city in ${postForm.state}`}
                  </span>
                )}
              </div>

              {/* Locality Input (Tier 3) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Locality / Neighborhood / Sector
                </label>
                {(() => {
                  const selectedCityObj = cities.find(
                    (c) => c.name.toLowerCase() === postForm.city.toLowerCase()
                  );
                  return (
                    <LocalityCombobox
                      city={postForm.city}
                      cityId={selectedCityObj?.id}
                      value={postForm.locality}
                      onChange={(newLocality) =>
                        setPostForm({ ...postForm, locality: newLocality })
                      }
                      localities={localities}
                      placeholder={
                        postForm.city
                          ? `Locality in ${postForm.city} (e.g. Bandra, Indiranagar)...`
                          : 'Select a city first...'
                      }
                    />
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Section 7: Boost & Feature Your Ad */}
          {isFeaturedEnabled && (
            <div className={`rounded-2xl border p-6 shadow-sm space-y-4 transition-all duration-300 ${
              wantFeatured 
                ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-300/40' 
                : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl text-white ${wantFeatured ? 'bg-amber-500' : 'bg-slate-400'}`}>
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      7. Boost & Feature Your Ad (Optional)
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">
                      Featured Ads appear at the very top of their respective category and subcategory listings. 
                      Get up to <strong className="text-amber-700">10x more visibility</strong>, instant views, and quick inquiries from premium buyers.
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-black text-slate-900 bg-amber-100 text-amber-950 px-2.5 py-1 rounded-full">
                    {currencySymbol}{featuredAdPrice} / {paidCfg?.featuredAdDurationDays || 30} Days
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="featuredCheckbox"
                    checked={wantFeatured}
                    onChange={(e) => {
                      setWantFeatured(e.target.checked);
                      if (e.target.checked) {
                        addToast({
                          type: 'success',
                          title: 'Featured Promotion Added',
                          message: `Successfully added Featured Ad promotion (${currencySymbol}${featuredAdPrice}) to your checkout invoice.`,
                        });
                      }
                    }}
                    className="w-4 h-4 text-amber-600 border-slate-300 rounded-md focus:ring-amber-500 cursor-pointer"
                  />
                  <label htmlFor="featuredCheckbox" className="text-xs font-bold text-slate-800 cursor-pointer select-none">
                    Yes, make my ad a Featured Ad for {currencySymbol}{featuredAdPrice} ({paidCfg?.featuredAdDurationDays || 30} Days Validity)
                  </label>
                </div>
                {wantFeatured && (
                  <span className="text-xs font-bold text-amber-600 flex items-center gap-1 animate-pulse">
                    ⚡ Premium Boost Active
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Paid Subcategory or Featured Boost Fee Notice & Checkout Card */}
          {requiresPayment && (
            <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-6 shadow-sm space-y-4 animate-in fade-in duration-200">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-amber-200">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500 text-white rounded-xl shadow-xs">
                    <IndianRupee className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px] uppercase tracking-wider">
                      Unified Checkout
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                      Secured Payment Summary
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Complete payment to publish your ad with selected premium upgrades.
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-2xl font-black text-slate-950">₹{totalFee}</span>
                  <span className="block text-[10px] text-slate-500 font-medium">Includes 18% GST</span>
                </div>
              </div>

              {/* Detailed Invoice Breakdown */}
              <div className="text-xs space-y-1.5 text-slate-700 bg-amber-100/40 p-3.5 rounded-xl border border-amber-200/50">
                {isPaidSubcategory && (
                  <div className="flex justify-between">
                    <span>Base Posting Fee ({selectedSubcategory?.name || selectedCategory?.name}):</span>
                    <span className="font-semibold">₹{postingFeeAmount}</span>
                  </div>
                )}
                {isVolumeQuotaExceeded ? (
                  <div className="flex justify-between text-amber-950 font-bold">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-amber-600" /> Volume Quota Fee (Listing #{userActiveListingsCount + 1}):
                    </span>
                    <span>₹{volumeQuotaFee}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-emerald-800 font-medium">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Free Active Listing Quota ({userActiveListingsCount + 1}/{freeQuotaLimit}):
                    </span>
                    <span className="font-bold text-emerald-700">FREE (₹0)</span>
                  </div>
                )}
                {wantFeatured && (
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1 text-amber-900 font-semibold">
                      <Sparkles className="w-3 h-3 text-amber-600" /> Premium Featured Promotion (30 days):
                    </span>
                    <span className="font-bold text-amber-950">₹100</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-amber-200/60 pt-1.5 text-sm font-black text-slate-900">
                  <span>Grand Total to Pay:</span>
                  <span>₹{totalFee}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="pt-3 border-t border-amber-200/80">
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Select Instant Payment Method *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      paymentMethod === 'upi'
                        ? 'border-amber-600 bg-white ring-2 ring-amber-500/30 text-amber-950 font-bold shadow-xs'
                        : 'border-amber-200 bg-amber-100/50 hover:bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-bold">BHIM UPI / GPay</span>
                    </div>
                    {paymentMethod === 'upi' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      paymentMethod === 'card'
                        ? 'border-amber-600 bg-white ring-2 ring-amber-500/30 text-amber-950 font-bold shadow-xs'
                        : 'border-amber-200 bg-amber-100/50 hover:bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold">Credit / Debit Card</span>
                    </div>
                    {paymentMethod === 'card' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('netbanking')}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      paymentMethod === 'netbanking'
                        ? 'border-amber-600 bg-white ring-2 ring-amber-500/30 text-amber-950 font-bold shadow-xs'
                        : 'border-amber-200 bg-amber-100/50 hover:bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold">NetBanking</span>
                    </div>
                    {paymentMethod === 'netbanking' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Submit Actions Bar */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => navigateTo('/')}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className={`px-8 py-3 text-white font-bold rounded-xl shadow-lg text-sm flex items-center gap-2 transition-all cursor-pointer hover:scale-102 ${
                requiresPayment
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
              }`}
            >
              {requiresPayment ? (
                <>
                  <IndianRupee className="w-4 h-4" />
                  <span>Pay ₹{totalFee} & Post Ad Now</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Post Classified Ad Now</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};
