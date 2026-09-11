import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { X, Navigation, MapPin, Truck, Clock, RefreshCw, ExternalLink } from 'lucide-react';
import { Order } from '../types';
import { api } from '../api';

interface LiveOrderTrackingModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
}

export const LiveOrderTrackingModal: React.FC<LiveOrderTrackingModalProps> = ({
  isOpen,
  order: initialOrder,
  onClose,
}) => {
  const [order, setOrder] = useState<Order | null>(initialOrder);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastPollTime, setLastPollTime] = useState<Date>(new Date());

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const customerMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  // Poll for live GPS update every 4 seconds if in transit
  useEffect(() => {
    if (!isOpen || !order || order.status === 'delivered') return;

    const interval = setInterval(async () => {
      try {
        const res = await api.getOrderById(order.id);
        setOrder(res.order);
        setLastPollTime(new Date());
      } catch {
        // silent background poll
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen, order?.id, order?.status]);

  // Initialize and update Leaflet map
  useEffect(() => {
    if (!isOpen || !order || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = order.currentLocation?.latitude || order.customerLatitude || 40.4093;
      const initialLng = order.currentLocation?.longitude || order.customerLongitude || 49.8671;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 14,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    const bounds: L.LatLngExpression[] = [];

    // Customer marker (Red destination pin)
    if (order.customerLatitude && order.customerLongitude) {
      bounds.push([order.customerLatitude, order.customerLongitude]);
      if (!customerMarkerRef.current) {
        const customerIcon = L.divIcon({
          className: 'customer-destination-icon',
          html: `
            <div class="flex items-center justify-center w-10 h-10 rounded-full bg-rose-600 text-white shadow-xl border-2 border-white animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 40],
        });

        customerMarkerRef.current = L.marker([order.customerLatitude, order.customerLongitude], {
          icon: customerIcon,
        })
          .addTo(map)
          .bindPopup(`<b>Müştəri: ${order.customerName}</b><br/>${order.customerAddress}`);
      } else {
        customerMarkerRef.current.setLatLng([order.customerLatitude, order.customerLongitude]);
      }
    }

    // Driver live location marker (Blue/Green pulsing icon)
    const driverLoc = order.currentLocation;
    if (driverLoc && driverLoc.latitude && driverLoc.longitude) {
      bounds.push([driverLoc.latitude, driverLoc.longitude]);
      if (!driverMarkerRef.current) {
        const driverIcon = L.divIcon({
          className: 'driver-live-icon',
          html: `
            <div class="relative flex items-center justify-center w-10 h-10">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
              <div class="relative flex items-center justify-center w-9 h-9 rounded-full bg-sky-600 text-white shadow-xl border-2 border-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
              </div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        driverMarkerRef.current = L.marker([driverLoc.latitude, driverLoc.longitude], {
          icon: driverIcon,
        })
          .addTo(map)
          .bindPopup(`<b>Sürücü: ${order.executorName || 'Yoldadır'}</b><br/>Canlı GPS konumu`);
      } else {
        driverMarkerRef.current.setLatLng([driverLoc.latitude, driverLoc.longitude]);
      }

      // Draw polyline connecting driver and customer
      if (order.customerLatitude && order.customerLongitude) {
        const pathPoints: [number, number][] = [
          [driverLoc.latitude, driverLoc.longitude],
          [order.customerLatitude, order.customerLongitude],
        ];

        if (!polylineRef.current) {
          polylineRef.current = L.polyline(pathPoints, {
            color: '#0284c7',
            weight: 4,
            opacity: 0.8,
            dashArray: '8, 8',
          }).addTo(map);
        } else {
          polylineRef.current.setLatLngs(pathPoints);
        }
      }
    }

    if (bounds.length > 0) {
      try {
        map.fitBounds(bounds as any, { padding: [50, 50], maxZoom: 16 });
      } catch {
        // ignore bounds sizing if single point
      }
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [isOpen, order?.currentLocation?.latitude, order?.currentLocation?.longitude]);

  // Clean up Leaflet on modal close
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        driverMarkerRef.current = null;
        customerMarkerRef.current = null;
        polylineRef.current = null;
      }
    };
  }, []);

  if (!isOpen || !order) return null;

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await api.getOrderById(order.id);
      setOrder(res.order);
      setLastPollTime(new Date());
    } finally {
      setIsRefreshing(false);
    }
  };

  const hasLiveGps = !!(order.currentLocation && order.currentLocation.latitude && order.currentLocation.longitude);
  const distanceKm = hasLiveGps && order.customerLatitude && order.customerLongitude
    ? (
        L.latLng(order.currentLocation!.latitude, order.currentLocation!.longitude).distanceTo(
          L.latLng(order.customerLatitude, order.customerLongitude)
        ) / 1000
      ).toFixed(2)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[85vh] max-h-[800px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Truck className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white">Canlı Çatdırılma İzləmə</h2>
                <span className="text-xs px-2 py-0.5 rounded-md bg-sky-500/30 text-sky-300 font-mono font-bold">
                  #{order.orderNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {order.customerName} • İcraçı: {order.executorName || 'Təyin edilməyib'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Yenilə"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Info Bar */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide text-[11px]">
                {order.status === 'in_transit' ? 'Yoldadır (Canlı)' : order.status === 'delivered' ? 'Təhvil verildi' : 'Gözləyir'}
              </span>
            </div>

            {distanceKm && (
              <div className="text-slate-600 dark:text-slate-300">
                Məsafə: <span className="font-bold font-mono text-sky-600 dark:text-sky-400">{distanceKm} km</span>
              </div>
            )}

            {order.currentLocation?.speed !== null && order.currentLocation?.speed !== undefined && (
              <div className="text-slate-600 dark:text-slate-300">
                Sürət: <span className="font-bold font-mono">{Math.round((order.currentLocation.speed || 0) * 3.6)} km/s</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Clock className="w-3.5 h-3.5" />
            <span>Son yenilənmə: {lastPollTime.toLocaleTimeString('az-AZ')}</span>
          </div>
        </div>

        {/* Map Canvas */}
        <div className="flex-1 relative w-full h-full bg-slate-100 dark:bg-slate-950">
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {!hasLiveGps && (
            <div className="absolute top-4 left-4 right-4 z-20 p-3 bg-amber-500/90 text-white rounded-xl shadow-lg backdrop-blur-sm text-xs flex items-center justify-between">
              <span>Sürücünün GPS koordinatı hələ qəbul edilməyib. Sürücü proqramı açdıqda avtomatik yenilənəcək.</span>
            </div>
          )}
        </div>

        {/* Footer info & Waze / External links */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="space-y-0.5">
            <div className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>{order.customerAddress}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Müştəri Tel: {order.customerPhone}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {order.customerLatitude && order.customerLongitude ? (
              <a
                href={`https://waze.com/ul?ll=${order.customerLatitude},${order.customerLongitude}&navigate=yes`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-300 font-medium text-xs flex items-center gap-1 hover:bg-sky-100"
              >
                <span>Waze ilə Aç</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium"
            >
              Bağla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
