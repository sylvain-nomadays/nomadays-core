import type { Metadata } from 'next'
import type { InvoicePublicData } from '@/lib/api/types'
import { InvoiceClientWrapper } from './invoice-client-wrapper'

// Prevent search engines from indexing invoices
export const metadata: Metadata = {
  title: 'Document - Nomadays',
  robots: 'noindex, nofollow',
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

async function fetchInvoice(token: string): Promise<InvoicePublicData | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/public/invoices/${token}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const data = await fetchInvoice(token)

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Document introuvable</h1>
          <p className="text-gray-500">
            Ce lien n&apos;est plus valide ou le document a été supprimé.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-12">
      {/* Top bar */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-wide" style={{ color: '#4A4A4A' }}>
              {data.company_name}
            </span>
            <span className="text-sm text-gray-400">
              {data.type_label} {data.number}
            </span>
          </div>
          <a
            href={`/api/public/invoices/${token}/pdf`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white text-sm font-medium transition hover:opacity-90"
            style={{ backgroundColor: '#0FB6BC' }}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3"
              />
            </svg>
            Télécharger PDF
          </a>
        </div>
      </div>

      {/* Invoice card — unified white card with all sections */}
      <div className="max-w-5xl mx-auto mt-10 mb-12 px-4 sm:px-6 lg:px-8">
        <InvoiceClientWrapper initialData={data} token={token} />
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-xs text-gray-400">
        Document généré par{' '}
        <span style={{ color: '#0FB6BC' }}>Nomadays</span>
      </div>
    </div>
  )
}
