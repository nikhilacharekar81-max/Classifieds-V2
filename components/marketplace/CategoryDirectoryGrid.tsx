'use client';
import React, { useState, useMemo } from 'react';
import {
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
  Truck,
  Tag,
  Layers,
  Search,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  Grid,
  List,
  FolderOpen,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { Category } from '@/lib/types';
import { useApp } from '@/context/AppContext';
import { navigateTo } from '@/lib/router/useRouter';

interface CategoryDirectoryGridProps {
  categories: Category[];
  onSelectCategory?: (categoryId: string) => void;
  onSelectSubcategory?: (categoryId: string, subcategoryId: string) => void;
  selectedCategoryId?: string;
  selectedSubcategoryId?: string;
  variant?: 'marketplace' | 'admin' | 'standalone';
  className?: string;
}

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
  Truck,
  Tag,
  Layers,
};

// Subtle distinct theme colors for Chillyads categories
const CATEGORY_THEMES: Record<string, { bg: string; text: string; badge: string; border: string; hover: string }> = {
  cat_services: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    badge: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    hover: 'hover:border-emerald-400 dark:hover:border-emerald-600',
  },
  cat_cars: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    badge: 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200',
    border: 'border-blue-200 dark:border-blue-800/60',
    hover: 'hover:border-blue-400 dark:hover:border-blue-600',
  },
  cat_bikes: {
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    text: 'text-cyan-700 dark:text-cyan-300',
    badge: 'bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-200',
    border: 'border-cyan-200 dark:border-cyan-800/60',
    hover: 'hover:border-cyan-400 dark:hover:border-cyan-600',
  },
  cat_electronics: {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    badge: 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200',
    border: 'border-purple-200 dark:border-purple-800/60',
    hover: 'hover:border-purple-400 dark:hover:border-purple-600',
  },
  cat_mobiles: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    badge: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    hover: 'hover:border-emerald-400 dark:hover:border-emerald-600',
  },
  cat_comm_vehicles: {
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-700 dark:text-orange-300',
    badge: 'bg-orange-100 dark:bg-orange-900/60 text-orange-800 dark:text-orange-200',
    border: 'border-orange-200 dark:border-orange-800/60',
    hover: 'hover:border-orange-400 dark:hover:border-orange-600',
  },
  cat_jobs: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    badge: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200',
    border: 'border-indigo-200 dark:border-indigo-800/60',
    hover: 'hover:border-indigo-400 dark:hover:border-indigo-600',
  },
  cat_furniture: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    badge: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200',
    border: 'border-amber-200 dark:border-amber-800/60',
    hover: 'hover:border-amber-400 dark:hover:border-amber-600',
  },
  cat_fashion: {
    bg: 'bg-pink-50 dark:bg-pink-950/40',
    text: 'text-pink-700 dark:text-pink-300',
    badge: 'bg-pink-100 dark:bg-pink-900/60 text-pink-800 dark:text-pink-200',
    border: 'border-pink-200 dark:border-pink-800/60',
    hover: 'hover:border-pink-400 dark:hover:border-pink-600',
  },
  cat_books_sports: {
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    text: 'text-teal-700 dark:text-teal-300',
    badge: 'bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200',
    border: 'border-teal-200 dark:border-teal-800/60',
    hover: 'hover:border-teal-400 dark:hover:border-teal-600',
  },
  cat_pets: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    badge: 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200',
    border: 'border-rose-200 dark:border-rose-800/60',
    hover: 'hover:border-rose-400 dark:hover:border-rose-600',
  },
};

