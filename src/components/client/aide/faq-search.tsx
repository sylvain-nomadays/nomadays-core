'use client'

import { useState, useMemo } from 'react'
import {
  Search, Map, MessageSquare, FileText, Calendar, Edit3, Phone,
  Users, Briefcase, CreditCard, RefreshCw, HelpCircle,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

// ─── Icon mapping ───────────────────────────────────────────────────────────

const ICON_MAP: Record<string, typeof Map> = {
  Map, MessageSquare, FileText, Calendar, Edit3, Phone, Users,
  Briefcase, CreditCard, RefreshCw, Search, HelpCircle,
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FaqItem {
  id: string
  question: string
  answer: string
  icon: string  // Icon name (key in ICON_MAP)
  keywords: string[]
}

// ─── Fallback FAQ items (used when CMS is unavailable) ──────────────────────

const FALLBACK_FAQ_ITEMS: FaqItem[] = [
  {
    id: 'programme',
    question: 'Comment consulter mon programme de voyage ?',
    answer: 'Rendez-vous dans la section "Mes Voyages" pour retrouver tous vos projets. Cliquez sur un voyage pour acc\u00e9der au programme d\u00e9taill\u00e9 jour par jour.',
    icon: 'Map',
    keywords: ['programme', 'voyage', 'itin\u00e9raire'],
  },
  {
    id: 'contact',
    question: 'Comment contacter mon h\u00f4te local ?',
    answer: 'Vous pouvez envoyer un message \u00e0 votre h\u00f4te directement depuis l\'onglet "Salon de Th\u00e9" de votre voyage.',
    icon: 'MessageSquare',
    keywords: ['h\u00f4te', 'message', 'contacter'],
  },
  {
    id: 'documents',
    question: 'Comment t\u00e9l\u00e9charger mes documents de voyage ?',
    answer: 'Vos documents sont accessibles dans l\'onglet "Documents" de votre voyage.',
    icon: 'FileText',
    keywords: ['document', 't\u00e9l\u00e9charger', 'pdf'],
  },
  {
    id: 'paiement',
    question: 'Comment fonctionne le paiement ?',
    answer: 'Le paiement s\'effectue g\u00e9n\u00e9ralement en deux fois : un acompte \u00e0 la confirmation puis le solde avant le d\u00e9part.',
    icon: 'CreditCard',
    keywords: ['paiement', 'acompte', 'solde'],
  },
]

// ─── Component ──────────────────────────────────────────────────────────────

interface FaqSearchProps {
  themeColor: string
  items?: FaqItem[]
}

export function FaqSearch({ themeColor, items }: FaqSearchProps) {
  const faqItems = items && items.length > 0 ? items : FALLBACK_FAQ_ITEMS
  const [searchQuery, setSearchQuery] = useState('')

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return faqItems
    const query = searchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return faqItems.filter((item) => {
      const text = `${item.question} ${item.answer} ${item.keywords.join(' ')}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      return text.includes(query)
    })
  }, [searchQuery, faqItems])

  return (
    <div>
      {/* Search input */}
      <div className="px-5 py-3 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une question..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-shadow"
            style={{ '--tw-ring-color': `${themeColor}40` } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Results */}
      {filteredItems.length > 0 ? (
        <Accordion type="multiple" className="px-2">
          {filteredItems.map((item) => {
            const Icon = ICON_MAP[item.icon] || HelpCircle
            return (
              <AccordionItem
                key={item.id}
                value={item.id}
                className="border-b border-gray-50 last:border-b-0"
              >
                <AccordionTrigger className="text-sm font-medium text-gray-800 hover:no-underline py-4 px-3">
                  <div className="flex items-center gap-3 text-left">
                    <Icon className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    {item.question}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-4 pt-0">
                  <p className="text-sm text-gray-600 leading-relaxed pl-7">
                    {item.answer}
                  </p>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      ) : (
        <div className="px-5 py-10 flex flex-col items-center justify-center">
          <Search className="h-8 w-8 text-gray-200 mb-2" />
          <p className="text-sm text-gray-400">Aucun r&eacute;sultat pour &quot;{searchQuery}&quot;</p>
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs mt-2 hover:underline"
            style={{ color: themeColor }}
          >
            R&eacute;initialiser la recherche
          </button>
        </div>
      )}
    </div>
  )
}
