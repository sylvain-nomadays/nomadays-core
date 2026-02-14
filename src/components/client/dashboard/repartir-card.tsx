'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Airplane } from '@phosphor-icons/react'
import { StartTripDialog } from './start-trip-dialog'

interface RepartirCardProps {
  participantId: string
}

export function RepartirCard({ participantId }: RepartirCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const router = useRouter()

  const handleTripCreated = (dossierId: string) => {
    router.push(`/client/voyages/${dossierId}`)
  }

  return (
    <>
      <button onClick={() => setDialogOpen(true)} className="block group text-left w-full">
        <div className="border-2 border-dashed border-gray-300 rounded-2xl aspect-[4/3] flex flex-col items-center justify-center gap-3 text-gray-400 cursor-pointer hover:border-[#0FB6BC] hover:text-[#0FB6BC] transition-colors">
          <Airplane size={36} weight="duotone" className="group-hover:scale-110 transition-transform duration-300" />
          <span className="text-sm font-display font-semibold">Repartir en voyage</span>
        </div>
      </button>

      <StartTripDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        participantId={participantId}
        onTripCreated={handleTripCreated}
      />
    </>
  )
}
