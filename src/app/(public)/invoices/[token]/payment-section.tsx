'use client'

import { useState } from 'react'
import type { PublicPaymentLink, BankTransferInfo } from '@/lib/api/types'

interface PaymentSectionProps {
  paymentLinks: PublicPaymentLink[]
  bankTransferInfo: BankTransferInfo | null
  invoiceNumber: string
  currency: string
  totalTtc: number
  cgvAccepted?: boolean
}

function formatAmount(amount: number, currency: string = 'EUR'): string {
  const symbol = currency === 'EUR' ? '\u20AC' : currency
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return dateStr
  }
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  deposit: "l'acompte",
  balance: 'le solde',
  full: 'le montant total',
}

export function PaymentSection({
  paymentLinks,
  bankTransferInfo,
  invoiceNumber,
  currency,
  totalTtc,
  cgvAccepted,
}: PaymentSectionProps) {
  const [showBankDetails, setShowBankDetails] = useState(false)

  const pendingLinks = paymentLinks.filter((pl) => pl.status === 'pending')
  const paidLinks = paymentLinks.filter((pl) => pl.status === 'paid')
  const paymentBlocked = cgvAccepted === false

  // Separate actionable links (deposit/full) from informational ones (balance)
  const payableLinks = pendingLinks.filter((pl) => pl.payment_type !== 'balance')
  const balanceLinks = pendingLinks.filter((pl) => pl.payment_type === 'balance')
  // Amount for bank transfer = first payable link amount (deposit or full)
  const firstPayable = payableLinks[0]
  const transferAmount = firstPayable ? firstPayable.amount : totalTtc

  return (
    <div className="border-t border-gray-200">
      <div className="px-8 py-5 border-b border-gray-100 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Paiements
          {/* Total display */}
          <span className="ml-auto text-sm font-normal text-gray-500">
            Total : <span className="font-semibold text-gray-900">{formatAmount(totalTtc, currency)}</span>
          </span>
        </h2>
      </div>

      <div className="p-8 space-y-4">
        {/* Paid links */}
        {paidLinks.map((pl) => (
          <div
            key={pl.id}
            className="flex items-center justify-between px-5 py-4 rounded-lg bg-green-50 border border-green-200"
          >
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <span className="font-medium text-green-800">
                  Paiement de {PAYMENT_TYPE_LABELS[pl.payment_type] || pl.payment_type}
                </span>
                {pl.paid_at && (
                  <span className="text-sm text-green-600 ml-2">
                    — payé le {formatDate(pl.paid_at)}
                  </span>
                )}
              </div>
            </div>
            <span className="font-semibold text-green-800">
              {formatAmount(pl.amount, currency)}
            </span>
          </div>
        ))}

        {/* CGV blocking message */}
        {paymentBlocked && pendingLinks.length > 0 && (
          <div className="flex items-center gap-3 px-5 py-3 rounded-lg bg-amber-50 border border-amber-200">
            <svg className="h-5 w-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-amber-800">
              Veuillez accepter les conditions particulières de vente avant de procéder au paiement.
            </p>
          </div>
        )}

        {/* Payable links (deposit / full) */}
        {payableLinks.map((pl) => (
          <div
            key={pl.id}
            className={`flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-4 rounded-lg bg-gray-50 border border-gray-200 gap-4 ${paymentBlocked ? 'opacity-50' : ''}`}
          >
            <div>
              <span className="font-medium text-gray-900">
                Payer {PAYMENT_TYPE_LABELS[pl.payment_type] || pl.payment_type}
              </span>
              {pl.due_date && (
                <span className="text-sm text-gray-500 ml-2">
                  — échéance le {formatDate(pl.due_date)}
                </span>
              )}
              <div className="text-lg font-semibold text-gray-900 mt-1">
                {formatAmount(pl.amount, currency)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pl.payment_url && !paymentBlocked ? (
                <a
                  href={pl.payment_url}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition hover:opacity-90"
                  style={{ backgroundColor: '#0FB6BC' }}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Payer par carte
                </a>
              ) : (
                <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-200 text-gray-500 text-sm font-medium cursor-not-allowed">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {paymentBlocked ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                  {paymentBlocked ? 'Acceptez les CGV pour payer' : 'Paiement en ligne bientôt disponible'}
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Balance links — informational only (payable on final invoice) */}
        {balanceLinks.map((pl) => (
          <div
            key={pl.id}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-4 rounded-lg bg-gray-50 border border-gray-200 border-dashed gap-4"
          >
            <div>
              <span className="font-medium text-gray-500">
                Solde restant
              </span>
              {pl.due_date && (
                <span className="text-sm text-gray-400 ml-2">
                  — échéance le {formatDate(pl.due_date)}
                </span>
              )}
              <div className="text-lg font-semibold text-gray-500 mt-1">
                {formatAmount(pl.amount, currency)}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Le solde sera à régler sur la facture finale.
              </p>
            </div>
          </div>
        ))}

        {/* Bank transfer option — standalone section (visible even before CGV acceptance) */}
        {bankTransferInfo && pendingLinks.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowBankDetails(!showBankDetails)}
              className="w-full flex items-center justify-between px-5 py-4 rounded-lg border border-dashed border-gray-300 text-gray-700 text-sm font-medium transition hover:bg-gray-50 hover:border-gray-400"
            >
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Je préfère régler par virement bancaire
              </span>
              <svg
                className={`h-5 w-5 text-gray-400 transition-transform ${showBankDetails ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showBankDetails && (
              <div className="rounded-b-lg bg-blue-50 border border-blue-200 border-t-0 p-6 -mt-1">
                {/* Bank name header */}
                <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {bankTransferInfo.bank_name || 'Virement'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Titulaire du compte</span>
                    <p className="text-blue-900 font-semibold mt-0.5">
                      {bankTransferInfo.account_holder}
                    </p>
                  </div>
                  {bankTransferInfo.bank_address && (
                    <div>
                      <span className="text-blue-700 font-medium">Adresse de la banque</span>
                      <p className="text-blue-900 font-semibold mt-0.5">
                        {bankTransferInfo.bank_address}
                      </p>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <span className="text-blue-700 font-medium">IBAN</span>
                    <p className="text-blue-900 font-mono font-semibold mt-0.5 tracking-wider">
                      {bankTransferInfo.iban}
                    </p>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">BIC / SWIFT</span>
                    <p className="text-blue-900 font-mono font-semibold mt-0.5">
                      {bankTransferInfo.bic}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-blue-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-blue-700">
                      <span className="font-medium">Référence à indiquer :</span>{' '}
                      <span className="font-mono font-semibold text-blue-900">{invoiceNumber}</span>
                    </p>
                    <p className="text-sm text-blue-700">
                      <span className="font-medium">Montant :</span>{' '}
                      <span className="font-semibold text-blue-900">{formatAmount(transferAmount, currency)}</span>
                    </p>
                  </div>
                  <p className="text-xs text-blue-600">
                    Merci d&apos;indiquer la référence dans le libellé de votre virement afin de faciliter le rapprochement.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
