'use client'

import { useState, useRef, useCallback } from 'react'
import type { InvoicePublicData } from '@/lib/api/types'

interface CgvSectionProps {
  token: string
  cgvAccepted: boolean
  cgvHtml: string | null
  onUpdate: (data: InvoicePublicData) => void
}

const CGV_TEXT = `
Article 1 — Objet et champ d'application

Les présentes conditions particulières de vente régissent les relations entre le voyageur (ci-après « le Client ») et l'agence locale (ci-après « l'Organisateur ») pour la prestation de services de voyage sur mesure. Elles complètent les conditions générales de vente disponibles sur le site de l'Organisateur.

En validant sa réservation et en procédant au paiement de l'acompte, le Client reconnaît avoir pris connaissance des présentes conditions et les accepter sans réserve.

Article 2 — Réservation et paiement

La réservation devient ferme et définitive après :
• La signature électronique ou l'acceptation en ligne des présentes conditions ;
• Le versement de l'acompte, dont le montant est précisé sur le devis ou la facture proforma.

Le solde du voyage doit être réglé au plus tard 30 jours avant la date de départ, sauf accord particulier mentionné sur la facture. À défaut de paiement du solde dans les délais, l'Organisateur se réserve le droit d'annuler la réservation et de retenir l'acompte versé.

Article 3 — Prix et révision

Les prix indiqués dans le devis sont établis sur la base des taux de change, tarifs de transport et taxes en vigueur à la date d'émission. Conformément aux articles L.211-12 et L.211-13 du Code du tourisme, les prix peuvent être révisés à la hausse ou à la baisse en fonction de l'évolution des frais de transport (carburant), des redevances et taxes, et des taux de change applicables au voyage.

Toute révision supérieure à 8% du prix total donne droit au Client de résilier le contrat sans pénalité.

Article 4 — Annulation par le Client

En cas d'annulation par le Client, les frais suivants s'appliquent :
• Plus de 60 jours avant le départ : 10% du prix total (acompte retenu)
• Entre 60 et 30 jours avant le départ : 50% du prix total
• Moins de 30 jours avant le départ : 100% du prix total

Il est vivement recommandé au Client de souscrire une assurance annulation couvrant ces frais. L'Organisateur ne pourra en aucun cas être tenu responsable des conséquences financières d'une annulation non couverte par une assurance.

Article 5 — Modification et annulation par l'Organisateur

L'Organisateur se réserve le droit de modifier un élément du voyage en cas de force majeure ou de circonstances exceptionnelles (catastrophe naturelle, instabilité politique, pandémie, etc.). Dans ce cas, le Client sera informé dans les meilleurs délais et se verra proposer une prestation de remplacement de qualité équivalente, ou le remboursement intégral des sommes versées.

Si l'Organisateur annule le voyage avant le départ pour des raisons autres que la faute du Client, celui-ci a droit au remboursement intégral des sommes versées, sans préjudice d'éventuels dommages et intérêts.

Article 6 — Assurance voyage

L'Organisateur propose au Client de souscrire une assurance voyage (assistance, annulation, multirisques) via son partenaire Chapka. Le Client a la possibilité de souscrire cette assurance ou de la décliner expressément.

En cas de refus de l'assurance, le Client reconnaît assumer l'entière responsabilité financière en cas d'annulation, d'interruption de voyage, de perte de bagages, de frais médicaux ou de rapatriement.

Article 7 — Responsabilité

L'Organisateur est responsable de la bonne exécution des services prévus au contrat, conformément à l'article L.211-16 du Code du tourisme. Toutefois, sa responsabilité est limitée ou exclue dans les cas suivants :
• Faute du Client ;
• Faute d'un tiers étranger à la fourniture des services ;
• Force majeure ou circonstances exceptionnelles et inévitables.

L'Organisateur n'est pas responsable des services non inclus dans le forfait (activités réservées sur place, transports indépendants, etc.).

Article 8 — Réclamation et médiation

Toute réclamation doit être adressée à l'Organisateur par écrit dans un délai de 30 jours après la fin du voyage. En cas de litige non résolu à l'amiable, le Client peut saisir le Médiateur du Tourisme et du Voyage (MTV) : www.mtv.travel.

Article 9 — Protection des données personnelles

Les données personnelles collectées dans le cadre de la réservation sont traitées conformément au RGPD. Elles sont nécessaires à l'exécution du contrat et sont conservées pour la durée légale. Le Client dispose d'un droit d'accès, de rectification et de suppression de ses données en contactant l'Organisateur.
`.trim()

