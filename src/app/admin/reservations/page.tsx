'use client';

import { useState, useMemo } from 'react';
import { ClipboardList, Mail, Check, X, ExternalLink, Search, Loader2, Clock, Send, CheckCircle, XCircle, Ban } from 'lucide-react';
import { useBookings } from '@/hooks/useBookings';
import type { BookingListItem } from '@/hooks/useBookings';
import Link from 'next/link';

// ─── Status configuration ─────────────────────────────────────────────────────

type BookingStatus = 'pending' | 'sent' | 'confirmed' | 'modified' | 'cancelled' | 'declined' | 'pending_cancellation';

const statusConfig: Record<BookingStatus, {
  label: string;
  icon: typeof Clock;
  bgClass: string;
  textClass: string;
  borderClass: string;
}> = {
  pending:                { label: 'En attente',          icon: Clock,       bgClass: 'bg-amber-50',       textClass: 'text-amber-700',   borderClass: 'border-amber-200' },
  sent:                   { label: 'Envoyée',             icon: Send,        bgClass: 'bg-blue-50',        textClass: 'text-blue-700',    borderClass: 'border-blue-200' },
  confirmed:              { label: 'Confirmée',           icon: CheckCircle, bgClass: 'bg-[#F4F7F3]',      textClass: 'text-[#5A6E52]',   borderClass: 'border-[#D3DFCF]' },
  modified:               { label: 'Modifiée',            icon: Clock,       bgClass: 'bg-orange-50',      textClass: 'text-orange-700',  borderClass: 'border-orange-200' },
  cancelled:              { label: 'Annulée',             icon: XCircle,     bgClass: 'bg-red-50',         textClass: 'text-red-700',     borderClass: 'border-red-200' },
  declined:               { label: 'Refusée',             icon: XCircle,     bgClass: 'bg-red-50',         textClass: 'text-red-800',     borderClass: 'border-red-300' },
  pending_cancellation:   { label: 'Annul. en attente',   icon: Ban,         bgClass: 'bg-orange-50',      textClass: 'text-orange-800',  borderClass: 'border-orange-300' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatDateRange(start: string | null | undefined, end: string | null | undefined): string {
  if (!start && !end) return '--';
  const s = formatDate(start);
  const e = formatDate(end);
  if (s === e) return s;
  return `${s} - ${e}`;
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function ReservationsPage() {
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tripFilter, setTripFilter] = useState('');

  // Modal state
  const [modalBooking, setModalBooking] = useState<BookingListItem | null>(null);
  const [modalAction, setModalAction] = useState<'confirm' | 'cancel' | 'decline' | null>(null);
  const [modalConfirmationRef, setModalConfirmationRef] = useState('');
  const [modalNote, setModalNote] = useState('');

  // Build API filters
  const apiFilters = useMemo(() => {
    const f: { status?: string; is_pre_booking?: boolean } = { is_pre_booking: true };
    if (statusFilter !== 'all') f.status = statusFilter;
    return f;
  }, [statusFilter]);

  const { bookings, isLoading, error, refetch, sendRequest, sendCancellation, updateStatus } = useBookings(apiFilters);

  // Client-side filtering for search and trip name
  const filteredBookings = useMemo(() => {
    let list = bookings;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        b =>
          (b.supplier_name || '').toLowerCase().includes(q) ||
          (b.description || '').toLowerCase().includes(q)
      );
    }
    if (tripFilter.trim()) {
      const t = tripFilter.toLowerCase();
      list = list.filter(b => (b.trip_name || '').toLowerCase().includes(t));
    }
    return list;
  }, [bookings, searchQuery, tripFilter]);

  // Stats
  const stats = useMemo(() => {
    const s = { total: bookings.length, pending: 0, sent: 0, confirmed: 0, modified: 0, cancelled: 0, declined: 0, pending_cancellation: 0 };
    bookings.forEach(b => {
      if (b.status in s) s[b.status as keyof Omit<typeof s, 'total'>]++;
    });
    return s;
  }, [bookings]);

  // Handlers
  const handleSendRequest = async (id: number) => {
    try {
      await sendRequest(id);
      refetch();
    } catch (err) {
      console.error('Failed to send request:', err);
    }
  };

  const openModal = (booking: BookingListItem, action: 'confirm' | 'cancel' | 'decline') => {
    setModalBooking(booking);
    setModalAction(action);
    setModalConfirmationRef('');
    setModalNote('');
  };

  const closeModal = () => {
    setModalBooking(null);
    setModalAction(null);
    setModalConfirmationRef('');
    setModalNote('');
  };

  const handleSendCancellation = async (id: number) => {
    try {
      await sendCancellation(id);
      refetch();
    } catch (err) {
      console.error('Failed to send cancellation:', err);
    }
  };

  const handleModalSubmit = async () => {
    if (!modalBooking || !modalAction) return;
    // When cancelling a booking that was already sent/confirmed,
    // set it to pending_cancellation so a cancellation email can be sent.
    // For pending bookings (not yet sent), cancel directly.
    const statusMap: Record<string, string> = {
      confirm: 'confirmed',
      cancel: modalBooking.status === 'pending' ? 'cancelled' : 'pending_cancellation',
      decline: 'declined',
    };
    const newStatus = statusMap[modalAction] || 'cancelled';
    try {
      await updateStatus({
        id: modalBooking.id,
        data: {
          status: newStatus,
          ...(modalAction === 'confirm' && modalConfirmationRef ? { confirmation_ref: modalConfirmationRef } : {}),
          ...(modalNote ? { supplier_response_note: modalNote } : {}),
        },
      });
      closeModal();
      refetch();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Status badge renderer
  const renderStatusBadge = (status: string) => {
    const config = statusConfig[status as BookingStatus] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bgClass} ${config.textClass} ${config.borderClass}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#0FB6BC]/10 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-[#0FB6BC]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pré-réservations</h1>
            <p className="text-sm text-gray-500">Gestion des demandes de réservation auprès des fournisseurs</p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-7 gap-3">
          <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500 mt-0.5">Total</div>
          </div>
          <div className="bg-white rounded-lg border border-amber-200 p-3 text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <div className="text-xs text-amber-600 mt-0.5">En attente</div>
          </div>
          <div className="bg-white rounded-lg border border-blue-200 p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
            <div className="text-xs text-blue-600 mt-0.5">Envoyées</div>
          </div>
          <div className="bg-white rounded-lg border border-[#D3DFCF] p-3 text-center">
            <div className="text-2xl font-bold text-[#5A6E52]">{stats.confirmed}</div>
            <div className="text-xs text-[#5A6E52] mt-0.5">Confirmées</div>
          </div>
          <div className="bg-white rounded-lg border border-red-300 p-3 text-center">
            <div className="text-2xl font-bold text-red-800">{stats.declined}</div>
            <div className="text-xs text-red-800 mt-0.5">Refusées</div>
          </div>
          <div className="bg-white rounded-lg border border-orange-300 p-3 text-center">
            <div className="text-2xl font-bold text-orange-800">{stats.pending_cancellation}</div>
            <div className="text-xs text-orange-800 mt-0.5">À annuler</div>
          </div>
          <div className="bg-white rounded-lg border border-red-200 p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            <div className="text-xs text-red-600 mt-0.5">Annulées</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search by supplier / description */}
          <div className="flex-1 min-w-[220px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par fournisseur ou description..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0FB6BC]/40 focus:border-[#0FB6BC]"
            />
          </div>

          {/* Status dropdown */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0FB6BC]/40 focus:border-[#0FB6BC]"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="sent">Envoyée</option>
            <option value="confirmed">Confirmée</option>
            <option value="modified">Modifiée</option>
            <option value="pending_cancellation">Annulation en attente</option>
            <option value="declined">Refusée</option>
            <option value="cancelled">Annulée</option>
          </select>

          {/* Trip filter */}
          <div className="min-w-[180px] relative">
            <input
              type="text"
              placeholder="Filtrer par circuit..."
              value={tripFilter}
              onChange={e => setTripFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0FB6BC]/40 focus:border-[#0FB6BC]"
            />
          </div>

          {/* Reset */}
          {(searchQuery || statusFilter !== 'all' || tripFilter) && (
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); setTripFilter(''); }}
              className="text-sm text-gray-500 hover:text-gray-700 whitespace-nowrap"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#0FB6BC] animate-spin" />
          <span className="ml-3 text-gray-500">Chargement des pré-réservations...</span>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium mb-2">Erreur lors du chargement</p>
          <p className="text-sm text-red-600 mb-4">{String(error)}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Demandé par</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Circuit</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Pax</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBookings.map(booking => (
                  <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                    {/* Demandé par */}
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900 text-sm">{booking.requested_by_name || '—'}</div>
                      <div className="text-xs text-gray-400 mt-0.5">le {formatDate(booking.created_at)}</div>
                    </td>

                    {/* Service */}
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{booking.description}</div>
                      {booking.formula_name && (
                        <div className="text-xs text-gray-400 mt-0.5">{booking.formula_name}</div>
                      )}
                      {booking.block_type && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                          {booking.block_type}
                        </span>
                      )}
                    </td>

                    {/* Circuit */}
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{booking.trip_name || `Circuit #${booking.trip_id}`}</div>
                    </td>

                    {/* Dates */}
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-700 whitespace-nowrap">
                        {formatDateRange(booking.service_date_start, booking.service_date_end)}
                      </div>
                    </td>

                    {/* Pax */}
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm text-gray-700">{booking.pax_count ?? '--'}</span>
                      {booking.guest_names && (
                        <div className="text-xs text-gray-400 mt-0.5 max-w-[120px] truncate mx-auto" title={booking.guest_names}>
                          {booking.guest_names}
                        </div>
                      )}
                    </td>

                    {/* Statut */}
                    <td className="px-4 py-4 text-center">
                      {renderStatusBadge(booking.status)}
                      {booking.email_sent_at && booking.status === 'sent' && (
                        <div className="text-xs text-gray-400 mt-1">
                          Envoyée le {formatDate(booking.email_sent_at)}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Pending: send button */}
                        {booking.status === 'pending' && (
                          <button
                            onClick={() => handleSendRequest(booking.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-[#0FB6BC] hover:bg-[#0C9296] transition-colors"
                            title="Envoyer la demande"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            Envoyer
                          </button>
                        )}

                        {/* Sent: confirm + decline + cancel buttons */}
                        {booking.status === 'sent' && (
                          <>
                            <button
                              onClick={() => openModal(booking, 'confirm')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-white bg-[#8BA080] hover:bg-[#728A68] transition-colors"
                              title="Confirmer la réservation"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Confirmer
                            </button>
                            <button
                              onClick={() => openModal(booking, 'decline')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-white bg-red-500 hover:bg-red-600 transition-colors"
                              title="Le fournisseur refuse"
                            >
                              <X className="w-3.5 h-3.5" />
                              Refusée
                            </button>
                            <button
                              onClick={() => openModal(booking, 'cancel')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
                              title="Annuler la demande"
                            >
                              Annuler
                            </button>
                          </>
                        )}

                        {/* Pending: also allow cancel */}
                        {booking.status === 'pending' && (
                          <button
                            onClick={() => openModal(booking, 'cancel')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
                            title="Annuler la demande"
                          >
                            Annuler
                          </button>
                        )}

                        {/* Pending cancellation: send cancellation email button */}
                        {booking.status === 'pending_cancellation' && (
                          <button
                            onClick={() => handleSendCancellation(booking.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-red-500 hover:bg-red-600 transition-colors"
                            title="Envoyer l'email d'annulation au fournisseur"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            Envoyer annulation
                          </button>
                        )}

                        {/* Confirmed: show ref + allow cancel */}
                        {booking.status === 'confirmed' && (
                          <>
                            {booking.confirmation_ref && (
                              <span className="text-xs text-[#8BA080] font-medium bg-[#8BA080]/10 px-2 py-1 rounded-lg">
                                Ref: {booking.confirmation_ref}
                              </span>
                            )}
                            <button
                              onClick={() => openModal(booking, 'cancel')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
                              title="Annuler la réservation"
                            >
                              Annuler
                            </button>
                          </>
                        )}

                        {/* Cancelled/Declined/Pending cancellation: show note */}
                        {(booking.status === 'cancelled' || booking.status === 'declined' || booking.status === 'pending_cancellation') && (booking as BookingListItem & { supplier_response_note?: string }).supplier_response_note && (
                          <span className="text-xs text-red-500 italic max-w-[160px] truncate" title={(booking as BookingListItem & { supplier_response_note?: string }).supplier_response_note}>
                            {(booking as BookingListItem & { supplier_response_note?: string }).supplier_response_note}
                          </span>
                        )}

                        {/* Always: link to circuit */}
                        <Link
                          href={`/admin/circuits/${booking.trip_id}`}
                          className="inline-flex items-center p-1.5 rounded-lg text-gray-400 hover:text-[#0FB6BC] hover:bg-[#0FB6BC]/10 transition-colors"
                          title="Voir le circuit"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {filteredBookings.length === 0 && (
            <div className="text-center py-16">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune pré-réservation trouvée</h3>
              <p className="text-gray-500 text-sm">
                {searchQuery || statusFilter !== 'all' || tripFilter
                  ? 'Essayez de modifier vos filtres de recherche.'
                  : 'Les pré-réservations apparaîtront ici lorsque des demandes seront créées depuis les circuits.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── Modal: Confirm / Decline / Cancel ────────────────────────────────── */}
      {modalBooking && modalAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeModal}>
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {modalAction === 'confirm' ? 'Confirmer la réservation'
                  : modalAction === 'decline' ? 'Fournisseur refuse la réservation'
                  : modalBooking.status === 'pending' ? 'Annuler la demande'
                  : 'Demander l\'annulation'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-4 space-y-4">
              {/* Booking summary */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-900">{modalBooking.supplier_name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{modalBooking.description}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {formatDateRange(modalBooking.service_date_start, modalBooking.service_date_end)}
                  {modalBooking.pax_count ? ` - ${modalBooking.pax_count} pax` : ''}
                </div>
              </div>

              {/* Confirmation ref (only for confirm) */}
              {modalAction === 'confirm' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Référence de confirmation
                  </label>
                  <input
                    type="text"
                    value={modalConfirmationRef}
                    onChange={e => setModalConfirmationRef(e.target.value)}
                    placeholder="Ex: CONF-2024-1234"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8BA080]/40 focus:border-[#8BA080]"
                  />
                </div>
              )}

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {modalAction === 'confirm' ? 'Note (optionnel)'
                    : modalAction === 'decline' ? 'Raison du refus du fournisseur'
                    : "Raison de l'annulation (optionnel)"}
                </label>
                <textarea
                  value={modalNote}
                  onChange={e => setModalNote(e.target.value)}
                  placeholder={
                    modalAction === 'confirm'
                      ? 'Informations complémentaires...'
                      : modalAction === 'decline'
                      ? 'Ex: Hôtel complet sur ces dates, chambre non disponible...'
                      : 'Ex: Client a changé de programme, changement de circuit...'
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0FB6BC]/40 focus:border-[#0FB6BC] resize-none"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Fermer
              </button>
              {modalAction === 'confirm' ? (
                <button
                  onClick={handleModalSubmit}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-[#8BA080] hover:bg-[#728A68] transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Confirmer
                </button>
              ) : modalAction === 'decline' ? (
                <button
                  onClick={handleModalSubmit}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-red-500 hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Marquer comme refusée
                </button>
              ) : (
                <button
                  onClick={handleModalSubmit}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-gray-500 hover:bg-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                  {modalBooking.status === 'pending' ? 'Annuler la demande' : 'Demander l\'annulation'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
