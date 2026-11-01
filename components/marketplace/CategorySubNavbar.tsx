'use client';
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Layers, Grid } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { navigateTo } from '@/lib/router/useRouter';
import { buildChillyUrl } from '@/lib/utils/seoAndUrlHelper';

interface CategorySubNavbarProps {
  currentCity?: string;
  activeCategoryId?: string;
  activeSubcategoryId?: string;
}

interface TrendingCategoryItem {
  label: string;
  categoryId: string;
  subcategoryId?: string;
}

export const CategorySubNavbar: React.FC<CategorySubNavbarProps> = ({
  currentCity,
  activeCategoryId,
  activeSubcategoryId,
}) => {
  const {
    categories,
    selectedMarketplaceCity,
    setSelectedMarketplaceCategory,
    setSelectedMarketplaceSubcategory,
  } = useApp();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const city = currentCity || selectedMarketplaceCity || 'All India';

  // OLX Trending / Top Popular Category Links
  const trendingCategories: TrendingCategoryItem[] = [
    { label: 'Cars', categoryId: 'cat_cars', subcategoryId: 'sub_cars_cars' },
    { label: 'Motorcycles', categoryId: 'cat_bikes', subcategoryId: 'sub_bikes_motorcycles' },
    { label: 'Mobile Phones', categoryId: 'cat_mobiles', subcategoryId: 'sub_mob_phones' },
    {
      label: 'For Sale: Houses & Apartments',
      categoryId: 'cat_housing_realestate',
      subcategoryId: 'sub_house_apt_sale',
    },
    {
      label: 'For Rent: Houses & Apartments',
      categoryId: 'cat_housing_realestate',
      subcategoryId: 'sub_house_apt_rent',
    },
    {
      label: 'Beds - Wardrobes',
      categoryId: 'cat_furniture',
      subcategoryId: 'sub_furn_beds_wardrobes',
    },
    {
      label: 'TVs, Video - Audio',
      categoryId: 'cat_electronics',
      subcategoryId: 'sub_elec_tv',
    },
  ];

  // Group categories into parent -> children
  const rootCategories = categories.filter((c) => c.parentId === null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = (catId: string, subId: string = 'all') => {
    setSelectedMarketplaceCategory(catId);
    setSelectedMarketplaceSubcategory(subId);
    setIsDropdownOpen(false);
    setMobileDrawerOpen(false);

    const targetUrl = buildChillyUrl({
      city,
      categoryId: catId,
      subcategoryId: subId,
      categories,
    });
    navigateTo(targetUrl);
  };

  const toggleDropdown = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileDrawerOpen(true);
    } else {
      setIsDropdownOpen((prev) => !prev);
    }
  };

  return (
    <div className="bg-white border-b border-slate-200/90 shadow-xs relative z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
        {/* Navbar Container */}
        <div className="flex items-center gap-3 sm:gap-6 py-2">
          {/* "ALL CATEGORIES" Dropdown Trigger */}
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={toggleDropdown}
              aria-expanded={isDropdownOpen || mobileDrawerOpen}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer select-none ${
                isDropdownOpen || mobileDrawerOpen
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>ALL CATEGORIES</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isDropdownOpen || mobileDrawerOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Desktop Multi-Column Megamenu Dropdown */}
            {isDropdownOpen && (
              <div className="hidden md:block absolute left-0 top-full mt-2 w-[840px] max-w-[90vw] bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 z-[100] animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Explore All Categories
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      in {city}
                    </span>
                  </div>
                  <a
                    href={buildChillyUrl({
                      city,
                      categoryId: 'all',
                      subcategoryId: 'all',
                      categories,
                    })}
                    className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    View All Classifieds Directory →
                  </a>
                </div>

                {/* 4-column category grid */}
                <div className="grid grid-cols-4 gap-6 max-h-[460px] overflow-y-auto pr-2 scrollbar-thin">
                  {rootCategories.map((rootCat) => {
                    const children = categories.filter((c) => c.parentId === rootCat.id);
                    const rootHref = buildChillyUrl({
                      city,
                      categoryId: rootCat.id,
                      subcategoryId: 'all',
                      categories,
                    });
                    return (
                      <div key={rootCat.id} className="space-y-2">
                        {/* Parent Category Header */}
                        <a
                          href={rootHref}
                          className="font-black text-xs text-slate-900 hover:text-blue-600 transition-colors block text-left truncate w-full cursor-pointer group"
                        >
                          <span className="group-hover:underline">{rootCat.name}</span>
                        </a>

                        {/* Child Subcategories */}
                        {children.length > 0 && (
                          <div className="space-y-1 pl-1">
                            {children.map((sub) => {
                              const isSubActive =
                                activeCategoryId === rootCat.id &&
                                activeSubcategoryId === sub.id;
                              const subHref = buildChillyUrl({
                                city,
                                categoryId: rootCat.id,
                                subcategoryId: sub.id,
                                categories,
                              });
                              return (
                                <a
                                  key={sub.id}
                                  href={subHref}
                                  className={`text-[11px] block text-left truncate w-full transition-colors cursor-pointer py-0.5 ${
                                    isSubActive
                                      ? 'text-blue-600 font-extrabold'
                                      : 'text-slate-500 hover:text-slate-900 hover:underline'
                                  }`}
                                  title={sub.name}
                                >
                                  {sub.name}
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Trending Categories Horizontal Links Container */}
          <div className="flex-1 min-w-0 flex items-center gap-1.5 sm:gap-3 overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
            {trendingCategories.map((item) => {
              const isActive =
                activeCategoryId === item.categoryId &&
                (item.subcategoryId ? activeSubcategoryId === item.subcategoryId : true);
              const href = buildChillyUrl({
                city,
                categoryId: item.categoryId,
                subcategoryId: item.subcategoryId || 'all',
                categories,
              });

              return (
                <a
                  key={item.label}
                  href={href}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer shrink-0 select-none ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-extrabold border border-blue-200 shadow-xs'
                      : 'text-slate-700 hover:text-blue-600 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Fullscreen Slide-Up Category Explorer Drawer */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-slate-900 uppercase tracking-wider">
                  All Categories
                </span>
                <span className="text-xs text-slate-400 font-medium">({city})</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick All Classifieds Button */}
            <div className="p-3 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between">
              <span className="text-xs text-blue-950 font-bold">Browse everything in {city}</span>
              <a
                href={buildChillyUrl({
                  city,
                  categoryId: 'all',
                  subcategoryId: 'all',
                  categories,
                })}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                View All
              </a>
            </div>

            {/* Category List */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1 divide-y divide-slate-100">
              {rootCategories.map((rootCat) => {
                const children = categories.filter((c) => c.parentId === rootCat.id);
                const rootHref = buildChillyUrl({
                  city,
                  categoryId: rootCat.id,
                  subcategoryId: 'all',
                  categories,
                });
                return (
                  <div key={rootCat.id} className="pt-3 first:pt-0 space-y-2">
                    <a
                      href={rootHref}
                      className="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center justify-between w-full text-left cursor-pointer"
                    >
                      <span className="text-blue-900">{rootCat.name}</span>
                      <span className="text-[10px] text-blue-600 font-bold">All {rootCat.name} →</span>
                    </a>

                    {children.length > 0 && (
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        {children.map((sub) => (
                          <a
                            key={sub.id}
                            href={buildChillyUrl({
                              city,
                              categoryId: rootCat.id,
                              subcategoryId: sub.id,
                              categories,
                            })}
                            className="text-left text-xs text-slate-600 hover:text-blue-600 p-2 rounded-lg bg-slate-50 border border-slate-100 truncate font-medium active:bg-blue-100 cursor-pointer block"
                          >
                            {sub.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
