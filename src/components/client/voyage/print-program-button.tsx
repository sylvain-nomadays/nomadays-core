'use client'

import { Printer } from '@phosphor-icons/react'

interface PrintProgramButtonProps {
  themeColor: string
}

export function PrintProgramButton({ themeColor }: PrintProgramButtonProps) {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
      title="Imprimer le programme"
    >
      <Printer size={14} weight="duotone" />
      <span className="hidden sm:inline">Imprimer</span>
    </button>
  )
}
