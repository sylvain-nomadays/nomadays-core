'use client'

import dynamic from 'next/dynamic'

export const ExplorerMapDynamic = dynamic(
  () => import('./ExplorerMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full rounded-2xl bg-gradient-to-b from-[#E3F4F5] to-[#F0F7F4] animate-pulse flex items-center justify-center">
        <div className="text-gray-400 text-sm">Chargement de la carte...</div>
      </div>
    ),
  }
)
