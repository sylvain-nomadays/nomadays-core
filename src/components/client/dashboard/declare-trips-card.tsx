'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapTrifold } from '@phosphor-icons/react'
import { PastTripDialog } from './past-trip-dialog'

interface DeclareTripsCardProps {
  participantId: string
}

export function DeclareTripsCard({ participantId }: DeclareTripsCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const router = useRouter()

  const handleTripAdded = () => {
    router.refresh()
  }

  return (
    <>
      <button onClick={() => setDialogOpen(true)} className="block group text-left w-full">
        <div className="border-2 border-dashed border-gray-300 rounded-2xl aspect-[4/3] flex flex-col items-center justify-center gap-3 text-gray-400 cursor-pointer hover:border-[#8BA080] hover:text-[#8BA080] transition-colors">
          <MapTrifold size={36} weight="duotone" className="group-hover:scale-110 transition-transform duration-300" />
          <span className="text-sm font-display font-semibold text-center px-4">
            J&apos;ai deja voyage ici
          </span>
        </div>
      </button>

      <PastTripDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        participantId={participantId}
        onTripAdded={handleTripAdded}
      />
    </>
  )
}
