'use client';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  MapPin,
  Search,
  X,
  ChevronDown,
  Check,
  Compass,
} from 'lucide-react';
import { navigateTo } from '@/lib/router/useRouter';
import { buildChillyUrl } from '@/lib/utils/seoAndUrlHelper';

interface LocationSelectorInputProps {
  className?: string;
  currentCity?: string;
}

// Popular locations for quick 1-tap select
const POPULAR_CITIES = [
  'All India',
  'Mumbai',
  'Delhi',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Pune',
  'Ahmedabad',
];

export const LocationSelectorInput: React.FC<LocationSelectorInputProps> = ({
  className = '',
  currentCity,
}) => {
  const {
    selectedMarketplaceCity,
    setSelectedMarketplaceCity,
    selectedMarketplaceCategory,
    selectedMarketplaceSubcategory,
    categories,
    locations,
    fetchGpsLocation,
    userLocation,
    addToast,
  } = useApp();

  const displayCity = currentCity || selectedMarketplaceCity || 'All India';

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isAllCities =
    !displayCity ||
    displayCity.toLowerCase() === 'all india' ||
    displayCity.toLowerCase() === 'all cities';

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else if (searchQuery !== '') {
      setSearchQuery('');
    }
  }, [isOpen, searchQuery]);

  const states = useMemo(() => locations.filter((loc) => loc.type === 'state'), [locations]);
  const cities = useMemo(() => locations.filter((loc) => loc.type === 'city'), [locations]);

  // Filtered cities list
  const filteredCities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return cities;

    return cities.filter((c) => {
      const state = states.find((s) => s.id === c.parentId);
      return (
        c.name.toLowerCase().includes(q) ||
        (state && state.name.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, cities, states]);

  const handleSelectCity = (cityName: string) => {
    setSelectedMarketplaceCity(cityName);
    setIsOpen(false);
    setSearchQuery('');

    const targetUrl = buildChillyUrl({
      city: cityName,
      categoryId: selectedMarketplaceCategory,
      subcategoryId: selectedMarketplaceSubcategory,
      categories,
    });
    navigateTo(targetUrl);
  };

  const handleDetectLocation = () => {
    setIsDetectingGps(true);
    fetchGpsLocation();

    setTimeout(() => {
      setIsDetectingGps(false);
      const detectedCity = userLocation?.city || 'Mumbai';
      handleSelectCity(detectedCity);
      addToast({
        type: 'success',
        title: 'Location Updated',
        message: `Set marketplace location to ${detectedCity}.`,
      });
    }, 500);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 border-2 transition-all rounded-xl px-3 py-1.5 bg-white text-xs cursor-pointer select-none text-left ${
          isOpen
            ? 'border-blue-600 ring-2 ring-blue-100 shadow-sm'
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <MapPin className={`w-4 h-4 shrink-0 ${isAllCities ? 'text-slate-400' : 'text-blue-600'}`} />

        <div className="flex flex-col min-w-0">
          <span className="text-[9px] font-bold text-slate-400 uppercase leading-none tracking-tight">Location</span>
          <span className="text-xs font-bold text-slate-900 truncate max-w-[120px] sm:max-w-[150px] leading-tight">
            {displayCity}
          </span>
        </div>

        {!isAllCities ? (
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              handleSelectCity('All India');
            }}
            title="Reset to All India"
            className="p-1 ml-auto text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </div>
        ) : (
          <ChevronDown
            className={`w-3.5 h-3.5 ml-auto text-slate-400 shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-blue-600' : ''
            }`}
          />
        )}
      </button>

      {/* Clean Single-Screen Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-80 sm:w-[340px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden text-slate-900 animate-in fade-in slide-in-from-top-2 duration-150">
          
          {/* Search Box */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/70">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search city or state..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[320px] overflow-y-auto p-3 space-y-3 text-xs">
            
            {/* If Not Searching: GPS & Popular Pills */}
            {!searchQuery.trim() && (
              <>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={isDetectingGps}
                  className="w-full flex items-center gap-2.5 px-3 py-2 bg-blue-50/80 hover:bg-blue-100 text-blue-700 font-bold rounded-xl transition-colors text-left"
                >
                  <Compass className={`w-4 h-4 text-blue-600 ${isDetectingGps ? 'animate-spin' : ''}`} />
                  <span>{isDetectingGps ? 'Detecting location...' : 'Use current location'}</span>
                </button>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Popular Cities
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_CITIES.map((cityName) => {
                      const isSelected = selectedMarketplaceCity.toLowerCase() === cityName.toLowerCase();
                      return (
                        <button
                          key={cityName}
                          type="button"
                          onClick={() => handleSelectCity(cityName)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                          }`}
                        >
                          {cityName === 'All India' ? '🌐 All India' : cityName}
                          {isSelected && <Check className="w-3 h-3 text-emerald-400 inline ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* City List */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                {searchQuery.trim() ? `Search Results (${filteredCities.length})` : 'All Cities'}
              </span>

              <div className="space-y-0.5">
                {filteredCities.length > 0 ? (
                  filteredCities.map((city) => {
                    const parentState = states.find((s) => s.id === city.parentId);
                    const isSelected = selectedMarketplaceCity.toLowerCase() === city.name.toLowerCase();

                    return (
                      <button
                        key={city.id}
                        type="button"
                        onClick={() => handleSelectCity(city.name)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors text-left cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 font-bold'
                            : 'hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                          <span className="font-semibold truncate">{city.name}</span>
                          {parentState && (
                            <span className="text-[10px] text-slate-400 truncate">({parentState.name})</span>
                          )}
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })
                ) : (
                  <div className="py-4 text-center text-slate-400">
                    <p className="font-bold text-slate-600">No city matching &ldquo;{searchQuery}&rdquo;</p>
                    <button
                      type="button"
                      onClick={() => handleSelectCity(searchQuery.trim())}
                      className="mt-1.5 px-3 py-1 bg-blue-50 text-blue-600 font-bold rounded-lg text-xs"
                    >
                      Select &ldquo;{searchQuery.trim()}&rdquo;
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="p-2 border-t border-slate-100 bg-slate-50 text-center">
            <button
              type="button"
              onClick={() => handleSelectCity('All India')}
              className="text-[11px] font-bold text-blue-600 hover:underline"
            >
              🌐 Reset to All India
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

