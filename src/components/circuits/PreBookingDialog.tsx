'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ClipboardList, Check, Loader2, Clock, Send, CheckCircle, XCircle, Ban } from 'lucide-react';
import { useBookableItems, useRequestPreBookings } from '@/hooks/useBookings';
import type { BookableItem } from '@/hooks/useBookings';
import { toast } from 'sonner';

// ─── Props ───────────────────────────────────────────────────────────────────

interface PreBookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: number;
  tripName: string;
  paxCount?: number;
  onCreated?: () => void;
}

// ─── Booking status helpers ──────────────────────────────────────────────────

const BOOKING_STATUS_CONFIG: Record<string, {
  label: string;
  icon: typeof Clock;
  className: string;
}> = {
  pending: {
    label: 'En attente',
    icon: Clock,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  sent: {
    label: 'Envoyée',
    icon: Send,
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  confirmed: {
    label: 'Confirmée',
    icon: CheckCircle,
    className: 'bg-[#F4F7F3] text-[#5A6E52] border-[#D3DFCF]',
  },
  modified: {
    label: 'Modifiée',
    icon: Clock,
    className: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  cancelled: {
    label: 'Annulée',
    icon: XCircle,
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  declined: {
    label: 'Refusée',
    icon: XCircle,
    className: 'bg-red-50 text-red-800 border-red-300',
  },
  pending_cancellation: {
    label: 'Annul. en attente',
    icon: Ban,
    className: 'bg-orange-50 text-orange-800 border-orange-300',
  },
};

function BookingStatusBadge({ status }: { status: string | null | undefined }) {
  const config = status ? BOOKING_STATUS_CONFIG[status] : null;
  if (!config) return null;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded border ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PreBookingDialog({
  isOpen,
  onClose,
  tripId,
  tripName,
  paxCount: initialPaxCount,
  onCreated,
}: PreBookingDialogProps) {
  const { bookableItems, isLoading: loadingItems, refetch } = useBookableItems(tripId);
  const { requestPreBookings, requesting } = useRequestPreBookings();

  // State
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [paxCount, setPaxCount] = useState(initialPaxCount || 2);
  const [guestNames, setGuestNames] = useState('');
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState(false);

  // Auto-select items with requires_pre_booking and not already booked
  useEffect(() => {
    if (bookableItems.length > 0) {
      const preSelected = new Set<number>();
      bookableItems.forEach(item => {
        if (item.requires_pre_booking && !item.already_booked) {
          preSelected.add(item.item_id);
        }
      });
      setSelectedItemIds(preSelected);
    }
  }, [bookableItems]);

  // Fetch bookable items when dialog opens
  useEffect(() => {
    if (isOpen) {
      setDone(false);
      setNotes('');
      setGuestNames('');
      if (initialPaxCount) setPaxCount(initialPaxCount);
      // Always refetch when dialog opens to get fresh data
      refetch();
    }
  }, [isOpen, initialPaxCount, refetch]);

  const toggleItem = useCallback((itemId: number) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const handleSubmit = async () => {
    if (selectedItemIds.size === 0) {
      toast.error('Sélectionnez au moins un service à pré-réserver');
      return;
    }

    try {
      await requestPreBookings({
        tripId,
        data: {
          item_ids: Array.from(selectedItemIds),
          pax_count: paxCount,
          guest_names: guestNames || undefined,
          notes: notes || undefined,
        },
      });

      setDone(true);
      toast.success(`${selectedItemIds.size} demande(s) de pré-réservation créée(s)`);

      setTimeout(() => {
        onCreated?.();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to request pre-bookings:', err);
      toast.error('Erreur lors de la création des pré-réservations');
    }
  };

  if (!isOpen) return null;

  const availableItems = bookableItems.filter(item => !item.already_booked);
  const alreadyBookedItems = bookableItems.filter(item => item.already_booked);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#0FB6BC]" />
            <h2 className="text-lg font-semibold text-gray-900">Demande de pré-réservation</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Trip info */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-900">{tripName}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {bookableItems.length} service(s) réservable(s)
            </div>
          </div>

          {/* Loading */}
          {loadingItems && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-[#0FB6BC] animate-spin" />
              <span className="ml-2 text-sm text-gray-500">Chargement des services...</span>
            </div>
          )}

          {/* Items to select */}
          {!loadingItems && availableItems.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Services à pré-réserver
              </label>
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {availableItems.map(item => (
                  <label
                    key={item.item_id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedItemIds.has(item.item_id)
                        ? 'border-[#0FB6BC] bg-[#E6F9FA]'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedItemIds.has(item.item_id)}
                      onChange={() => toggleItem(item.item_id)}
                      className="mt-0.5 w-4 h-4 text-[#0FB6BC] border-gray-300 rounded focus:ring-[#0FB6BC]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">{item.item_name}</div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                        {item.supplier_name && <span>{item.supplier_name}</span>}
                        {item.formula_name && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span>{item.formula_name}</span>
                          </>
                        )}
                        {item.day_number != null && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span>Jour {item.day_number}</span>
                          </>
                        )}
                      </div>
                      {item.requires_pre_booking && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 text-xs rounded border border-amber-200">
                          Pré-réservation requise
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Already requested items */}
          {!loadingItems && alreadyBookedItems.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Demandes de pré-réservation déjà effectuées
              </label>
              <div className="space-y-2">
                {alreadyBookedItems.map(item => (
                  <div
                    key={item.item_id}
                    className={`p-2.5 rounded-lg text-sm ${
                      item.booking_overdue
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Check className="w-4 h-4 text-[#8BA080] shrink-0" />
                        <span className="text-gray-600 truncate">{item.item_name}</span>
                        {item.supplier_name && (
                          <span className="text-xs text-gray-400 shrink-0">({item.supplier_name})</span>
                        )}
                      </div>
                      <BookingStatusBadge status={item.booking_status} />
                    </div>
                    {/* Request details */}
                    {(item.booking_requested_by || item.booking_requested_at) && (
                      <div className="flex items-center gap-2 mt-1 ml-6 text-xs text-gray-400">
                        {item.booking_requested_by && (
                          <span>Demandé par {item.booking_requested_by}</span>
                        )}
                        {item.booking_requested_at && (
                          <>
                            {item.booking_requested_by && <span className="text-gray-300">•</span>}
                            <span>
                              {new Date(item.booking_requested_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                    {/* Overdue alert */}
                    {item.booking_overdue && item.booking_days_waiting != null && (
                      <div className="flex items-center gap-1.5 mt-1.5 ml-6 text-xs text-red-600 font-medium">
                        <Clock className="w-3 h-3" />
                        <span>
                          Sans réponse depuis {item.booking_days_waiting} jour{item.booking_days_waiting > 1 ? 's' : ''} — relance recommandée
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No items available */}
          {!loadingItems && availableItems.length === 0 && alreadyBookedItems.length === 0 && (
            <div className="text-center py-8">
              <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Aucun service réservable trouvé dans ce circuit.</p>
              <p className="text-xs text-gray-400 mt-1">
                Assurez-vous que les fournisseurs ont la case "Pré-réservation obligatoire" cochée.
              </p>
            </div>
          )}

          {/* Additional fields */}
          {availableItems.length > 0 && (
            <>
              {/* Pax count */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de pax
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={paxCount}
                    onChange={e => setPaxCount(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0FB6BC]/40 focus:border-[#0FB6BC]"
                  />
                </div>
              </div>

              {/* Guest names */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Noms des voyageurs <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={guestNames}
                  onChange={e => setGuestNames(e.target.value)}
                  placeholder="M. et Mme Dupont"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0FB6BC]/40 focus:border-[#0FB6BC]"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Chambre avec vue si possible, régime végétarien..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0FB6BC]/40 focus:border-[#0FB6BC] resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
          {availableItems.length > 0 && (
            <button
              onClick={handleSubmit}
              disabled={requesting || done || selectedItemIds.size === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg bg-[#0FB6BC] hover:bg-[#0C9296] disabled:opacity-50 transition-colors"
            >
              {done ? (
                <>
                  <Check className="w-4 h-4" />
                  Demandes créées !
                </>
              ) : requesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <ClipboardList className="w-4 h-4" />
                  Envoyer {selectedItemIds.size} demande{selectedItemIds.size > 1 ? 's' : ''}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
