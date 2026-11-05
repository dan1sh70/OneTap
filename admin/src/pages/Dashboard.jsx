import React, { useEffect, useState } from 'react';
import api from '../api/client';
import {
  Users,
  Store,
  ShieldCheck,
  Package,
  Home,
  IndianRupee,
  FileQuestion,
  AlertTriangle,
} from 'lucide-react';

const Dashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await api.get('/admin/metrics');
        setMetrics(res.data.data);
      } catch (err) {
        console.error('Failed to load metrics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Loading real-time marketplace metrics...
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Platform Revenue',
      value: `₹${((metrics?.totalRevenuePaise || 0) / 100).toLocaleString('en-IN')}`,
      desc: 'Vendor subscriptions & boost orders (in integer paise)',
      icon: IndianRupee,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Registered Users',
      value: metrics?.totalUsers || 0,
      desc: 'Unified customer & staff identities',
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Active Vendors',
      value: metrics?.totalVendors || 0,
      desc: 'Free & paid tier businesses',
      icon: Store,
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: 'Pending Verifications',
      value: metrics?.pendingVerifications || 0,
      desc: 'KYC & business verification queue',
      icon: ShieldCheck,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Active Product Listings',
      value: metrics?.activeListings || 0,
      desc: 'Within 30-day listing quota',
      icon: Package,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      label: 'Property Cases',
      value: metrics?.pendingPropertyCases || 0,
      desc: 'Pending manager assignment',
      icon: Home,
      color: 'bg-sky-50 text-sky-600',
    },
    {
      label: 'Extra Benefit Requests',
      value: metrics?.pendingBenefitRequests || 0,
      desc: 'Vendor slots & boost extensions',
      icon: FileQuestion,
      color: 'bg-rose-50 text-rose-600',
    },
    {
      label: 'Abuse Reports',
      value: metrics?.pendingReports || 0,
      desc: 'Pending moderator review',
      icon: AlertTriangle,
      color: 'bg-red-50 text-red-600',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Operations Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Live aggregates from MongoDB — customer-free, vendor-monetized baseline.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {stat.label}
                </span>
                <div className={`p-2.5 rounded-xl ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-1">{stat.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Commercial Policy Reminder Banner */}
      <div className="bg-brand-50 border border-brand-200 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-brand-900">MANDATORY COMMERCIAL POLICY (PRD Baseline v1.1)</h3>
          <p className="text-xs text-brand-700 mt-1 leading-relaxed">
            Customers use all features free of charge (browsing, calling verified vendors, submitting enquiries, and requesting property assistance).
            Vendors pay for listing quotas, customer lead-detail access, and manager assist packages.
          </p>
        </div>
        <span className="px-3.5 py-1.5 rounded-full bg-brand-600 text-white text-xs font-bold uppercase tracking-wider whitespace-nowrap">
          Strictly Enforced
        </span>
      </div>
    </div>
  );
};

export default Dashboard;

