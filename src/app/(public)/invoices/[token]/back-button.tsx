'use client'

import { X } from 'lucide-react'

export function BackButton() {
  return (
    <button
      onClick={() => {
        if (window.history.length > 1) {
          window.history.back()
        } else {
          window.location.href = '/client'
        }
      }}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
    >
      <X className="h-4 w-4" />
      Fermer
    </button>
  )
}
