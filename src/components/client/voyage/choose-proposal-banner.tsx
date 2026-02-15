'use client'

import { useTransition } from 'react'
import { CheckCircle } from '@phosphor-icons/react'
import { clientChooseProposal } from '@/lib/actions/client-modifications'

interface ChooseProposalBannerProps {
  tripId: number
  tripName: string
  dossierId: string
  participantId: string
  participantName: string
  isLead: boolean
  isConfirmed: boolean
  continentTheme: { primary: string }
}

export function ChooseProposalBanner({
  tripId,
  tripName,
  dossierId,
  participantId,
  participantName,
  isLead,
  isConfirmed,
}: ChooseProposalBannerProps) {
  const [isPending, startTransition] = useTransition()

  if (!isLead || isConfirmed) return null

  const handleChoose = () => {
    startTransition(async () => {
      await clientChooseProposal({
        dossierId,
        participantId,
        participantName,
        tripId,
      })
    })
  }

  return (
    <div className="mb-6 print:hidden">
      <button
        onClick={handleChoose}
        disabled={isPending}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 transition-all hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <>
            <div className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-700 rounded-full animate-spin" />
            Sélection...
          </>
        ) : (
          <>
            <CheckCircle size={18} weight="duotone" />
            Choisir cette proposition
          </>
        )}
      </button>
    </div>
  )
}
