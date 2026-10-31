'use client';
import React from 'react';
import { useApp } from '@/context/AppContext';
import {
  Users,
  ShoppingBag,
  Clock,
  AlertTriangle,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  XCircle,
  Star,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Globe,
} from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { navigateTo } from '@/lib/router/useRouter';

export const DashboardModule: React.FC = () => {
  const {
    listings,
    users,
    reports,
    transactions,
    auditLogs,
    setActiveSidebarTab,
    approveListing,
    rejectListing,
    featureListing,
  } = useApp();

  const totalUsers = users.length;
  const activeSellers = users.filter((u) => u.type === 'user' || u.type === 'business').length;
  const pendingApprovals = listings.filter((l) => l.status === 'pending');
  const reportedCount = reports.filter((r) => r.status === 'pending').length;
  const approvedListings = listings.filter((l) => l.status === 'approved').length;

  const totalRevenue = transactions
    .filter((t) => t.status === 'completed')
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-slate-900 dark:text-white">
      {/* Top Banner & Quick Status */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-blue-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-300">
            <ShieldCheck className="w-4 h-4" /> Real-time Classifieds Oversight
          </div>
          <h2 className="text-2xl font-black tracking-tight mt-1">
            Chillyads Command Center
          </h2>
          <p className="text-sm text-blue-200 mt-1 max-w-xl">
            Live moderation queue, fraud flags, commerce monetization, and configuration-driven listing engine active.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigateTo('/')}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
          >
            <Globe className="w-4 h-4" />
            Back to Live Site
          </button>
          <button
            onClick={() => {
              setActiveSidebarTab('marketplace/pending');
              navigateTo('/admin/marketplace/pending');
            }}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition-colors"
          >
            <Clock className="w-4 h-4" />
            Review Queue ({pendingApprovals.length})
          </button>
          <button
            onClick={() => {
              setActiveSidebarTab('moderation/reports');
              navigateTo('/admin/moderation/reports');
            }}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            Reports ({reportedCount})
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div
          onClick={() => {
            setActiveSidebarTab('users/all');
            navigateTo('/admin/users/all');
          }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:border-blue-500/50 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Users</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-lg text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black mt-2 tracking-tight">
            {totalUsers.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+18.4% this month</span>
            <span className="text-slate-400 font-normal">({activeSellers} active)</span>
          </div>
        </div>

        {/* Active Classified Listings */}
        <div
          onClick={() => {
            setActiveSidebarTab('marketplace/listings');
            navigateTo('/admin/marketplace/listings');
          }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:border-blue-500/50 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Live Listings</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg text-emerald-600">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black mt-2 tracking-tight">
            {approvedListings}
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+42 posted today</span>
            <span className="text-slate-400 font-normal">(98% uptime)</span>
          </div>
        </div>

        {/* Pending Moderation Approvals */}
        <div
          onClick={() => {
            setActiveSidebarTab('marketplace/pending');
            navigateTo('/admin/marketplace/pending');
          }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:border-amber-500/50 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Approvals</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/50 rounded-lg text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black mt-2 tracking-tight text-amber-600 dark:text-amber-400">
            {pendingApprovals.length}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Average review turnaround: <strong>4.2 mins</strong>
          </div>
        </div>

        {/* Revenue & Packages */}
        <div
          onClick={() => {
            setActiveSidebarTab('commerce/transactions');
            navigateTo('/admin/commerce/transactions');
          }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:border-purple-500/50 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Monetization</span>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/50 rounded-lg text-purple-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black mt-2 tracking-tight text-slate-900 dark:text-white">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Featured ads & subscriptions</span>
          </div>
        </div>
      </div>

      {/* Quick Action Approval Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold tracking-tight">Pending Approval Queue</h3>
              <p className="text-xs text-slate-500">
                Newly submitted classified ads awaiting manual moderation review
              </p>
            </div>
            <button
              onClick={() => {
                setActiveSidebarTab('marketplace/pending');
                navigateTo('/admin/marketplace/pending');
              }}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View all ({pendingApprovals.length})
            </button>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
              <p className="font-semibold text-sm">Moderation queue is all clear!</p>
              <p className="text-xs mt-1">No pending listings requiring administrative action.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 gap-3"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <img
                      src={item.images[0]}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">{item.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          ₹{item.price.toLocaleString('en-IN')}
                        </span>
                        <span>•</span>
                        <span>{item.location.city}</span>
                        <span>•</span>
                        <span>Seller: {item.sellerName}</span>
                      </div>
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Submitted: {item.createdAt}
                        {item.spamScore && item.spamScore > 10 && (
                          <span className="ml-2 text-rose-500 font-semibold">
                            (Spam Risk: {item.spamScore}%)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Moderation Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => approveListing(item.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => rejectListing(item.id, 'Incomplete details or price anomaly')}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                    <button
                      onClick={() => featureListing(item.id, true)}
                      className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 rounded-lg text-xs font-semibold transition-colors"
                      title="Promote / Feature"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Admin Activity Audit Stream */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <h3 className="text-base font-bold tracking-tight">Recent Admin Activity</h3>
            </div>
            <button
              onClick={() => setActiveSidebarTab('admin/logs')}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              All logs
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-80 pr-1">
            {auditLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="text-xs border-l-2 border-blue-500 pl-3 py-1 space-y-0.5"
              >
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {log.adminName}
                  </span>
                  <span>{log.timestamp}</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {log.action.replace(/_/g, ' ')}
                </div>
                <div className="text-slate-500 text-[11px] truncate">
                  {log.targetSummary}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Audit Trail: Immutable Log</span>
            <span className="font-mono text-[10px]">IP: Verified</span>
          </div>
        </div>
      </div>

      {/* Traffic & Conversion Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase">Daily Unique Visitors</div>
            <div className="text-lg font-black mt-0.5">142,890</div>
            <div className="text-[11px] text-emerald-600">+12% vs last week</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase">Lead Contact Rate</div>
            <div className="text-lg font-black mt-0.5">24.6%</div>
            <div className="text-[11px] text-slate-500">Chats/Calls initiated per view</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600">
            <Star className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase">Featured Ad Conversion</div>
            <div className="text-lg font-black mt-0.5">8.4x Faster</div>
            <div className="text-[11px] text-purple-600">Average sale closure in 4 days</div>
          </div>
        </div>
      </div>
    </div>
  );
};
