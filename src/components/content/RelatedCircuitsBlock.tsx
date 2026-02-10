'use client';

import { useState, useEffect } from 'react';
import { MapPin, Clock, Heart, ChevronRight, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api/client';
import type { SupportedLanguage } from '@/lib/api/types';

interface Circuit {
  id: number;
  name: string;
  slug: string;
  cover_image_url?: string;
  duration_days: number;
  base_price?: number;
  currency?: string;
  category_name?: string;
  country?: string;
}

interface RelatedCircuitsBlockProps {
  locationId?: number;
  locationName?: string;
  language?: SupportedLanguage;
  maxCircuits?: number;
  className?: string;
}

// Labels by language
const LABELS = {
  fr: {
    title: (dest: string) => `Suggestions de circuits avec ${dest}`,
    titleGeneric: 'Circuits suggeres',
    days: (n: number) => `Duree ${n} jours`,
    from: 'A partir de',
    viewCircuit: 'Voir le circuit',
    noCircuits: 'Aucun circuit disponible',
    loading: 'Chargement...',
  },
  en: {
    title: (dest: string) => `Suggested circuits with ${dest}`,
    titleGeneric: 'Suggested circuits',
    days: (n: number) => `${n} days`,
    from: 'From',
    viewCircuit: 'View circuit',
    noCircuits: 'No circuits available',
    loading: 'Loading...',
  },
  it: {
    title: (dest: string) => `Circuiti suggeriti con ${dest}`,
    titleGeneric: 'Circuiti suggeriti',
    days: (n: number) => `${n} giorni`,
    from: 'Da',
    viewCircuit: 'Vedi circuito',
    noCircuits: 'Nessun circuito disponibile',
    loading: 'Caricamento...',
  },
  es: {
    title: (dest: string) => `Circuitos sugeridos con ${dest}`,
    titleGeneric: 'Circuitos sugeridos',
    days: (n: number) => `${n} dias`,
    from: 'Desde',
    viewCircuit: 'Ver circuito',
    noCircuits: 'No hay circuitos disponibles',
    loading: 'Cargando...',
  },
  de: {
    title: (dest: string) => `Vorgeschlagene Rundreisen mit ${dest}`,
    titleGeneric: 'Vorgeschlagene Rundreisen',
    days: (n: number) => `${n} Tage`,
    from: 'Ab',
    viewCircuit: 'Rundreise ansehen',
    noCircuits: 'Keine Rundreisen verfugbar',
    loading: 'Laden...',
  },
};

export function RelatedCircuitsBlock({
  locationId,
  locationName,
  language = 'fr',
  maxCircuits = 4,
  className = '',
}: RelatedCircuitsBlockProps) {
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const labels = LABELS[language] || LABELS.fr;

  useEffect(() => {
    const fetchCircuits = async () => {
      if (!locationId) {
        setIsLoading(false);
        return;
      }

      try {
        // TODO: Replace with actual API call when endpoint exists
        // const response = await apiClient.get<Circuit[]>(`/circuits/by-location/${locationId}?limit=${maxCircuits}`);
        // setCircuits(response);

        // Mock data for now
        setCircuits([
          {
            id: 1,
            name: 'Les montagnes du Nord et les villages Akha',
            slug: 'montagnes-nord-villages-akha',
            cover_image_url: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=400',
            duration_days: 15,
            base_price: 1590,
            currency: 'EUR',
            category_name: 'Histoire & Culture',
            country: 'Thailande',
          },
        ]);
      } catch (err) {
        setError('Impossible de charger les circuits');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCircuits();
  }, [locationId, maxCircuits]);

  if (isLoading) {
    return (
      <div className={`py-8 text-center text-muted-foreground ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
        {labels.loading}
      </div>
    );
  }

  if (error || circuits.length === 0) {
    return null; // Don't show block if no circuits
  }

  const title = locationName ? labels.title(locationName) : labels.titleGeneric;

  return (
    <section className={`py-8 ${className}`}>
      <h2 className="text-xl font-semibold mb-6">{title}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {circuits.map((circuit) => (
          <CircuitCard key={circuit.id} circuit={circuit} language={language} labels={labels} />
        ))}
      </div>
    </section>
  );
}

// Circuit card component
function CircuitCard({
  circuit,
  language,
  labels,
}: {
  circuit: Circuit;
  language: SupportedLanguage;
  labels: typeof LABELS.fr;
}) {
  const [isFavorite, setIsFavorite] = useState(false);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat(language, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <a
      href={`/circuits/${circuit.slug}`}
      className="group block rounded-xl overflow-hidden bg-white border hover:shadow-lg transition-shadow"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {circuit.cover_image_url ? (
          <img
            src={circuit.cover_image_url}
            alt={circuit.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <MapPin className="h-8 w-8 text-gray-300" />
          </div>
        )}

        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            setIsFavorite(!isFavorite);
          }}
          className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white transition-colors"
        >
          <Heart
            className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
          />
        </button>

        {/* Price badge */}
        {circuit.base_price && (
          <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-emerald-500 text-white text-sm font-medium">
            {labels.from} {formatPrice(circuit.base_price, circuit.currency || 'EUR')}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category */}
        {circuit.category_name && (
          <Badge variant="secondary" className="text-xs mb-2 text-primary">
            {circuit.category_name}
          </Badge>
        )}

        {/* Title */}
        <h3 className="font-medium text-gray-900 line-clamp-2 group-hover:text-primary transition-colors">
          {circuit.name}
        </h3>

        {/* Meta */}
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {labels.days(circuit.duration_days)}
          </span>
          {circuit.country && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {circuit.country}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}
