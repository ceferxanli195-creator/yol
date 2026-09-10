import React from 'react';
import {
  LayoutDashboard,
  Users,
  MapPin,
  Truck,
  History,
  ShieldCheck,
  Trash2,
  Settings,
  UserCog,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type NavTab =
  | 'dashboard'
  | 'customers'
  | 'map'
  | 'drivers'
  | 'users'
  | 'permissions'
  | 'logs'
  | 'trash'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { user } = useAuth();
  if (!user) return null;

  const isAdmin = user.role === 'ADMIN';
  const isDriver = user.role === 'DRIVER';

  const navItems: Array<{ tab: NavTab; label: string; icon: React.FC<{ className?: string }>; adminOnly?: boolean; driverAllowed?: boolean }> = [
    { tab: 'dashboard', label: 'Əsas Səhifə', icon: LayoutDashboard, driverAllowed: true },
    { tab: 'customers', label: isDriver ? 'Müştəri Qrupları' : 'Müştərilər', icon: Users, driverAllowed: true },
    { tab: 'map', label: 'Xəritə', icon: MapPin, driverAllowed: true },
    { tab: 'drivers', label: 'Sürücülər', icon: Truck, adminOnly: true },
    { tab: 'users', label: 'İstifadəçilər', icon: UserCog, adminOnly: true },
    { tab: 'permissions', label: 'İcazələr', icon: ShieldCheck, adminOnly: true },
    { tab: 'logs', label: 'Tarixçə / Audit', icon: History, adminOnly: false },
    { tab: 'trash', label: 'Zibil Qutusu', icon: Trash2, adminOnly: false },
    { tab: 'settings', label: 'Hesab və Ayarlar', icon: Settings, driverAllowed: true },
  ];

  const visibleItems = navItems.filter(item => {
    if (isDriver) return !!item.driverAllowed;
    if (isAdmin) return true;
    // Normal User
    return !item.adminOnly && item.tab !== 'permissions' && item.tab !== 'drivers';
  });

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 p-4 min-h-[calc(100vh-4rem)] select-none">
      <div className="space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.tab;
          return (
            <button
              key={item.tab}
              type="button"
              onClick={() => onSelectTab(item.tab)}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors text-left ${
                isActive
                  ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 ${
                  isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'
                }`}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
