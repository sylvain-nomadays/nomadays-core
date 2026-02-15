'use client'

import { useState, useTransition } from 'react'
import { CaretDown, CaretUp, ArrowCounterClockwise, Archive } from '@phosphor-icons/react'
import { TripProposalCard } from './trip-proposal-card'
import { TripProposalDetail } from './trip-proposal-detail'
import type { ContinentTheme } from '../continent-theme'
import { clientChooseProposal, clientUnchooseProposal } from '@/lib/actions/client-modifications'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProposalsSectionProps {
  proposals: any[]
  archivedProposals?: any[]
  confirmedTripId: number | null
  continentTheme: ContinentTheme
  advisorName: string | null
  dossierId: string
  adultsCount: number
  childrenCount: number
  departureDateFrom: string | null
  departureDateTo: string | null
  isLead: boolean
  participantId: string
  participantName: string
  dossierStatus?: string
  selectedCotationId?: number | null
  // Pricing data (from dossier level)
  pricingData: {
    totalSell: number | null
    currency: string
    pricePerAdult: number | null
    pricePerChild: number | null
  }
  payments: any[]
  // Feedback base context (without per-trip reactions/paces)
  feedbackBaseContext?: {
    dossierId: string
    participantId: string
    participantEmail: string
    participantName: string
    advisorEmail: string
    advisorName: string
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProposalsSection({
  proposals,
  archivedProposals = [],
  confirmedTripId,
  continentTheme,
  advisorName,
  dossierId,
  adultsCount,
  childrenCount,
  departureDateFrom,
  departureDateTo,
  isLead,
  participantId,
  participantName,
  dossierStatus,
  selectedCotationId: initialSelectedCotationId,
  pricingData,
  payments,
  feedbackBaseContext,
}: ProposalsSectionProps) {
  const [showOtherProposals, setShowOtherProposals] = useState(false)
  const [showArchivedProposals, setShowArchivedProposals] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isDeselecting, startDeselecting] = useTransition()
  const [justSelectedId, setJustSelectedId] = useState<number | null>(null)
  const [justDeselected, setJustDeselected] = useState(false)
  const [selectedCotationId, setSelectedCotationId] = useState<number | null>(initialSelectedCotationId ?? null)
  // Track which proposal is expanded (shows sub-tabs)
  const [expandedTripId, setExpandedTripId] = useState<number | null>(null)

  const advisorFirstName = advisorName?.split(' ')[0] || null
  const travelersCount = adultsCount + childrenCount

  // Determine which trip is confirmed (from server or just selected by client)
  const effectiveConfirmedId = justDeselected ? null : (justSelectedId ?? confirmedTripId)
  const hasConfirmedTrip = effectiveConfirmedId != null
  const effectiveSelectedCotationId = justDeselected ? null : selectedCotationId

  // Can the lead deselect? Allowed when dossier is not yet in an irrevocable state
  const irrevocableStatuses = ['confirmed', 'operating', 'completed']
  const canDeselect = isLead && hasConfirmedTrip && !irrevocableStatuses.includes(dossierStatus || '') && !justDeselected

  // Split proposals: confirmed first, then others
  const confirmedProposal = hasConfirmedTrip
    ? proposals.find((t) => t.id === effectiveConfirmedId)
    : null
  const otherProposals = hasConfirmedTrip
    ? proposals.filter((t) => t.id !== effectiveConfirmedId)
    : proposals

  const handleChooseProposal = (tripId: number, cotationId?: number) => {
    startTransition(async () => {
      try {
        await clientChooseProposal({
          dossierId,
          participantId,
          participantName,
          tripId,
          ...(cotationId ? { cotationId } : {}),
        })
        setJustSelectedId(tripId)
        setJustDeselected(false)
        if (cotationId) setSelectedCotationId(cotationId)
      } catch (error) {
        console.error('Failed to select proposal:', error)
      }
    })
  }

  const handleUnchooseProposal = () => {
    startDeselecting(async () => {
      try {
        await clientUnchooseProposal({
          dossierId,
          participantId,
          participantName,
        })
        setJustDeselected(true)
        setJustSelectedId(null)
        setSelectedCotationId(null)
      } catch (error) {
        console.error('Failed to deselect proposal:', error)
      }
    })
  }

  const toggleExpand = (tripId: number) => {
    setExpandedTripId((prev) => (prev === tripId ? null : tripId))
  }

  // ─── Helper: render detail sub-tabs for a trip ─────────────────────────────

  function renderTripDetail(trip: any) {
    if (!trip.detailData || expandedTripId !== trip.id) return null

    const detail = trip.detailData
    const feedbackContext = feedbackBaseContext
      ? {
          ...feedbackBaseContext,
          reactions: detail.feedbackReactions || {},
          paces: detail.feedbackPaces || {},
        }
      : undefined

    return (
      <TripProposalDetail
        trip={trip}
        tripDays={detail.tripDays}
        tripPhotos={detail.tripPhotos}
        accommodationsMap={detail.accommodationsMap}
        roomCategoriesMap={detail.roomCategoriesMap}
        accommodationPhotosMap={detail.accommodationPhotosMap}
        conditionData={detail.conditionData}
        continentTheme={continentTheme}
        pricingData={pricingData}
        payments={payments}
        adultsCount={adultsCount}
        childrenCount={childrenCount}
        feedbackContext={feedbackContext}
        onClose={() => setExpandedTripId(null)}
      />
    )
  }

  // ─── No proposals ───────────────────────────────────────────────────────────

  if (proposals.length === 0 && archivedProposals.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500">
          {advisorFirstName
            ? `${advisorFirstName} prépare actuellement vos propositions de voyage.`
            : 'Vos propositions de voyage seront bientôt disponibles ici.'}
        </p>
      </div>
    )
  }

  // ─── Archived proposals section (shared between both views) ─────────────────

  const archivedSection = archivedProposals.length > 0 && hasConfirmedTrip && (
    <div className="mt-8">
      <button
        onClick={() => setShowArchivedProposals(!showArchivedProposals)}
        className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
      >
        <Archive size={16} weight="duotone" />
        {showArchivedProposals ? (
          <CaretUp size={14} weight="bold" />
        ) : (
          <CaretDown size={14} weight="bold" />
        )}
        {showArchivedProposals
          ? 'Masquer les propositions archivées'
          : `Voir ${archivedProposals.length} proposition${archivedProposals.length > 1 ? 's' : ''} archivée${archivedProposals.length > 1 ? 's' : ''}`}
      </button>

      {showArchivedProposals && (
        <div className="mt-4 flex flex-col gap-6 opacity-50">
          {archivedProposals.map((trip: any) => (
            <TripProposalCard
              key={trip.id}
              trip={trip}
              isConfirmed={false}
              continentTheme={continentTheme}
              stops={trip.stops}
              travelersCount={travelersCount}
              advisorFirstName={advisorFirstName}
              dossierId={dossierId}
              pricing={trip.pricing}
              pricingOptions={trip.pricingOptions}
              currency={trip.default_currency || 'EUR'}
              departureDateFrom={departureDateFrom}
              departureDateTo={departureDateTo}
              isLead={false}
              hasConfirmedTrip
            />
          ))}
        </div>
      )}
    </div>
  )

  // ─── Has confirmed trip: show selected with sub-tabs + collapsible others ───

  if (hasConfirmedTrip && confirmedProposal) {
    // Auto-expand confirmed trip
    const isExpanded = expandedTripId === confirmedProposal.id || expandedTripId === null

    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-xl font-bold text-gray-800">
            Votre voyage sélectionné
          </h2>
          {canDeselect && (
            <button
              onClick={handleUnchooseProposal}
              disabled={isDeselecting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 transition-all hover:bg-amber-100 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isDeselecting ? (
                <>
                  <div className="w-3 h-3 border-2 border-amber-300 border-t-amber-700 rounded-full animate-spin" />
                  Modification...
                </>
              ) : (
                <>
                  <ArrowCounterClockwise size={14} weight="bold" />
                  Modifier mon choix
                </>
              )}
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-5">
          {advisorFirstName
            ? `Vous avez choisi cette proposition${advisorFirstName ? ` de ${advisorFirstName}` : ''}`
            : 'La proposition retenue pour votre voyage'}
        </p>

        {/* Selected proposal — always visible with sub-tabs */}
        <TripProposalCard
          trip={confirmedProposal}
          isConfirmed
          continentTheme={continentTheme}
          stops={confirmedProposal.stops}
          travelersCount={travelersCount}
          advisorFirstName={advisorFirstName}
          dossierId={dossierId}
          pricing={confirmedProposal.pricing}
          pricingOptions={confirmedProposal.pricingOptions}
          currency={confirmedProposal.default_currency || 'EUR'}
          departureDateFrom={departureDateFrom}
          departureDateTo={departureDateTo}
          isLead={isLead}
          hasConfirmedTrip
          selectedCotationId={effectiveSelectedCotationId}
          isExpanded={isExpanded}
          onToggleExpand={() => {
            setExpandedTripId(isExpanded ? -1 : confirmedProposal.id)
          }}
        />

        {/* Sub-tabs for confirmed proposal */}
        {isExpanded && confirmedProposal.detailData && (
          <TripProposalDetail
            trip={confirmedProposal}
            tripDays={confirmedProposal.detailData.tripDays}
            tripPhotos={confirmedProposal.detailData.tripPhotos}
            accommodationsMap={confirmedProposal.detailData.accommodationsMap}
            roomCategoriesMap={confirmedProposal.detailData.roomCategoriesMap}
            accommodationPhotosMap={confirmedProposal.detailData.accommodationPhotosMap}
            conditionData={confirmedProposal.detailData.conditionData}
            continentTheme={continentTheme}
            pricingData={pricingData}
            payments={payments}
            adultsCount={adultsCount}
            childrenCount={childrenCount}
            feedbackContext={feedbackBaseContext ? {
              ...feedbackBaseContext,
              reactions: confirmedProposal.detailData.feedbackReactions || {},
              paces: confirmedProposal.detailData.feedbackPaces || {},
            } : undefined}
            onClose={() => setExpandedTripId(-1)}
          />
        )}

        {/* Other proposals — collapsible */}
        {otherProposals.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowOtherProposals(!showOtherProposals)}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              {showOtherProposals ? (
                <CaretUp size={16} weight="bold" />
              ) : (
                <CaretDown size={16} weight="bold" />
              )}
              {showOtherProposals
                ? 'Masquer les autres propositions'
                : `Voir les ${otherProposals.length} autre${otherProposals.length > 1 ? 's' : ''} proposition${otherProposals.length > 1 ? 's' : ''}`}
            </button>

            {showOtherProposals && (
              <div className="mt-4 flex flex-col gap-6 opacity-75">
                {otherProposals.map((trip: any) => (
                  <div key={trip.id}>
                    <TripProposalCard
                      trip={trip}
                      isConfirmed={false}
                      continentTheme={continentTheme}
                      stops={trip.stops}
                      travelersCount={travelersCount}
                      advisorFirstName={advisorFirstName}
                      dossierId={dossierId}
                      pricing={trip.pricing}
                      pricingOptions={trip.pricingOptions}
                      currency={trip.default_currency || 'EUR'}
                      departureDateFrom={departureDateFrom}
                      departureDateTo={departureDateTo}
                      isLead={isLead}
                      hasConfirmedTrip
                      selectedCotationId={effectiveSelectedCotationId}
                      onChooseProposal={handleChooseProposal}
                      isExpanded={expandedTripId === trip.id}
                      onToggleExpand={() => toggleExpand(trip.id)}
                    />
                    {renderTripDetail(trip)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Archived proposals */}
        {archivedSection}
      </div>
    )
  }

  // ─── No confirmed trip: show all proposals with selection button ─────────────

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-gray-800 mb-2">
        {proposals.length > 1
          ? 'Vos propositions de voyage'
          : 'Votre proposition de voyage'}
      </h2>
      <p className="text-sm text-gray-500 mb-5">
        {proposals.length > 1
          ? `Comparez les circuits proposés${advisorFirstName ? ` par ${advisorFirstName}` : ''} et choisissez celui qui vous correspond`
          : advisorFirstName
            ? `${advisorFirstName} a préparé cet itinéraire sur-mesure pour vous`
            : 'Votre itinéraire personnalisé'}
      </p>

      {isPending && (
        <div className="mb-4 flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-4 py-2.5 rounded-xl">
          <div className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
          Sélection en cours...
        </div>
      )}

      <div className="flex flex-col gap-8">
        {proposals.map((trip: any) => {
          // Auto-expand if single proposal, otherwise require click
          const isSingle = proposals.length === 1
          const isThisExpanded = isSingle
            ? expandedTripId !== -1   // auto-expand unless explicitly collapsed
            : expandedTripId === trip.id

          return (
            <div key={trip.id}>
              <TripProposalCard
                trip={trip}
                isConfirmed={false}
                continentTheme={continentTheme}
                stops={trip.stops}
                travelersCount={travelersCount}
                advisorFirstName={advisorFirstName}
                dossierId={dossierId}
                pricing={trip.pricing}
                pricingOptions={trip.pricingOptions}
                currency={trip.default_currency || 'EUR'}
                departureDateFrom={departureDateFrom}
                departureDateTo={departureDateTo}
                isLead={isLead}
                hasConfirmedTrip={false}
                selectedCotationId={effectiveSelectedCotationId}
                onChooseProposal={handleChooseProposal}
                isExpanded={isThisExpanded}
                onToggleExpand={() => {
                  if (isSingle) {
                    setExpandedTripId(isThisExpanded ? -1 : trip.id)
                  } else {
                    toggleExpand(trip.id)
                  }
                }}
              />
              {isThisExpanded && trip.detailData && (
                <TripProposalDetail
                  trip={trip}
                  tripDays={trip.detailData.tripDays}
                  tripPhotos={trip.detailData.tripPhotos}
                  accommodationsMap={trip.detailData.accommodationsMap}
                  roomCategoriesMap={trip.detailData.roomCategoriesMap}
                  accommodationPhotosMap={trip.detailData.accommodationPhotosMap}
                  conditionData={trip.detailData.conditionData}
                  continentTheme={continentTheme}
                  pricingData={pricingData}
                  payments={payments}
                  adultsCount={adultsCount}
                  childrenCount={childrenCount}
                  feedbackContext={feedbackBaseContext ? {
                    ...feedbackBaseContext,
                    reactions: trip.detailData.feedbackReactions || {},
                    paces: trip.detailData.feedbackPaces || {},
                  } : undefined}
                  onClose={() => {
                    if (isSingle) {
                      setExpandedTripId(-1)
                    } else {
                      toggleExpand(trip.id)
                    }
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
