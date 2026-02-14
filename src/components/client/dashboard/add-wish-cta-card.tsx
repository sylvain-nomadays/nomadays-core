'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HeartStraight } from '@phosphor-icons/react'
import { AddWishDialog } from './map/AddWishDialog'

interface AddWishCtaCardProps {
  participantId: string
}

export function AddWishCtaCard({ participantId }: AddWishCtaCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const router = useRouter()

  const handleWishAdded = () => {
    router.refresh()
  }

  return (
    <>
      <button onClick={() => setDialogOpen(true)} className="block group text-left w-full">
        <div className="border-2 border-dashed border-gray-300 rounded-2xl aspect-[4/3] flex flex-col items-center justify-center gap-3 text-gray-400 cursor-pointer hover:border-[#DD9371] hover:text-[#DD9371] transition-colors">
          <HeartStraight size={36} weight="duotone" className="group-hover:scale-110 transition-transform duration-300" />
          <span className="text-sm font-display font-semibold">Ajouter une envie</span>
        </div>
      </button>

      <AddWishDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        participantId={participantId}
        onWishAdded={handleWishAdded}
      />
    </>
  )
}