export function CgvSection({ token, cgvAccepted, cgvHtml, onUpdate }: CgvSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    // Check if scrolled to bottom (with 20px tolerance)
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20
    if (isAtBottom) {
      setHasScrolledToBottom(true)
    }
  }, [])

  const handleAccept = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/public/invoices/${token}/accept-cgv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Erreur')
      }

      const updatedData = await res.json()
      setIsDialogOpen(false)
      onUpdate(updatedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  if (cgvAccepted) {
    return (
      <div className="border-t border-gray-200">
        <div className="px-8 py-5 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Conditions particulières de vente
            <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Acceptées
            </span>
          </h2>
        </div>
      </div>
    )
  }

  return (
    <div className="border-t border-gray-200">
      <div className="px-8 py-5 border-b border-gray-100 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Conditions particulières de vente
        </h2>
      </div>

      <div className="p-8">
        <button
          type="button"
          onClick={() => {
            setIsDialogOpen(true)
            setHasScrolledToBottom(false)
          }}
          className="flex items-center gap-3 group w-full text-left"
        >
          {/* Checkbox visual */}
          <div className="flex-shrink-0 w-5 h-5 rounded border-2 border-gray-300 group-hover:border-[#0FB6BC] transition-colors flex items-center justify-center">
            {/* Empty checkbox */}
          </div>
          <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
            J&apos;accepte les{' '}
            <span className="underline text-[#0FB6BC] font-medium">
              conditions particulières de vente
            </span>{' '}
            <span className="text-gray-400">(cliquer pour lire et accepter)</span>
          </span>
        </button>

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}
      </div>

      {/* CGV Dialog / Modal */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsDialogOpen(false)}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">
                Conditions Particulières de Vente
              </h3>
              <button
                onClick={() => setIsDialogOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable content */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-6 py-4"
              style={{ maxHeight: '60vh' }}
            >
              {cgvHtml ? (
                <div
                  className="prose prose-sm max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: cgvHtml }}
                />
              ) : (
                <div className="prose prose-sm max-w-none text-gray-700">
                  {CGV_TEXT.split('\n\n').map((paragraph, idx) => {
                    // Article titles
                    if (paragraph.startsWith('Article ')) {
                      const firstNewline = paragraph.indexOf('\n')
                      if (firstNewline > -1) {
                        return (
                          <div key={idx} className="mt-6 first:mt-0">
                            <h4 className="text-base font-semibold text-gray-900 mb-2">
                              {paragraph.substring(0, firstNewline)}
                            </h4>
                            <p className="text-sm leading-relaxed whitespace-pre-line">
                              {paragraph.substring(firstNewline + 1).trim()}
                            </p>
                          </div>
                        )
                      }
                      return (
                        <h4 key={idx} className="text-base font-semibold text-gray-900 mt-6 first:mt-0">
                          {paragraph}
                        </h4>
                      )
                    }
                    return (
                      <p key={idx} className="text-sm leading-relaxed whitespace-pre-line mt-3">
                        {paragraph}
                      </p>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer with scroll indicator + accept button */}
            <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
              {!hasScrolledToBottom && (
                <p className="text-xs text-gray-400 italic mb-3 flex items-center gap-1.5">
                  <svg className="h-4 w-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  Veuillez lire l&apos;intégralité des conditions en défilant jusqu&apos;en bas
                </p>
              )}
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsDialogOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Fermer
                </button>
                <button
                  onClick={handleAccept}
                  disabled={!hasScrolledToBottom || loading}
                  className="px-6 py-2.5 rounded-lg text-white text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: hasScrolledToBottom ? '#0FB6BC' : '#9CA3AF' }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Acceptation...
                    </span>
                  ) : (
                    "J'accepte les conditions"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
