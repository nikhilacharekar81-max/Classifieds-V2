'use client';
import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Search,
  Sun,
  Moon,
  ExternalLink,
  Globe,
  Shield,
  Code2,
  Bell,
  ChevronDown,
  UserCheck,
  Check,
  LogOut,
  Menu,
} from 'lucide-react';
import { Role } from '@/lib/types';
import { navigateTo } from '@/lib/router/useRouter';

export const AdminHeader: React.FC = () => {
  const {
    activeSidebarTab,
    theme,
    toggleTheme,
    setViewMode,
    currentAdmin,
    switchAdminRole,
    impersonatedUser,
    exitImpersonation,
    mobileSidebarOpen,
    setMobileSidebarOpen,
  } = useApp();

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        navigateTo('/admin/search');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const rolesList: { role: Role; label: string; desc: string }[] = [
    { role: 'super_admin', label: 'Super Admin', desc: 'Full administrative access & system config' },
    { role: 'moderator', label: 'Moderator', desc: 'Listing approvals, reports & user sanctions' },
    { role: 'finance_user', label: 'Finance User', desc: 'Orders, refunds, tax config & invoices' },
    { role: 'support_agent', label: 'Support Agent', desc: 'User management & ticket resolutions' },
    { role: 'content_manager', label: 'Content Manager', desc: 'CMS pages, SEO templates & categories' },
  ];

  const formatBreadcrumb = (tab: string) => {
    const parts = tab.split('/');
    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' / ');
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors gap-2 overflow-hidden">
      {/* Impersonation Banner Alert */}
      {impersonatedUser && (
        <div className="absolute top-0 left-0 right-0 h-8 bg-amber-500 text-slate-950 text-xs font-semibold px-4 flex items-center justify-between z-40">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>
              AUDIT ACTIVE: Impersonating <strong>{impersonatedUser.name}</strong> ({impersonatedUser.email})
            </span>
          </div>
          <button
            onClick={exitImpersonation}
            className="px-2 py-0.5 bg-black text-white text-[11px] font-bold rounded hover:bg-slate-800 transition-colors"
          >
            End Impersonation Session
          </button>
        </div>
      )}

      {/* Breadcrumbs & Route */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="md:hidden p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 shrink-0"
          aria-label="Toggle Navigation Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate max-w-[130px] sm:max-w-none">
          {formatBreadcrumb(activeSidebarTab)}
        </h1>
        <span className="hidden sm:inline text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono shrink-0">
          CHILLYADS / ADMIN
        </span>
      </div>

      {/* Global Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Global Search Shortcut */}
        <button
          onClick={() => navigateTo('/admin/search')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs transition-colors group"
        >
          <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-500 shrink-0" />
          <span className="hidden md:inline">Search...</span>
          <kbd className="hidden lg:inline text-[10px] font-mono bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-1 py-0.5 rounded text-slate-400">
            ⌘K
          </kbd>
        </button>

        {/* Switch to Marketplace View */}
        <button
          onClick={() => navigateTo('/')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all whitespace-nowrap cursor-pointer"
          title="Exit Admin and View Live Marketplace"
        >
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span>Back to Live Site</span>
        </button>

        {/* Log Out Button */}
        <button
          onClick={() => navigateTo('/')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer whitespace-nowrap"
          title="Log out from Admin Panel"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden md:inline">Log Out</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-1.5 sm:p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>

        {/* Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="capitalize hidden lg:inline">{currentAdmin.role.replace('_', ' ')}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-2 z-50 animate-in fade-in duration-100">
              <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                Switch Admin Permission Role
              </div>
              <div className="space-y-1 mt-1">
                {rolesList.map((item) => (
                  <button
                    key={item.role}
                    onClick={() => {
                      switchAdminRole(item.role);
                      setRoleDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-start justify-between ${
                      currentAdmin.role === item.role
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{item.label}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{item.desc}</div>
                    </div>
                    {currentAdmin.role === item.role && <Check className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Current Admin User Profile Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          <img
            src={currentAdmin.avatar}
            alt={currentAdmin.name}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500/30"
          />
          <div className="hidden lg:block text-left text-xs">
            <div className="font-semibold text-slate-900 dark:text-white leading-tight flex items-center gap-1">
              {currentAdmin.name}
              {currentAdmin.twoFactorEnabled && (
                <span className="text-[10px] text-emerald-500 font-medium" title="2FA Active">
                  ● 2FA
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
              {currentAdmin.email}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
