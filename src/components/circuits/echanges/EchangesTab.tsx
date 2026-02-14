'use client';

import BookingStatusBoard from './BookingStatusBoard';
import TripNotesPanel from './TripNotesPanel';

interface EchangesTabProps {
  tripId: number;
  tenantId: string;
}

export default function EchangesTab({ tripId, tenantId }: EchangesTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left panel — Booking Status Board (3/5) */}
      <div className="lg:col-span-3">
        <BookingStatusBoard tripId={tripId} />
      </div>

      {/* Right panel — Trip Notes (2/5) */}
      <div className="lg:col-span-2">
        <TripNotesPanel tripId={tripId} tenantId={tenantId} />
      </div>
    </div>
  );
}