export const CategoryDirectoryGrid: React.FC<CategoryDirectoryGridProps> = ({
  categories,
  onSelectCategory,
  onSelectSubcategory,
  selectedCategoryId,
  selectedSubcategoryId,
  variant = 'marketplace',
  className = '',
}) => {
  const { listings } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [activeTabFilter, setActiveTabFilter] = useState<string>('all');
  const [viewDensity, setViewDensity] = useState<'standard' | 'compact'>('standard');

  // Root categories
  const rootCategories = useMemo(() => {
    return categories
      .filter((c) => !c.parentId && c.isActive)
      .sort((a, b) => a.order - b.order);
  }, [categories]);

  // Subcategories mapping by parentId
  const subcategoriesByParent = useMemo(() => {
    const map: Record<string, Category[]> = {};
    rootCategories.forEach((root) => {
      map[root.id] = categories
        .filter((c) => c.parentId === root.id && c.isActive)
        .sort((a, b) => a.order - b.order);
    });
    return map;
  }, [categories, rootCategories]);

  // Real-time count of active listings per category and subcategory
  const listingCounts = useMemo(() => {
    const subMap: Record<string, number> = {};
    const parentMap: Record<string, number> = {};

    listings.forEach((lst) => {
      if (lst.status === 'approved') {
        parentMap[lst.categoryId] = (parentMap[lst.categoryId] || 0) + 1;
        if (lst.subcategoryId) {
          subMap[lst.subcategoryId] = (subMap[lst.subcategoryId] || 0) + 1;
        }
      }
    });

    return { subMap, parentMap };
  }, [listings]);

  // Filter categories and subcategories based on search query and active quick filter
  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return rootCategories
      .filter((cat) => {
        if (activeTabFilter !== 'all' && cat.id !== activeTabFilter) {
          return false;
        }
        return true;
      })
      .map((cat) => {
        const subs = subcategoriesByParent[cat.id] || [];
        const matchesCategory = cat.name.toLowerCase().includes(q) || cat.slug.toLowerCase().includes(q);

        const matchingSubs = q
          ? subs.filter(
              (sub) =>
                sub.name.toLowerCase().includes(q) ||
                sub.slug.toLowerCase().includes(q) ||
                matchesCategory
            )
          : subs;

        const isVisible = matchesCategory || matchingSubs.length > 0;

        return {
          category: cat,
          subcategories: matchingSubs,
          totalSubCount: subs.length,
          isVisible,
        };
      })
      .filter((item) => item.isVisible);
  }, [rootCategories, subcategoriesByParent, searchQuery, activeTabFilter]);

  const toggleExpand = (catId: string) => {
    setExpandedCats((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const getCategoryIcon = (iconName: string) => {
    const IconComp = ICONS_MAP[iconName] || Layers;
    return IconComp;
  };

  const handleCategoryClick = (catId: string) => {
    if (onSelectCategory) {
      onSelectCategory(catId);
    }
  };

  const handleSubcategoryClick = (catId: string, subId: string) => {
    if (onSelectSubcategory) {
      onSelectSubcategory(catId, subId);
    }
  };

  const totalAllSubs = Object.values(subcategoriesByParent).reduce((acc, subs) => acc + subs.length, 0);

  return (
    <section className={`w-full ${className}`}>
      {/* Directory Top Header Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                <Grid className="w-4 h-4" />
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Classifieds Directory
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {rootCategories.length} Categories • {totalAllSubs} Subcategories
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Browse classified categories and direct subcategories across India
            </p>
          </div>

          {/* Directory Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter subcategories (e.g. cars, flats, tutor)..."
                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-8 pr-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Density Toggle */}
            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 bg-slate-50 dark:bg-slate-800">
              <button
                onClick={() => setViewDensity('standard')}
                title="Standard Directory View"
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  viewDensity === 'standard'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Grid</span>
              </button>
              <button
                onClick={() => setViewDensity('compact')}
                title="Compact Directory View"
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  viewDensity === 'compact'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Compact</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Directory Grid of Categories & Subcategories */}
      {filteredData.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-2">
          <Search className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-900 dark:text-white">No Matching Categories</h3>
          <p className="text-xs text-slate-500">
            No category or subcategory matched &quot;{searchQuery}&quot;. Try a broader search term.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setActiveTabFilter('all');
            }}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div
          className={`grid gap-4.5 ${
            viewDensity === 'compact'
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
              : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
          }`}
        >
          {filteredData.map(({ category: cat, subcategories: subs, totalSubCount }) => {
            const isCatSelected = selectedCategoryId === cat.id;
            const theme = CATEGORY_THEMES[cat.id] || {
              bg: 'bg-slate-50 dark:bg-slate-800/60',
              text: 'text-slate-800 dark:text-slate-200',
              badge: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
              border: 'border-slate-200 dark:border-slate-700',
              hover: 'hover:border-slate-400',
            };

            const IconComp = getCategoryIcon(cat.icon);
            const isExpanded = expandedCats[cat.id] || searchQuery.length > 0;
            const visibleSubs = isExpanded ? subs : subs.slice(0, 6);
            const hasMore = subs.length > 6 && !searchQuery;
            const totalLiveAds = (listingCounts.parentMap[cat.id] || 0) + cat.listingCount;

            return (
              <div
                key={cat.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden group shadow-xs hover:shadow-md ${
                  isCatSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                    : `${theme.border} ${theme.hover}`
                }`}
              >
                <div>
                  {/* Category Header Card */}
                  <div
                    onClick={() => handleCategoryClick(cat.id)}
                    className={`p-4 border-b ${theme.border} ${theme.bg} cursor-pointer transition-colors flex items-center justify-between gap-3`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl ${theme.badge} flex items-center justify-center shrink-0 shadow-xs border ${theme.border} group-hover:scale-105 transition-transform`}
                      >
                        <IconComp className={`w-5 h-5 ${theme.text}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-sm text-slate-900 dark:text-white truncate tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {cat.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          <span>{totalSubCount} subcategories</span>
                          <span>•</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {totalLiveAds.toLocaleString()} ads
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCategoryClick(cat.id);
                      }}
                      className="w-7 h-7 rounded-lg bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-white flex items-center justify-center shadow-xs transition-colors shrink-0 cursor-pointer"
                      title={`Browse all in ${cat.name}`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Subcategories List */}
                  <div className="p-3.5 space-y-1">
                    {visibleSubs.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2 px-1">
                        No subcategories found matching &quot;{searchQuery}&quot;
                      </p>
                    ) : (
                      visibleSubs.map((sub) => {
                        const isSubSelected = selectedSubcategoryId === sub.id;
                        const subAds = (listingCounts.subMap[sub.id] || 0) + sub.listingCount;
                        const SubIcon = getCategoryIcon(sub.icon);

                        return (
                          <div
                            key={sub.id}
                            onClick={() => handleSubcategoryClick(cat.id, sub.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between gap-2 transition-all cursor-pointer group/item ${
                              isSubSelected
                                ? 'bg-blue-600 text-white font-bold shadow-xs'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-blue-600 dark:hover:text-blue-400'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                                  isSubSelected
                                    ? 'bg-white'
                                    : 'bg-slate-300 dark:bg-slate-600 group-hover/item:bg-blue-500'
                                }`}
                              />
                              <span className="truncate">{sub.name}</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {subAds > 0 && (
                                <span
                                  className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full transition-colors ${
                                    isSubSelected
                                      ? 'bg-blue-700 text-white'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover/item:bg-blue-100 group-hover/item:text-blue-700 dark:group-hover/item:bg-blue-900/50 dark:group-hover/item:text-blue-300'
                                  }`}
                                >
                                  {subAds.toLocaleString()}
                                </span>
                              )}
                              <ChevronRight
                                className={`w-3 h-3 opacity-0 group-hover/item:opacity-100 transition-opacity ${
                                  isSubSelected ? 'text-white opacity-100' : 'text-slate-400'
                                }`}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Footer action */}
                <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs">
                  {hasMore ? (
                    <button
                      onClick={() => toggleExpand(cat.id)}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {isExpanded ? (
                        'Show Less'
                      ) : (
                        <>
                          <span>+ {subs.length - 6} more subcategories</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium">
                      All {subs.length} subcategories
                    </span>
                  )}

                  <button
                    onClick={() => handleCategoryClick(cat.id)}
                    className="text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-0.5 cursor-pointer ml-auto"
                  >
                    <span>View all</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
