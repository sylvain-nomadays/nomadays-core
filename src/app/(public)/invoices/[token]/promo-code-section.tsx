'use client'

import { useState } from 'react'
import type { AppliedPromo, InvoicePublicData } from '@/lib/api/types'

interface PromoCodeSectionProps {
  token: string
  appliedPromo: AppliedPromo | null
  currency: string
  onUpdate: (data: InvoicePublicData) => void
}

function formatAmount(amount: number, currency: string = 'EUR'): string {
  const symbol = currency === 'EUR' ? '\u20AC' : currency
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`
}

export function PromoCodeSection({
  token,
  appliedPromo,
  currency,
  onUpdate,
}: PromoCodeSectionProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(!!appliedPromo) // Start closed, open only if promo already applied

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/public/invoices/${token}/apply-promo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Code invalide')
      }

      const updatedData = await res.json()
      setCode('')
      onUpdate(updatedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/public/invoices/${token}/remove-promo`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Erreur')
      }

      const updatedData = await res.json()
      onUpdate(updatedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border-t border-gray-200">
      {/* Header — always visible, clickable to toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-8 py-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Code promo ou bon de réduction
          {appliedPromo && (
            <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              -{formatAmount(appliedPromo.discount_amount, currency)}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-3">
          {!isOpen && !appliedPromo && (
            <span className="text-sm text-[#0FB6BC]">
              Vous avez un code ?
            </span>
          )}
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
          {appliedPromo ? (
            /* Applied promo display */
            <div className="flex items-center justify-between px-5 py-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <span className="font-medium text-green-800">
                    {appliedPromo.description}
                  </span>
                  <div className="text-sm text-green-600">
                    Réduction : -{formatAmount(appliedPromo.discount_amount, currency)}
                  </div>
                </div>
              </div>
              <button
                onClick={handleRemove}
                disabled={loading}
                className="text-sm text-red-500 hover:text-red-700 underline disabled:opacity-50"
              >
                {loading ? 'Retrait...' : 'Retirer'}
              </button>
            </div>
          ) : (
            /* Promo code input form */
            <form onSubmit={handleApply} className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase())
                    setError(null)
                  }}
                  placeholder="Entrez votre code promo"
                  className="w-full border border-gray-300 rounded-md px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0FB6BC] focus:border-[#0FB6BC] outline-none uppercase tracking-wider"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-white text-sm font-medium transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#0FB6BC' }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Vérification...
                  </>
                ) : (
                  'Appliquer'
                )}
              </button>
            </form>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
        </div>
      )}
    </div>
  )
}
