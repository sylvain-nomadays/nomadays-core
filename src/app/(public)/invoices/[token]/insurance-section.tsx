'use client'

import { useState } from 'react'
import type { InsuranceOption, SelectedInsurance, InvoicePublicData } from '@/lib/api/types'

interface InsuranceSectionProps {
  token: string
  options: InsuranceOption[]
  selected: SelectedInsurance | null
  paxCount: number
  currency: string
  onUpdate: (data: InvoicePublicData) => void
}

function formatAmount(amount: number, currency: string = 'EUR'): string {
  const symbol = currency === 'EUR' ? '\u20AC' : currency
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`
}

export function InsuranceSection({
  token,
  options,
  selected,
  paxCount,
  currency,
  onUpdate,
}: InsuranceSectionProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(!selected) // Start closed if already selected

  const isDeclined = selected?.type === 'declined'

  const handleSelect = async (insuranceType: string) => {
    setLoading(insuranceType)
    setError(null)

    try {
      const res = await fetch(`/api/public/invoices/${token}/select-insurance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insurance_type: insuranceType }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Erreur')
      }

      const updatedData = await res.json()
      setIsOpen(false) // Auto-close after selection
      onUpdate(updatedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(null)
    }
  }

  const handleRemove = async () => {
    setLoading('removing')
    setError(null)

    try {
      const res = await fetch(`/api/public/invoices/${token}/remove-insurance`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Erreur')
      }

      const updatedData = await res.json()
      setIsOpen(true) // Re-open so user can select a new one
      onUpdate(updatedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(null)
    }
  }

  const insuranceIcons: Record<string, string> = {
    assistance: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
    annulation: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    multirisques: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  }

  return (
    <div className="border-t border-gray-200">
      {/* Header — always visible, clickable to toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-8 py-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="text-left">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Assurance voyage
            {selected && !isDeclined && (
              <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Sélectionnée
              </span>
            )}
            {isDeclined && (
              <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Déclinée
              </span>
            )}
          </h2>
          {!isOpen && selected && !isDeclined && (
            <p className="text-sm text-gray-500 mt-1 ml-7">
              {selected.label} — {formatAmount(selected.total, currency)}
            </p>
          )}
          {!isOpen && isDeclined && (
            <p className="text-sm text-gray-500 mt-1 ml-7">
              Assurance déclinée par le client
            </p>
          )}
          {!isOpen && !selected && (
            <p className="text-sm text-gray-500 mt-1 ml-7">
              Protégez votre voyage avec une assurance Chapka Explorer
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <svg
            className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Collapsible content */}
      {isOpen && (
        <div className="p-8">
          {selected ? (
            /* Currently selected insurance (or declined) */
            <div className={`rounded-lg border-2 p-5 ${
              isDeclined
                ? 'border-orange-300 bg-orange-50'
                : 'border-[#0FB6BC] bg-[#E6F9FA]'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isDeclined ? 'bg-orange-400' : 'bg-[#0FB6BC]'
                  }`}>
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {isDeclined ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      )}
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{selected.label}</div>
                    {!isDeclined && (
                      <div className="text-sm text-gray-500">
                        {paxCount} voyageur{paxCount > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {!isDeclined && (
                    <div className="text-lg font-bold" style={{ color: '#0FB6BC' }}>
                      {formatAmount(selected.total, currency)}
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove() }}
                    disabled={loading === 'removing'}
                    className="text-sm text-red-500 hover:text-red-700 mt-1 underline"
                  >
                    {loading === 'removing' ? 'Retrait...' : 'Modifier mon choix'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Insurance options cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {options.filter(o => o.available).map((option) => {
                  const total = option.price_per_pax * paxCount
                  const isLoading = loading === option.type

                  return (
                    <button
                      key={option.type}
                      onClick={() => handleSelect(option.type)}
                      disabled={!!loading}
                      className="text-left rounded-lg border border-gray-200 p-5 hover:border-[#0FB6BC] hover:shadow-md transition-all disabled:opacity-50 group"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-[#E6F9FA] flex items-center justify-center transition-colors">
                          <svg className="h-5 w-5 text-gray-400 group-hover:text-[#0FB6BC] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={insuranceIcons[option.type] || insuranceIcons.multirisques} />
                          </svg>
                        </div>
                        <div className="font-semibold text-gray-900 text-sm">{option.label}</div>
                      </div>
                      <div className="text-sm text-gray-500 mb-2">
                        {formatAmount(option.price_per_pax, currency)} / personne
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        {formatAmount(total, currency)}
                        <span className="text-xs font-normal text-gray-400 ml-1">
                          ({paxCount} pax)
                        </span>
                      </div>
                      {isLoading && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-[#0FB6BC]">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Sélection...
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Decline insurance option */}
              <div className="mt-6 border-t border-gray-100 pt-5">
                <button
                  onClick={() => handleSelect('declined')}
                  disabled={!!loading}
                  className="w-full text-left rounded-lg border border-gray-300 border-dashed p-4 hover:border-orange-400 hover:bg-orange-50 transition-all disabled:opacity-50 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-orange-100 flex items-center justify-center transition-colors">
                      <svg className="h-4 w-4 text-gray-400 group-hover:text-orange-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <span className="font-medium text-gray-600 group-hover:text-orange-700 text-sm">
                      Décliner l&apos;assurance
                    </span>
                    {loading === 'declined' && (
                      <svg className="animate-spin h-4 w-4 text-orange-500" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                  </div>
                </button>
                <p className="mt-2 text-xs text-gray-400 italic px-1">
                  J&apos;ai reconnu que Nomadays m&apos;avait proposé une assurance et j&apos;ai décliné l&apos;option.
                  J&apos;assume l&apos;entière responsabilité en cas d&apos;annulation ou d&apos;accident lors de mon voyage.
                </p>
              </div>
            </>
          )}

          {!selected && (
            <p className="mt-4 text-xs text-gray-400 italic">
              Tarifs indicatifs — le devis Chapka définitif sera confirmé par votre conseiller voyage.
            </p>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
        </div>
      )}
    </div>
  )
}
