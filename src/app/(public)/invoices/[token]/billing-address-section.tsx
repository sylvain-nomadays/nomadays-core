'use client'

import { useState } from 'react'
import GooglePlacesAutocomplete, { type PlaceResult } from '@/components/common/GooglePlacesAutocomplete'
import type { BillingAddress, InvoicePublicData } from '@/lib/api/types'

interface BillingAddressSectionProps {
  token: string
  billingAddress: BillingAddress | null
  validated: boolean
  onUpdate: (data: InvoicePublicData) => void
}

export function BillingAddressSection({
  token,
  billingAddress,
  validated,
  onUpdate,
}: BillingAddressSectionProps) {
  const [form, setForm] = useState<BillingAddress>({
    line1: billingAddress?.line1 || '',
    line2: billingAddress?.line2 || '',
    city: billingAddress?.city || '',
    postal: billingAddress?.postal || '',
    country: billingAddress?.country || 'France',
  })
  const [saving, setSaving] = useState(false)
  const [isValidated, setIsValidated] = useState(validated)
  const [isOpen, setIsOpen] = useState(!validated) // Start closed if already validated
  const [error, setError] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')

  const handleChange = (field: keyof BillingAddress, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setIsValidated(false)
  }

  const handlePlaceSelect = (place: PlaceResult | null) => {
    if (!place?.address_components) return

    let streetNumber = ''
    let route = ''
    let postal = ''
    let city = ''
    let country = ''

    for (const comp of place.address_components) {
      if (comp.types.includes('street_number')) {
        streetNumber = comp.long_name
      } else if (comp.types.includes('route')) {
        route = comp.long_name
      } else if (comp.types.includes('postal_code')) {
        postal = comp.long_name
      } else if (comp.types.includes('locality')) {
        city = comp.long_name
      } else if (comp.types.includes('administrative_area_level_1') && !city) {
        city = comp.long_name
      } else if (comp.types.includes('country')) {
        country = comp.long_name
      }
    }

    const line1 = `${streetNumber} ${route}`.trim()
    setForm({
      line1,
      line2: '',
      city,
      postal,
      country,
    })
    setSearchValue(place.formatted_address || line1)
    setIsValidated(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.line1 || !form.city || !form.postal || !form.country) {
      setError('Veuillez remplir tous les champs obligatoires')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/public/invoices/${token}/billing-address`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Erreur lors de la sauvegarde')
      }

      const updatedData = await res.json()
      setIsValidated(true)
      setIsOpen(false) // Auto-close after validation
      onUpdate(updatedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  // Format address for display in collapsed mode
  const formatAddress = () => {
    const parts = [form.line1]
    if (form.line2) parts.push(form.line2)
    parts.push(`${form.postal} ${form.city}`.trim())
    if (form.country) parts.push(form.country)
    return parts.filter(Boolean).join(', ')
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Adresse de facturation
          {isValidated && (
            <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Validée
            </span>
          )}
        </h2>
        <div className="flex items-center gap-3">
          {/* Show address summary when collapsed and validated */}
          {!isOpen && isValidated && form.line1 && (
            <span className="text-sm text-gray-500 max-w-md truncate hidden sm:inline">
              {formatAddress()}
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
        <form onSubmit={handleSubmit} className="p-8">
          {/* Google Places autocomplete search */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rechercher votre adresse
            </label>
            <GooglePlacesAutocomplete
              value={searchValue}
              placeholder="Tapez votre adresse pour la rechercher..."
              onPlaceSelect={handlePlaceSelect}
              types={['address']}
              className="w-full"
            />
            <p className="mt-1 text-xs text-gray-400">
              Les champs ci-dessous seront remplis automatiquement. Vous pouvez les corriger si besoin.
            </p>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.line1}
                  onChange={(e) => handleChange('line1', e.target.value)}
                  placeholder="Numéro et rue"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#0FB6BC] focus:border-[#0FB6BC] outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Complément d&apos;adresse
                </label>
                <input
                  type="text"
                  value={form.line2}
                  onChange={(e) => handleChange('line2', e.target.value)}
                  placeholder="Bâtiment, étage, etc."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#0FB6BC] focus:border-[#0FB6BC] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code postal <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.postal}
                  onChange={(e) => handleChange('postal', e.target.value)}
                  placeholder="75001"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#0FB6BC] focus:border-[#0FB6BC] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ville <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Paris"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#0FB6BC] focus:border-[#0FB6BC] outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pays <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  placeholder="France"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#0FB6BC] focus:border-[#0FB6BC] outline-none"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#0FB6BC' }}
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Enregistrement...
                </>
              ) : isValidated ? (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Adresse validée
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Valider l&apos;adresse
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
