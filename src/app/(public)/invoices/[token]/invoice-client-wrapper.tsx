'use client'

import { useState } from 'react'
import type { InvoicePublicData } from '@/lib/api/types'
import { InvoiceIframe } from './invoice-iframe'
import { BillingAddressSection } from './billing-address-section'
import { InsuranceSection } from './insurance-section'
import { PromoCodeSection } from './promo-code-section'
import { CgvSection } from './cgv-section'
import { PaymentSection } from './payment-section'

interface InvoiceClientWrapperProps {
  initialData: InvoicePublicData
  token: string
}

/**
 * Client-side wrapper that holds the invoice state.
 * All interactive sections (billing, insurance, promo, payment)
 * mutate via API calls and update the shared state.
 */
export function InvoiceClientWrapper({ initialData, token }: InvoiceClientWrapperProps) {
  const [data, setData] = useState<InvoicePublicData>(initialData)

  const handleUpdate = (newData: InvoicePublicData) => {
    setData(newData)
  }

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      {/* Invoice HTML in isolated iframe */}
      <InvoiceIframe html={data.html} />

      {/* Pre-invoice validation sections (only for proforma) */}
      {data.is_proforma && (
        <>
          {/* Billing address */}
          <BillingAddressSection
            token={token}
            billingAddress={data.billing_address}
            validated={data.billing_address_validated}
            onUpdate={handleUpdate}
          />

          {/* Insurance selection */}
          <InsuranceSection
            token={token}
            options={data.insurance_options}
            selected={data.selected_insurance}
            paxCount={data.pax_count}
            currency={data.currency}
            onUpdate={handleUpdate}
          />

          {/* Promo code */}
          <PromoCodeSection
            token={token}
            appliedPromo={data.applied_promo}
            currency={data.currency}
            onUpdate={handleUpdate}
          />

          {/* CGV acceptance (required before payment) */}
          <CgvSection
            token={token}
            cgvAccepted={data.cgv_accepted}
            cgvHtml={data.cgv_html}
            onUpdate={handleUpdate}
          />
        </>
      )}

      {/* Payment section (always visible if there are payment links) */}
      {data.payment_links && data.payment_links.length > 0 && (
        <PaymentSection
          paymentLinks={data.payment_links}
          bankTransferInfo={data.bank_transfer_info}
          invoiceNumber={data.number}
          currency={data.currency}
          totalTtc={data.total_ttc}
          cgvAccepted={data.cgv_accepted}
        />
      )}
    </div>
  )
}
