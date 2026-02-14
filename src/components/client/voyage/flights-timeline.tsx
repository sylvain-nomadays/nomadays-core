import { AirplaneTilt, Train, Bus, Car, Boat, MapPin } from '@phosphor-icons/react/dist/ssr';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import type { ContinentTheme } from '../continent-theme';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FlightData {
  id: string;
  type: 'arrival' | 'departure';
  transport_type?: string | null;
  airport_code?: string | null;
  airport_name?: string | null;
  flight_number?: string | null;
  date?: string | null;
  time?: string | null;
  notes?: string | null;
}

interface FlightsTimelineProps {
  arrivals: FlightData[];
  departures: FlightData[];
  continentTheme: ContinentTheme;
}

// ─── Transport icon ──────────────────────────────────────────────────────────

function getTransportIcon(transportType?: string | null): PhosphorIcon {
  switch (transportType) {
    case 'train': return Train;
    case 'bus': return Bus;
    case 'car': return Car;
    case 'boat': return Boat;
    default: return AirplaneTilt;
  }
}

function getTransportLabel(transportType?: string | null) {
  switch (transportType) {
    case 'train': return 'Train';
    case 'bus': return 'Bus';
    case 'car': return 'Voiture';
    case 'boat': return 'Bateau';
    default: return 'Vol';
  }
}

// ─── Flight card ─────────────────────────────────────────────────────────────

function FlightCard({
  flight,
  isArrival,
  continentTheme,
}: {
  flight: FlightData;
  isArrival: boolean;
  continentTheme: ContinentTheme;
}) {
  const Icon = getTransportIcon(flight.transport_type);
  const iconColor = isArrival ? '#10b981' : '#f59e0b';

  return (
    <div className="flex gap-4">
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${iconColor}15` }}
        >
          <Icon
            size={20}
            weight="duotone"
            className={!isArrival ? 'rotate-45' : ''}
            style={{ color: iconColor }}
          />
        </div>
        <div className="flex-1 w-px bg-gray-200 my-2" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="p-4 rounded-xl border border-gray-100 bg-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              {flight.airport_code && (
                <p className="text-lg font-bold text-gray-900">{flight.airport_code}</p>
              )}
              {flight.airport_name && (
                <p className="text-sm text-gray-500 mt-0.5">{flight.airport_name}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              {flight.date && (
                <p className="text-sm font-medium text-gray-900">
                  {new Date(flight.date).toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              )}
              {flight.time && (
                <p className="text-sm text-gray-500 mt-0.5">{flight.time}</p>
              )}
            </div>
          </div>

          {/* Flight details */}
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            {flight.flight_number && (
              <span className="text-xs font-medium px-2 py-1 rounded-md bg-gray-50 text-gray-600">
                {getTransportLabel(flight.transport_type)} {flight.flight_number}
              </span>
            )}
            {flight.transport_type && flight.transport_type !== 'flight' && (
              <span className="text-xs font-medium px-2 py-1 rounded-md bg-gray-50 text-gray-600">
                {getTransportLabel(flight.transport_type)}
              </span>
            )}
          </div>

          {flight.notes && (
            <p className="text-xs text-gray-400 mt-2">{flight.notes}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FlightsTimeline({
  arrivals,
  departures,
  continentTheme,
}: FlightsTimelineProps) {
  if (arrivals.length === 0 && departures.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <AirplaneTilt size={24} weight="duotone" className="text-gray-300" />
        </div>
        <p className="text-sm text-gray-500">
          Les informations de vol seront ajoutées une fois votre voyage confirmé.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Arrivals */}
      {arrivals.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div
              className="h-6 w-6 rounded-md flex items-center justify-center"
              style={{ backgroundColor: `${continentTheme.primary}15` }}
            >
              <MapPin size={14} weight="duotone" style={{ color: continentTheme.primary }} />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">Vol aller</h3>
          </div>
          <div>
            {arrivals.map((flight) => (
              <FlightCard
                key={flight.id}
                flight={flight}
                isArrival={true}
                continentTheme={continentTheme}
              />
            ))}
          </div>
        </div>
      )}

      {/* Departures */}
      {departures.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div
              className="h-6 w-6 rounded-md flex items-center justify-center"
              style={{ backgroundColor: `${continentTheme.accent}15` }}
            >
              <MapPin size={14} weight="duotone" style={{ color: continentTheme.accent }} />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">Vol retour</h3>
          </div>
          <div>
            {departures.map((flight) => (
              <FlightCard
                key={flight.id}
                flight={flight}
                isArrival={false}
                continentTheme={continentTheme}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
