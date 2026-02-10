'use client';

import { Sparkles, Phone, Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SupportedLanguage } from '@/lib/api/types';

interface QuoteRequestCTAProps {
  language?: SupportedLanguage;
  variant?: 'card' | 'banner' | 'inline' | 'sidebar';
  destinationName?: string;
  className?: string;
  onContactClick?: () => void;
}

// Default content by language
const CONTENT = {
  fr: {
    title: 'Votre voyage sur-mesure',
    titleWithDestination: (dest: string) => `Votre voyage a ${dest}, pense pour vous`,
    description: 'Profitez des conseils d\'experts locaux pour creer un itineraire moderne, responsable et totalement personnalise.',
    buttonText: 'Nous contacter',
    features: ['Reponse rapide', 'Equipe locale', 'Voyage 100% sur-mesure'],
  },
  en: {
    title: 'Your tailor-made trip',
    titleWithDestination: (dest: string) => `Your trip to ${dest}, designed for you`,
    description: 'Benefit from local expert advice to create a modern, responsible and fully personalized itinerary.',
    buttonText: 'Contact us',
    features: ['Fast response', 'Local team', '100% tailor-made trip'],
  },
  it: {
    title: 'Il tuo viaggio su misura',
    titleWithDestination: (dest: string) => `Il tuo viaggio a ${dest}, pensato per te`,
    description: 'Approfitta dei consigli di esperti locali per creare un itinerario moderno, responsabile e completamente personalizzato.',
    buttonText: 'Contattaci',
    features: ['Risposta rapida', 'Team locale', 'Viaggio 100% su misura'],
  },
  es: {
    title: 'Tu viaje a medida',
    titleWithDestination: (dest: string) => `Tu viaje a ${dest}, pensado para ti`,
    description: 'Aprovecha los consejos de expertos locales para crear un itinerario moderno, responsable y totalmente personalizado.',
    buttonText: 'Contactanos',
    features: ['Respuesta rapida', 'Equipo local', 'Viaje 100% a medida'],
  },
  de: {
    title: 'Ihre massgeschneiderte Reise',
    titleWithDestination: (dest: string) => `Ihre Reise nach ${dest}, fur Sie geplant`,
    description: 'Profitieren Sie von der Beratung lokaler Experten, um eine moderne, verantwortungsvolle und vollstandig personalisierte Reiseroute zu erstellen.',
    buttonText: 'Kontaktieren Sie uns',
    features: ['Schnelle Antwort', 'Lokales Team', '100% massgeschneiderte Reise'],
  },
};

export function QuoteRequestCTA({
  language = 'fr',
  variant = 'card',
  destinationName,
  className = '',
  onContactClick,
}: QuoteRequestCTAProps) {
  const content = CONTENT[language] || CONTENT.fr;
  const title = destinationName
    ? content.titleWithDestination(destinationName)
    : content.title;

  // Card variant (main style - like the screenshot)
  if (variant === 'card') {
    return (
      <div
        className={`rounded-xl p-6 bg-[#FEF7ED] border border-[#E8DDD0] ${className}`}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-full bg-white/80">
            <Sparkles className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{content.description}</p>
          </div>
        </div>

        <Button
          onClick={onContactClick}
          className="w-full bg-[#C17F59] hover:bg-[#A66B47] text-white"
        >
          {content.buttonText}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>

        {/* Features */}
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {content.features.map((feature, i) => (
            <span
              key={i}
              className="text-xs text-gray-500 flex items-center gap-1"
            >
              {i > 0 && <span className="text-gray-300">•</span>}
              {feature}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Banner variant (full width, horizontal)
  if (variant === 'banner') {
    return (
      <div
        className={`rounded-lg p-4 bg-gradient-to-r from-[#FEF7ED] to-[#FFF5E6] border border-[#E8DDD0] flex items-center justify-between gap-4 ${className}`}
      >
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-gray-900">{title}</p>
            <p className="text-sm text-gray-600 hidden sm:block">
              {content.description}
            </p>
          </div>
        </div>
        <Button
          onClick={onContactClick}
          size="sm"
          className="bg-[#C17F59] hover:bg-[#A66B47] text-white flex-shrink-0"
        >
          {content.buttonText}
        </Button>
      </div>
    );
  }

  // Inline variant (minimal, in-text)
  if (variant === 'inline') {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 ${className}`}
      >
        <Phone className="h-4 w-4 text-amber-600" />
        <span className="text-sm text-amber-800">
          {content.buttonText} pour un voyage sur-mesure
        </span>
        <ArrowRight className="h-3 w-3 text-amber-600" />
      </div>
    );
  }

  // Sidebar variant (sticky, vertical)
  if (variant === 'sidebar') {
    return (
      <div
        className={`rounded-xl p-5 bg-[#FEF7ED] border border-[#E8DDD0] sticky top-4 ${className}`}
      >
        <div className="text-center mb-4">
          <div className="inline-flex p-3 rounded-full bg-white/80 mb-3">
            <Sparkles className="h-6 w-6 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-2">{content.description}</p>
        </div>

        <Button
          onClick={onContactClick}
          className="w-full bg-[#C17F59] hover:bg-[#A66B47] text-white mb-3"
        >
          <Mail className="h-4 w-4 mr-2" />
          {content.buttonText}
        </Button>

        <div className="space-y-2">
          {content.features.map((feature, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs text-gray-500"
            >
              <span className="w-1 h-1 rounded-full bg-amber-400" />
              {feature}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
