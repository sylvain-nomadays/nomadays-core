/**
 * Circuit/Trip constants - shared across the application
 */

import { Globe, Calendar, BookOpen, Sparkles } from 'lucide-react';

// Circuit types with icons and descriptions
export const CIRCUIT_TYPES = [
  {
    id: 'online' as const,
    label: 'Circuits en ligne',
    description: 'Publiés sur le site web',
    icon: Globe,
  },
  {
    id: 'gir' as const,
    label: 'Circuits GIR',
    description: 'Départs groupés avec date fixe',
    icon: Calendar,
  },
  {
    id: 'template' as const,
    label: 'Bibliothèque',
    description: 'Templates réutilisables',
    icon: BookOpen,
  },
  {
    id: 'custom' as const,
    label: 'Sur mesure',
    description: 'Personnalisés pour un client',
    icon: Sparkles,
  },
] as const;

export type CircuitType = typeof CIRCUIT_TYPES[number]['id'];

// Trip status configuration with colors
export const TRIP_STATUS = {
  draft: {
    label: 'Brouillon',
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    dot: 'bg-gray-400',
  },
  quoted: {
    label: 'Devis',
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    dot: 'bg-blue-400',
  },
  sent: {
    label: 'Envoyé',
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    dot: 'bg-purple-400',
  },
  confirmed: {
    label: 'Confirmé',
    bg: 'bg-green-100',
    text: 'text-green-700',
    dot: 'bg-green-400',
  },
  operating: {
    label: 'En cours',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    dot: 'bg-amber-400',
  },
  completed: {
    label: 'Terminé',
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    dot: 'bg-emerald-400',
  },
  cancelled: {
    label: 'Annulé',
    bg: 'bg-red-100',
    text: 'text-red-700',
    dot: 'bg-red-400',
  },
} as const;

export type TripStatus = keyof typeof TRIP_STATUS;

// Tone options for AI content generation
export const TONE_OPTIONS = [
  {
    id: 'marketing_emotionnel' as const,
    label: 'Marketing émotionnel',
    description: 'Inspirant, fait rêver',
  },
  {
    id: 'aventure' as const,
    label: 'Aventure',
    description: 'Exploration, découverte',
  },
  {
    id: 'familial' as const,
    label: 'Familial',
    description: 'Rassurant, confort',
  },
  {
    id: 'factuel' as const,
    label: 'Factuel',
    description: 'Informatif, précis',
  },
] as const;

export type ToneType = typeof TONE_OPTIONS[number]['id'];

// Helper function to get status config
export function getStatusConfig(status: string) {
  return TRIP_STATUS[status as TripStatus] || TRIP_STATUS.draft;
}

// Helper function to get circuit type config
export function getCircuitTypeConfig(type: string) {
  return CIRCUIT_TYPES.find(t => t.id === type) || CIRCUIT_TYPES[2]; // Default to template
}
