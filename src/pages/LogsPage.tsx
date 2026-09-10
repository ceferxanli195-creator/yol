import React, { useEffect, useState } from 'react';
import {
  History,
  Search,
  Trash2,
  Filter,
  Clock,
  User as UserIcon,
  Shield,
  X,
  AlertCircle,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { AuditLog } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';

export const LogsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');

  // Selected Log IDs for bulk deletion
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modals
  const [showDeleteSelectedModal, setShowDeleteSelectedModal] = useState(false);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getLogs({
        search: searchTerm,
        action: selectedAction === 'all' ? undefined : selectedAction,
      });
      setLogs(res.logs);
      setSelectedIds([]);
    } catch (err: any) {
      setError(err.message || 'Tarixçə yüklənərkən xəta baş verdi.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [searchTerm, selectedAction]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === logs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(logs.map(l => l.id));
    }
  };

  const handleDeleteSelectedConfirm = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      await api.deleteLogs(selectedIds, false);
      setShowDeleteSelectedModal(false);
      fetchLogs();
    } catch (err: any) {
      alert(err.message || 'Tarixçə silinmədi.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearAllConfirm = async () => {
    setIsDeleting(true);
    try {
      await api.deleteLogs([], true);
      setShowClearAllModal(false);
      fetchLogs();
    } catch (err: any) {
      alert(err.message || 'Bütün tarixçə silinmədi.');
    } finally {
      setIsDeleting(false);
    }
  };

  const actionsList = [
    { value: 'all', label: 'Bütün Əməliyyatlar' },
    { value: 'LOGIN', label: 'Daxilolma (Login)' },
    { value: 'LOGOUT', label: 'Çıxış (Logout)' },
    { value: 'CREATE_CUSTOMER', label: 'Müştəri Yaratma' },
    { value: 'UPDATE_CUSTOMER', label: 'Müştəri Yeniləmə' },
    { value: 'CHANGE_OWNER', label: 'Sahib Dəyişmə' },
    { value: 'DELETE_CUSTOMER', label: 'Müştəri Silinmə' },
    { value: 'RESTORE_CUSTOMER', label: 'Müştəri Bərpa' },
    { value: 'PERMANENT_DELETE_CUSTOMER', label: 'Həmişəlik Silmə' },
    { value: 'CREATE_USER', label: 'İstifadəçi Yaratma' },
    { value: 'UPDATE_USER', label: 'İstifadəçi Yeniləmə' },
    { value: 'BACKUP', label: 'Backup Export' },
    { value: 'RESTORE', label: 'Backup Bərpa' },
  ];

  return (
    <div className="space-y-5 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-6 h-6 text-emerald-600" />
            <span>Tarixçə / Audit Logları</span>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
              {logs.length}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAdmin
              ? 'Sistemdə icra edilən bütün əməliyyatların real audit qeydləri'
              : 'Şəxsi fəaliyyət tarixçəniz'}
          </p>
        </div>

        {/* Admin bulk delete buttons */}
        {isAdmin && logs.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setShowDeleteSelectedModal(true)}
                className="px-3.5 py-2 bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300 text-xs font-bold rounded-xl hover:bg-rose-100 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Seçilənləri Sil ({selectedIds.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowClearAllModal(true)}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <span>Bütün Tarixçəni Təmizlə</span>
            </button>
          </div>
        )}
      </div>

      {/* Search & Action Filter */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="İstifadəçi adı, müştəri, əməliyyat və ya məzmun üzrə axtarış..."
              className="w-full pl-10 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="sm:w-56">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              {actionsList.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Select all bar for Admin */}
        {isAdmin && logs.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 hover:text-slate-800 dark:hover:text-slate-200"
            >
              {selectedIds.length === logs.length ? (
                <CheckSquare className="w-4 h-4 text-emerald-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>Hamısını seç ({logs.length})</span>
            </button>

            {selectedIds.length > 0 && (
              <span className="font-semibold text-emerald-600">
                {selectedIds.length} qeyd seçilib
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="p-12 flex justify-center">
          <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && logs.length === 0 && (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <History className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Tarixçə boşdur.
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {searchTerm ? 'Axtarış üzrə heç bir nəticə tapılmadı.' : 'Sistemdə hələ heç bir əməliyyat qeydi mövcud deyil.'}
          </p>
        </div>
      )}

      {/* Logs List - Clean Cards for Mobile & Desktop */}
      {!isLoading && logs.length > 0 && (
        <div className="space-y-2.5">
          {logs.map((log) => {
            const isSelected = selectedIds.includes(log.id);
            return (
              <div
                key={log.id}
                onClick={() => isAdmin && toggleSelect(log.id)}
                className={`bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border transition-colors flex items-start gap-3 cursor-pointer ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20'
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                {isAdmin && (
                  <div className="mt-0.5 shrink-0">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {log.userName}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                        {log.action}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(log.createdAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })} • {new Date(log.createdAt).toLocaleDateString('az-AZ')}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed break-words">
                    {log.details}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Logs Deletion Confirmation */}
      <ConfirmModal
        isOpen={showDeleteSelectedModal}
        title="Seçilmiş Tarixçə Qeydlərini Sil"
        message={`Seçilmiş ${selectedIds.length} ədəd tarixçə qeydini silmək istəyirsiniz?`}
        confirmText="Sil"
        cancelText="İmtina"
        isDanger={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteSelectedConfirm}
        onCancel={() => setShowDeleteSelectedModal(false)}
      />

      {/* Clear All Logs Confirmation */}
      <ConfirmModal
        isOpen={showClearAllModal}
        title="Bütün Tarixçəni Təmizlə"
        message="BÜTÜN audit tarixçəsi həmişəlik silinəcək. Bu əməliyyat geri qaytarıla bilməz. Davam etmək istəyirsiniz?"
        confirmText="Bütün Tarixçəni Sil"
        cancelText="İmtina"
        isDanger={true}
        isLoading={isDeleting}
        onConfirm={handleClearAllConfirm}
        onCancel={() => setShowClearAllModal(false)}
      />
    </div>
  );
};
