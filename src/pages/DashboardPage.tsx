import React, { useEffect, useState } from 'react';
import {
  Users,
  MapPin,
  Truck,
  Trash2,
  PlusCircle,
  Clock,
  ArrowRight,
  Shield,
  Activity,
  Phone,
  MessageSquare,
  Navigation,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { DashboardStats, Customer } from '../types';
import { NavTab } from '../components/Sidebar';

interface DashboardPageProps {
  onNavigate: (tab: NavTab) => void;
  onOpenAddCustomer: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenAddCustomer,
}) => {
  const { user, hasPermission } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Məlumatlar yüklənə bilmədi.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-500">Məlumatlar yüklənir...</p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'ADMIN';
  const isDriver = user?.role === 'DRIVER';

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-sky-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-sky-500/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-sky-200">
            İdarəetmə Paneli
          </span>
          <h1 className="text-2xl sm:text-3xl font-black mt-1">
            Xoş gəldiniz, {user?.name}!
          </h1>
          <p className="text-xs sm:text-sm text-sky-100/90 mt-1.5 max-w-xl">
            {isAdmin && 'Bütün istifadəçilər, müştərilər, sürücülər və GPS naviqasiya sistemi üzərində tam nəzarət.'}
            {isDriver && 'Müştəri qrupları və ünvanlar üzrə GPS naviqasiya və əlaqə paneli.'}
            {!isAdmin && !isDriver && 'Şəxsi müştəriləriniz, GPS qeydiyyatı və operativ naviqasiya.'}
          </p>
        </div>

        {/* Action Shortcut */}
        {!isDriver && hasPermission('create_customer') && (
          <button
            type="button"
            onClick={onOpenAddCustomer}
            className="px-5 py-3 bg-white text-sky-700 hover:bg-sky-50 font-bold text-sm rounded-2xl shadow-md transition-all flex items-center gap-2 shrink-0"
          >
            <PlusCircle className="w-5 h-5 text-sky-600" />
            <span>Yeni Müştəri</span>
          </button>
        )}
      </div>

      {/* Stats Cards Grid - Pure real values, 0 if empty */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {isAdmin && (
          <>
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">İstifadəçilər</span>
                <div className="p-2 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-xl">
                  <Shield className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {stats?.totalUsers ?? 0}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                {stats?.activeUsers ?? 0} aktiv hesab
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Müştərilər</span>
                <div className="p-2 bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 rounded-xl">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {stats?.totalCustomers ?? 0}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Aktiv müştəri bazası
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sürücülər</span>
                <div className="p-2 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {stats?.totalDrivers ?? 0}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {stats?.activeDrivers ?? 0} aktiv sürücü
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Zibil Qutusu</span>
                <div className="p-2 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl">
                  <Trash2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {stats?.deletedCustomers ?? 0}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Silinmiş müştəri
              </p>
            </div>
          </>
        )}

        {!isAdmin && !isDriver && (
          <>
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Müştərilərim</span>
                <div className="p-2 bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 rounded-xl">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {stats?.totalCustomers ?? 0}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Şəxsi qeydiyyatınızda olan
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Zibil Qutusu</span>
                <div className="p-2 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl">
                  <Trash2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {stats?.deletedCustomers ?? 0}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Silinmiş qeydlər
              </p>
            </div>
          </>
        )}

        {isDriver && (
          <>
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Ümumi Müştərilər</span>
                <div className="p-2 bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 rounded-xl">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {stats?.totalCustomers ?? 0}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Xəritədə baxışa açıq
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">İstifadəçi Qrupları</span>
                <div className="p-2 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-xl">
                  <Shield className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {stats?.userGroups?.length ?? 0}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Müştəri sahibi
              </p>
            </div>
          </>
        )}
      </div>

      {/* Driver view: Users groups */}
      {isDriver && stats?.userGroups && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            İstifadəçilər üzrə Müştərilər
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.userGroups.map(g => (
              <div
                key={g.userId}
                onClick={() => onNavigate('customers')}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between cursor-pointer hover:border-sky-400 transition-colors"
              >
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                    {g.userName}
                  </h4>
                  <p className="text-xs text-sky-600 dark:text-sky-400 font-medium mt-0.5">
                    {g.customerCount} müştəri
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two columns: Recent Customers & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Customers */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-600" />
                Son Əlavə Edilən Müştərilər
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('customers')}
                className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
              >
                Hamısına bax <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {stats?.recentCustomers && stats.recentCustomers.length > 0 ? (
              <div className="space-y-3">
                {stats.recentCustomers.map((c) => {
                  const hasGps = c.latitude !== 0 || c.longitude !== 0;
                  const cleanPhone = c.phone.replace(/\s+/g, '');
                  const wazeUrl = hasGps
                    ? `https://waze.com/ul?ll=${c.latitude},${c.longitude}&navigate=yes`
                    : '#';

                  return (
                    <div
                      key={c.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                          {c.fullName}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[260px]">
                          {c.address}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <a
                          href={`tel:${cleanPhone}`}
                          className="p-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 rounded-lg hover:bg-emerald-100"
                          title="Zəng et"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            const msg = encodeURIComponent(
                              `*Müştəri:* ${c.fullName}\n*Telefon:* ${c.phone}\n*Ünvan:* ${c.address}${
                                hasGps ? `\n*Waze:* ${wazeUrl}` : ''
                              }`
                            );
                            window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
                          }}
                          className="p-2 bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400 rounded-lg hover:bg-teal-100"
                          title="WhatsApp ilə göndər"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                        {hasGps && (
                          <a
                            href={wazeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400 rounded-lg hover:bg-sky-100"
                            title="Waze ilə get"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                Hazırda müştəri yoxdur.
              </div>
            )}
          </div>
        </div>

        {/* Recent Activities / Audit Logs */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                Son Əməliyyatlar
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('logs')}
                className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
              >
                Tarixçə <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {stats?.recentActivities && stats.recentActivities.length > 0 ? (
              <div className="space-y-2.5">
                {stats.recentActivities.map((l) => (
                  <div
                    key={l.id}
                    className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs flex items-start gap-2.5"
                  >
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 dark:text-slate-200 font-medium leading-snug">
                        {l.details}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {new Date(l.createdAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })} • {new Date(l.createdAt).toLocaleDateString('az-AZ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                Tarixçə boşdur.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
