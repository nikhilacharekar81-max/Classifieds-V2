'use client';
import React, { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  ShieldCheck,
  Flag,
  UserX,
  FileText,
  Lock,
  Award,
  Cookie,
  Radio,
  SlidersHorizontal,
  Flame,
  ChevronRight,
  ShieldAlert,
  FileCode,
  Sliders,
  ExternalLink,
  MapPin,
  PhoneCall,
  HelpCircle,
  Headphones,
  Info,
} from 'lucide-react';
import { navigateTo } from '@/lib/router/useRouter';
import { buildChillyUrl } from '@/lib/utils/seoAndUrlHelper';

export const Footer: React.FC = () => {
  const {
    openCmsPageModal,
    openReportModal,
    openCmpModal,
    openUsPrivacyModal,
    openEeatModal,
    setSelectedMarketplaceCategory,
    setSelectedMarketplaceCity,
    setViewMode,
    settings,
    listings,
    categories,
  } = useApp();

  const privacyEnabled = settings?.enablePrivacyChoices ?? false;

  // Filter ONLY cities that have active published listings to prevent "Valueless Inventory" Google rejections
  const activeCitiesWithListings = useMemo(() => {
    const cityCounts: Record<string, number> = {};
    listings.forEach((listing) => {
      if (listing.status === 'approved' && listing.location?.city) {
        const city = listing.location.city.trim();
        cityCounts[city] = (cityCounts[city] || 0) + 1;
      }
    });

    return Object.entries(cityCounts)
      .filter(([_, count]) => count > 0)
      .map(([cityName, count]) => ({ name: cityName, count }))
      .sort((a, b) => b.count - a.count);
  }, [listings]);

  const handleCategoryClick = (e: React.MouseEvent, catId: string) => {
    e.preventDefault();
    setSelectedMarketplaceCategory(catId);
    const targetUrl = buildChillyUrl({ categoryId: catId, categories });
    navigateTo(targetUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCityClick = (e: React.MouseEvent, cityName: string) => {
    e.preventDefault();
    setSelectedMarketplaceCity(cityName);
    const targetUrl = buildChillyUrl({ city: cityName, categories });
    navigateTo(targetUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminClick = () => {
    setViewMode('admin');
    navigateTo('/admin');
  };

  return (
    <footer className="bg-slate-900 text-slate-300 pt-10 pb-28 sm:pb-24 md:pb-12 border-t border-slate-800 font-sans mt-16 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* ================= HEADER TOP BAR ================= */}
        <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-lg">
          {/* Logo / Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
              <Flame className="w-6 h-6 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-white tracking-tight">Chillyads</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                  Verified Local Marketplace
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                India's Trusted Local Marketplace • 100% Free Classifieds
              </p>
            </div>
          </div>

          {/* Entity Information Badge */}
          <div className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700/70 text-xs text-slate-300 flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="font-semibold text-slate-200">Entity: Chillyads India Pvt Ltd</span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="text-slate-400 font-mono text-[11px]">GSTIN: 27AABCC1234H1Z5</span>
          </div>

          {/* [E-E-A-T Credentials Schema Link] Button */}
          <button
            onClick={openEeatModal}
            className="px-4 py-3 rounded-xl bg-gradient-to-r from-blue-900/90 to-indigo-900/90 hover:from-blue-800 hover:to-indigo-800 text-white border border-blue-500/40 font-bold text-xs flex items-center gap-2.5 shadow-md hover:shadow-blue-500/10 transition-all shrink-0 min-h-[48px] min-w-[220px] justify-center cursor-pointer"
          >
            <Award className="w-4 h-4 text-yellow-400" />
            <span>E-E-A-T Credentials & Schema Graph</span>
            <FileCode className="w-3.5 h-3.5 text-blue-300" />
          </button>
        </div>

        {/* ================= COMPLIANCE & ARCHITECTURE MATRIX (4 COLUMNS) ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          
          {/* COLUMN 1: INDIAN COMPLIANCE */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-100">
                INDIAN COMPLIANCE
              </h3>
            </div>

            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => openCmsPageModal('contact-us')}
                  className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-white transition flex items-center justify-between text-xs font-semibold min-h-[48px] cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Grievance Officer
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </li>

              <li>
                <button
                  onClick={() => openCmsPageModal('contact-us')}
                  className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-white transition flex items-center justify-between text-xs font-semibold min-h-[48px] cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Nodal Desk (Govt / Law)
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </li>

              <li>
                <button
                  onClick={() => openReportModal('ad')}
                  className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-white transition flex items-center justify-between text-xs font-semibold min-h-[48px] cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Report Fraud / Bad Ad
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </li>

              <li>
                <button
                  onClick={() => openCmsPageModal('terms-and-conditions')}
                  className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-white transition flex items-center justify-between text-xs font-semibold min-h-[48px] cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Intermediary Rules 2021
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </li>
            </ul>
          </div>

          {/* COLUMN 2: SAFETY & TRUST */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-100">
                SAFETY & TRUST
              </h3>
            </div>

            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => openCmsPageModal('safety-tips')}
                  className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-white transition flex items-center justify-between text-xs font-semibold min-h-[48px] cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Anti-Scam Guidelines
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </li>

              <li>
                <button
                  onClick={() => openCmsPageModal('editorial-guidelines')}
                  className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-white transition flex items-center justify-between text-xs font-semibold min-h-[48px] cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Prohibited Items List
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </li>

              <li>
                <button
                  onClick={() => openCmsPageModal('help-support')}
                  className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-white transition flex items-center justify-between text-xs font-semibold min-h-[48px] cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    How Posting Works
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </li>

              <li>
                <button
                  onClick={openEeatModal}
                  className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-white transition flex items-center justify-between text-xs font-semibold min-h-[48px] cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    E-E-A-T Credentials & Schema
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </li>
            </ul>
          </div>

          {/* COLUMN 3: SITE & LOCATIONS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-100">
                SITE & LOCATIONS
              </h3>
            </div>

            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => openCmsPageModal('sitemap')}
                  className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-white transition flex items-center justify-between text-xs font-semibold min-h-[48px] cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    Category Sitemap
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </li>

              <li>
                <button
                  onClick={() => openCmsPageModal('sitemap')}
                  className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-white transition flex items-center justify-between text-xs font-semibold min-h-[48px] cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    HTML Sitemap & Directory
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </li>

              <li>
                <button
                  onClick={() => openCmsPageModal('editorial-guidelines')}
                  className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-white transition flex items-center justify-between text-xs font-semibold min-h-[48px] cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    Editorial Guidelines
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </li>

              <li>
                <button
                  onClick={() => openCmsPageModal('corrections-policy')}
                  className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-white transition flex items-center justify-between text-xs font-semibold min-h-[48px] cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    Corrections Policy
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </li>
            </ul>
          </div>

          {/* COLUMN 4: LEGAL & POLICY */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <Lock className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-100">
                LEGAL & POLICY
              </h3>
            </div>

            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => openCmsPageModal('privacy-policy')}
                  className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-white transition flex items-center justify-between text-xs font-semibold min-h-[48px] cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    Privacy Policy
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </li>

              <li>
                <button
                  onClick={() => openCmsPageModal('terms-and-conditions')}
                  className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-white transition flex items-center justify-between text-xs font-semibold min-h-[48px] cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    Terms of Use
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </li>

              <li>
                <button
                  onClick={() => openCmsPageModal('dmca-takedown')}
                  className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-white transition flex items-center justify-between text-xs font-semibold min-h-[48px] cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    DMCA / Takedown
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </li>

              <li>
                <button
                  onClick={openCmpModal}
                  className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-white transition flex items-center justify-between text-xs font-semibold min-h-[48px] cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Cookie className="w-4 h-4 text-purple-400" />
                    Cookie Settings
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-purple-900/60 text-purple-300 border border-purple-700/50 font-bold">
                    CMP
                  </span>
                </button>
              </li>

              {privacyEnabled && (
                <li>
                  <button
                    onClick={openUsPrivacyModal}
                    className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-white transition flex items-center justify-between text-xs font-semibold min-h-[48px] cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <svg className="w-4 h-3 fill-current text-blue-400" viewBox="0 0 30 14" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.4 12.8h6.8l3.1-11.6H10.5L7.4 12.8zm11.3 0h6.8l3.1-11.6h-6.8l-3.1 11.6zM2.8 1.2L0 12.8h4.5l2.8-11.6H2.8z" />
                      </svg>
                      Do Not Sell / Share
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-blue-900/60 text-blue-300 border border-blue-700/50 font-bold">
                      CPRA
                    </span>
                  </button>
                </li>
              )}
            </ul>
          </div>

        </div>

        {/* ================= ACTIVE CITY HUBS & POPULAR CATEGORIES ================= */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4 border-t border-slate-800">
          
          {/* STATIC CANONICAL CATEGORY LINKS */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Explore Popular Categories (Canonical Static URLs)
            </h4>
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                { id: 'cat_jobs', label: 'Jobs & Vacancies' },
                { id: 'cat_bikes', label: 'Bikes & Scooters' },
                { id: 'cat_electronics', label: 'Electronics & Laptops' },
                { id: 'cat_mobiles', label: 'Mobiles & Tablets' },
                { id: 'cat_cars', label: 'Cars & Auto Spares' },
                { id: 'cat_services', label: 'Local Services' },
                { id: 'cat_pets', label: 'Pets & Aquariums' },
              ].map((cat) => {
                const canonicalUrl = buildChillyUrl({ categoryId: cat.id, categories });
                return (
                  <a
                    key={cat.id}
                    href={canonicalUrl}
                    onClick={(e) => handleCategoryClick(e, cat.id)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition min-h-[48px] flex items-center font-medium border border-slate-700/40 cursor-pointer"
                  >
                    {cat.label}
                  </a>
                );
              })}
            </div>
          </div>

          {/* ACTIVE CITIES ONLY WITH LIVE LISTINGS (PREVENTS VALUELESS INVENTORY REJECTION) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Active City Hubs (Live Ads Only)
              </h4>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Verified Inventory
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <a
                href={buildChillyUrl({ city: 'All India', categories })}
                onClick={(e) => handleCityClick(e, 'All India')}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 font-bold transition border border-emerald-700/50 flex items-center gap-1 min-h-[44px] cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>All India</span>
              </a>

              {activeCitiesWithListings.map(({ name, count }) => {
                const canonicalUrl = buildChillyUrl({ city: name, categories });
                return (
                  <a
                    key={name}
                    href={canonicalUrl}
                    onClick={(e) => handleCityClick(e, name)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 transition text-xs font-medium border border-slate-700/50 flex items-center gap-1.5 min-h-[44px] cursor-pointer"
                  >
                    <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>{name}</span>
                    <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.2 rounded-full font-semibold">
                      {count}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* TRUST & REPORTING ACTIONS */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Trust & Safety Actions
            </h4>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => openReportModal('ad')}
                className="w-full text-left px-3.5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold flex items-center justify-between border border-red-500/20 transition min-h-[48px] cursor-pointer"
              >
                <span className="flex items-center gap-2 text-xs">
                  <Flag className="w-4 h-4 shrink-0" /> Report Suspicious Ad
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => openReportModal('user')}
                className="w-full text-left px-3.5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-semibold flex items-center justify-between border border-amber-500/20 transition min-h-[48px] cursor-pointer"
              >
                <span className="flex items-center gap-2 text-xs">
                  <UserX className="w-4 h-4 shrink-0" /> Report Scammer / User
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

        {/* 30px MANDATORY VERTICAL BUFFER ZONE FOR MOBILE STICKY BARS */}
        <div className="h-[30px] w-full shrink-0" aria-hidden="true" />

        {/* ================= BOTTOM BAR ================= */}
        <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <span>© 2026 Chillyads India Pvt Ltd. Registered under Information Technology (Intermediaries) Rules, 2021.</span>
            <button
              onClick={handleAdminClick}
              className="text-slate-400 hover:text-white underline font-medium flex items-center gap-1 min-h-[48px] px-2 cursor-pointer"
            >
              <SlidersHorizontal className="w-3 h-3" /> Admin CMS
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <button onClick={() => openCmsPageModal('help-support')} className="hover:text-slate-300 text-emerald-400 font-bold min-h-[48px] px-1 flex items-center cursor-pointer">
              Help & Support
            </button>
            <span>•</span>
            <button onClick={() => openCmsPageModal('privacy-policy')} className="hover:text-slate-300 min-h-[48px] px-1 flex items-center cursor-pointer">
              Privacy Policy
            </button>
            <span>•</span>
            <button onClick={() => openCmsPageModal('terms-and-conditions')} className="hover:text-slate-300 min-h-[48px] px-1 flex items-center cursor-pointer">
              Terms & Conditions
            </button>
            <span>•</span>
            <button onClick={() => openCmsPageModal('dmca-takedown')} className="hover:text-slate-300 min-h-[48px] px-1 flex items-center cursor-pointer">
              DMCA Takedown
            </button>
            {privacyEnabled && (
              <>
                <span>•</span>
                <button onClick={openCmpModal} className="hover:text-slate-300 text-purple-400 font-semibold min-h-[48px] px-1 flex items-center cursor-pointer">
                  Cookie Preferences
                </button>
              </>
            )}
          </div>
        </div>

        {/* MANDATORY SECONDARY 30PX BOTTOM BUFFER FOR MOBILE USABILITY CHECKS */}
        <div className="h-[30px] w-full shrink-0 md:hidden" aria-hidden="true" />

      </div>
    </footer>
  );
};

