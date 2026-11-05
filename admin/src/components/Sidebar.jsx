import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  ShieldCheck,
  Package,
  Home,
  Wrench,
  CreditCard,
  Gift,
  Building,
  AlertTriangle,
  FileText,
  LogOut,
  Users,
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const roles = user?.roles || [];

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['admin', 'moderator', 'finance', 'manager', 'support'] },
    { label: 'Users Directory', path: '/users', icon: Users, roles: ['admin'] },
    { label: 'Vendor Verifications', path: '/verifications', icon: ShieldCheck, roles: ['admin', 'moderator'] },
    { label: 'Listings Moderation', path: '/listings', icon: Package, roles: ['admin', 'moderator'] },
    { label: 'Service Packages', path: '/services', icon: Wrench, roles: ['admin', 'moderator'] },
    { label: 'Property Cases', path: '/properties', icon: Home, roles: ['admin', 'manager'] },
    { label: 'Benefit Requests', path: '/benefit-requests', icon: Gift, roles: ['admin'] },
    { label: 'Financial Ledger', path: '/finance', icon: CreditCard, roles: ['admin', 'finance'] },
    { label: 'Abuse Reports', path: '/reports', icon: AlertTriangle, roles: ['admin', 'moderator', 'support'] },
    { label: 'Audit Logs', path: '/audit-logs', icon: FileText, roles: ['admin'] },
  ];

  const filteredItems = navItems.filter((item) =>
    item.roles.some((r) => roles.includes(r))
  );

  return (
    <aside className="w-64 bg-navy-900 text-slate-300 flex flex-col min-h-screen border-r border-navy-800">
      {/* Brand Header */}
      <div className="p-6 border-b border-navy-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-bold text-white shadow-lg shadow-brand-500/20">
          365
        </div>
        <div>
          <h1 className="font-bold text-white text-base tracking-wide">ONE TAP 365</h1>
          <p className="text-xs text-slate-400 font-medium">Super Admin Portal</p>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-navy-800'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-navy-800 bg-navy-950/60">
        <div className="flex items-center justify-between">
          <div className="truncate">
            <p className="text-sm font-medium text-white truncate">{user?.fullName || 'Staff User'}</p>
            <p className="text-xs text-brand-500 font-medium truncate capitalize">
              {roles.filter((r) => r !== 'customer').join(', ') || 'Staff'}
            </p>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-navy-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

