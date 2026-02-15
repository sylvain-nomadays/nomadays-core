'use client'

import { useState } from 'react'
import {
  ClipboardText,
  Info,
  MapTrifold,
  Bed,
  FilePdf,
  CaretUp,
} from '@phosphor-icons/react'
import type { ContinentTheme } from '../continent-theme'
import { DayByDayProgram } from './day-by-day-program'
import { TripInfoSection } from './trip-info-section'
import { PricingSummary } from './pricing-summary'
import { AccommodationsSummary } from './accommodations-summary'

// ─── Types ───────────────────────────────────────────────────────────────────

interface TripProposalDetailProps {
  trip: any
  tripDays: any[]
  tripPhotos: any[]
  accommodationsMap: Record<number, any>
  roomCategoriesMap: Record<number, any[]>
  accommodationPhotosMap: Record<number, any[]>
  conditionData: {
    tripConditions: any[]
    conditions: any[]
    conditionOptions: any[]
    itemConditionMap: Record<number, number | null>
  }
  continentTheme: ContinentTheme
  // Pricing
  pricingData: {
    totalSell: number | null
    currency: string
    pricePerAdult: number | null
    pricePerChild: number | null
  }
  payments: any[]
  adultsCount: number
  childrenCount: number
  // Feedback
  feedbackContext?: {
    dossierId: string
    participantId: string
    participantEmail: string
    participantName: string
    advisorEmail: string
    advisorName: string
    reactions: Record<string, 'love' | 'modify'>
    paces: Record<string, 'slower' | 'normal' | 'faster'>
  }
  // Close callback
  onClose?: () => void
}

type SubTab = 'program' | 'infos' | 'map' | 'accommodations'

const SUB_TABS: { value: SubTab; label: string; icon: typeof ClipboardText }[] = [
  { value: 'program', label: 'Programme', icon: ClipboardText },
  { value: 'infos', label: 'Informations', icon: Info },
  { value: 'map', label: 'Carte', icon: MapTrifold },
  { value: 'accommodations', label: 'Hébergements', icon: Bed },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function TripProposalDetail({
  trip,
  tripDays,
  tripPhotos,
  accommodationsMap,
  roomCategoriesMap,
  accommodationPhotosMap,
  conditionData,
  continentTheme,
  pricingData,
  payments,
  adultsCount,
  childrenCount,
  feedbackContext,
  onClose,
}: TripProposalDetailProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('program')

  // Check if accommodations data exists
  const hasAccommodations = Object.keys(accommodationsMap).length > 0

  return (
    <div className="mt-5">
      {/* ─── Sub-tab navigation + actions ─────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex gap-1 bg-gray-50 rounded-xl p-1 flex-1">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeSubTab === tab.value

            // Hide accommodations tab if no data
            if (tab.value === 'accommodations' && !hasAccommodations) return null

            return (
              <button
                key={tab.value}
                onClick={() => setActiveSubTab(tab.value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
                  isActive
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                }`}
                style={isActive ? { color: continentTheme.primary } : undefined}
              >
                <Icon size={16} weight={isActive ? 'duotone' : 'regular'} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Print / PDF button */}
        <button
          onClick={() => window.print()}
          className="print:hidden flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors flex-shrink-0"
          title="Télécharger en PDF / Imprimer"
        >
          <FilePdf size={15} weight="duotone" />
          <span className="hidden md:inline">PDF</span>
        </button>
      </div>

      {/* ─── Sub-tab content ─────────────────────────────────────────────── */}

      {/* Programme */}
      {activeSubTab === 'program' && (
        <DayByDayProgram
          tripDays={tripDays}
          photos={tripPhotos}
          continentTheme={continentTheme}
          startDate={trip.start_date}
          accommodationsMap={accommodationsMap}
          roomCategoriesMap={roomCategoriesMap}
          accommodationPhotosMap={accommodationPhotosMap}
          conditionData={conditionData}
          feedbackContext={feedbackContext}
        />
      )}

      {/* Informations */}
      {activeSubTab === 'infos' && (
        <div className="space-y-6">
          {/* Résumé financier */}
          <PricingSummary
            totalSell={pricingData.totalSell}
            currency={pricingData.currency}
            pricePerAdult={pricingData.pricePerAdult}
            pricePerChild={pricingData.pricePerChild}
            adultsCount={adultsCount}
            childrenCount={childrenCount}
            payments={payments}
            continentTheme={continentTheme}
          />

          {/* Infos du trip (inclus/exclus, conditions, niveaux) */}
          <TripInfoSection
            infoGeneralHtml={trip.info_general_html}
            infoFormalitiesHtml={trip.info_formalities_html}
            infoBookingConditionsHtml={trip.info_booking_conditions_html}
            infoCancellationPolicyHtml={trip.info_cancellation_policy_html}
            infoAdditionalHtml={trip.info_additional_html}
            inclusions={trip.inclusions ? (Array.isArray(trip.inclusions) ? trip.inclusions : []) : null}
            exclusions={trip.exclusions ? (Array.isArray(trip.exclusions) ? trip.exclusions : []) : null}
            comfortLevel={trip.comfort_level}
            difficultyLevel={trip.difficulty_level}
            continentTheme={continentTheme}
          />
        </div>
      )}

      {/* Carte */}
      {activeSubTab === 'map' && (
        <div className="text-center py-16">
          <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <MapTrifold size={24} weight="duotone" className="text-gray-300" />
          </div>
          <p className="text-sm text-gray-500">
            La carte interactive de votre circuit sera bientôt disponible ici.
          </p>
        </div>
      )}

      {/* Hébergements */}
      {activeSubTab === 'accommodations' && hasAccommodations && (
        <AccommodationsSummary
          tripDays={tripDays}
          accommodationsMap={accommodationsMap}
          roomCategoriesMap={roomCategoriesMap}
          accommodationPhotosMap={accommodationPhotosMap}
          continentTheme={continentTheme}
        />
      )}

      {/* ─── Bottom close button ─────────────────────────────────────────── */}
      {onClose && (
        <div className="flex justify-center pt-8 pb-2">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: continentTheme.primary }}
          >
            <CaretUp size={14} weight="bold" />
            Masquer le détail
          </button>
        </div>
      )}
    </div>
  )
}
