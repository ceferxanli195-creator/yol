import React, { useState } from 'react';
import { Phone, MessageSquare, Navigation, Edit2, Trash2, MapPin, User as UserIcon, Calendar, Image as ImageIcon } from 'lucide-react';
import { Customer } from '../types';
import { useAuth } from '../context/AuthContext';

interface CustomerCardProps {
  customer: Customer;
  onEdit?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
  onViewMap?: (customer: Customer) => void;
}

export const CustomerCard: React.FC<CustomerCardProps> = ({
  customer,
  onEdit,
  onDelete,
  onViewMap,
}) => {
  const { user, hasPermission } = useAuth();
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const hasGps = customer.latitude !== 0 || customer.longitude !== 0;

  // Check permissions & ownership
  const isDriver = user?.role === 'DRIVER';
  const isAdmin = user?.role === 'ADMIN';
  const isOwner = user?.id === customer.ownerId;

  const canEdit = !isDriver && (isAdmin || (isOwner && hasPermission('edit_customer')));
  const canDelete = !isDriver && (isAdmin || (isOwner && hasPermission('delete_customer')));

  // Format Waze URL
  const wazeUrl = hasGps
    ? `https://waze.com/ul?ll=${customer.latitude},${customer.longitude}&navigate=yes`
    : '#';

  // Format WhatsApp message
  const handleWhatsApp = () => {
    let msg = `*Müştəri:* ${customer.fullName}\n*Telefon:* ${customer.phone}\n*Ünvan:* ${customer.address}`;
    if (customer.notes) {
      msg += `\n*Qeyd:* ${customer.notes}`;
    }
    if (hasGps) {
      msg += `\n*GPS:* ${customer.latitude.toFixed(6)}, ${customer.longitude.toFixed(6)}`;
      msg += `\n*Waze ilə naviqasiya:* https://waze.com/ul?ll=${customer.latitude},${customer.longitude}&navigate=yes`;
    }

    const encoded = encodeURIComponent(msg);
    // WhatsApp direct link
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleWaze = () => {
    if (!hasGps) {
      alert('Bu müştəri üçün GPS koordinatları təyin edilməyib.');
      return;
    }
    window.open(wazeUrl, '_blank');
  };

  const cleanPhone = customer.phone.replace(/\s+/g, '');

  return (
    <>
      <div
        id={`customer-card-${customer.id}`}
        className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
      >
        <div>
          {/* Header row: Name + Owner/GPS badges */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-3">
              {customer.photoUrl ? (
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(true)}
                  className="relative group shrink-0"
                >
                  <img
                    src={customer.photoUrl}
                    alt={customer.fullName}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs group-hover:opacity-90"
                  />
                  <div className="absolute inset-0 bg-black/20 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <ImageIcon className="w-4 h-4 text-white" />
                  </div>
                </button>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold text-lg flex items-center justify-center shrink-0 border border-sky-200 dark:border-sky-900/50">
                  {customer.firstName.charAt(0).toUpperCase()}
                </div>
              )}

              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  {customer.fullName}
                </h3>
                <a
                  href={`tel:${cleanPhone}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 dark:text-sky-400 hover:underline mt-0.5"
                >
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span>{customer.phone}</span>
                </a>
              </div>
            </div>

            {/* Owner badge for admin / driver */}
            {(isAdmin || isDriver) && (
              <div className="shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 font-medium border border-slate-200 dark:border-slate-700">
                <UserIcon className="w-3 h-3 text-slate-500" />
                <span className="truncate max-w-[90px]">{customer.ownerName || 'Bilinməyən'}</span>
              </div>
            )}
          </div>

          {/* Address & Note */}
          <div className="space-y-1.5 mb-4 text-sm">
            <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
              <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
              <span className="leading-snug break-words">{customer.address}</span>
            </div>

            {customer.notes && (
              <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 leading-relaxed italic">
                "{customer.notes}"
              </p>
            )}
          </div>

          {/* GPS Info pill */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 pb-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Navigation className={`w-3.5 h-3.5 ${hasGps ? 'text-emerald-500' : 'text-amber-500'}`} />
              <span>
                {hasGps ? (
                  <>
                    <span className="font-mono">{customer.latitude.toFixed(4)}, {customer.longitude.toFixed(4)}</span>
                    {customer.accuracy > 0 && (
                      <span className="ml-1 text-slate-400">(±{customer.accuracy}m)</span>
                    )}
                  </>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">GPS qeyd edilməyib</span>
                )}
              </span>
            </div>

            {customer.createdAt && (
              <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                <Calendar className="w-3 h-3" />
                <span>{new Date(customer.createdAt).toLocaleDateString('az-AZ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Fully wrapped & touch-friendly */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-2">
          {/* Call button */}
          <a
            href={`tel:${cleanPhone}`}
            className="flex-1 min-w-[76px] h-10 px-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-emerald-200/60 dark:border-emerald-900/50"
          >
            <Phone className="w-4 h-4" />
            <span>Zəng</span>
          </a>

          {/* WhatsApp button */}
          <button
            type="button"
            onClick={handleWhatsApp}
            className="flex-1 min-w-[90px] h-10 px-3 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-teal-200/60 dark:border-teal-900/50"
          >
            <MessageSquare className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>

          {/* Waze button */}
          <button
            type="button"
            onClick={handleWaze}
            disabled={!hasGps}
            className="flex-1 min-w-[80px] h-10 px-3 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-sky-200/60 dark:border-sky-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Navigation className="w-4 h-4" />
            <span>Waze</span>
          </button>

          {/* Edit button */}
          {canEdit && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(customer)}
              className="w-10 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl flex items-center justify-center transition-colors"
              title="Redaktə et"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}

          {/* Delete button */}
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(customer)}
              className="w-10 h-10 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center transition-colors border border-rose-200/50 dark:border-rose-900/50"
              title="Sil"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Customer Photo Modal */}
      {showPhotoModal && customer.photoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowPhotoModal(false)}
        >
          <div className="relative max-w-lg w-full max-h-[85vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-2">
            <img
              src={customer.photoUrl}
              alt={customer.fullName}
              className="w-full h-auto max-h-[75vh] object-contain rounded-xl mx-auto"
            />
            <div className="p-3 text-center text-white font-medium text-sm">
              {customer.fullName}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
