/**
 * Génère le HTML de base pour un email
 */
export function generateEmailHtml(body: string, advisorName?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      border-bottom: 2px solid #0ea5e9;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #0ea5e9;
    }
    .content {
      white-space: pre-wrap;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Nomadays</div>
  </div>
  <div class="content">
${body}
  </div>
  <div class="footer">
    <p>${advisorName ? `${advisorName} - ` : ''}Votre conseiller voyage Nomadays</p>
    <p>Cet email a été envoyé par Nomadays. Pour répondre, utilisez simplement la fonction répondre de votre messagerie.</p>
  </div>
</body>
</html>
`
}

// ============================================================
// EXTERNAL OFFER EMAIL TEMPLATE
// ============================================================

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  THB: '฿',
  VND: '₫',
  GBP: '£',
}

function formatPrice(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency
  const formatted = amount.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return `${formatted} ${symbol}`
}

interface ExternalOfferEmailParams {
  clientName: string
  offerName: string
  offerUrl: string
  priceTotal: number | null
  pricePerPerson: number | null
  currency: string
  isPdf: boolean
  advisorName: string
  dossierReference: string | null
}

/**
 * Génère le HTML pour un email d'offre externe envoyé au client.
 * Design Nomadays : turquoise (#0FB6BC) + terracotta (#DD9371).
 */
export function generateExternalOfferEmailHtml(params: ExternalOfferEmailParams): string {
  const {
    clientName,
    offerName,
    offerUrl,
    priceTotal,
    pricePerPerson,
    currency,
    isPdf,
    advisorName,
    dossierReference,
  } = params

  // Build pricing block
  let pricingHtml = ''
  if (priceTotal || pricePerPerson) {
    const totalLine = priceTotal
      ? `<div style="font-size: 28px; font-weight: bold; color: #DD9371;">${formatPrice(priceTotal, currency)}</div>`
      : ''
    const perPersonLine = pricePerPerson
      ? `<div style="font-size: 14px; color: #666; margin-top: 4px;">soit ${formatPrice(pricePerPerson, currency)} / personne</div>`
      : ''

    pricingHtml = `
      <div style="background-color: #FDF5F2; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; border: 1px solid #FBEBE5;">
        ${totalLine}
        ${perPersonLine}
      </div>
    `
  }

  const ctaLabel = isPdf ? 'Voir le PDF' : 'Voir l\'offre'
  const refLine = dossierReference ? `<p style="font-size: 12px; color: #A3A3A3; margin-top: 4px;">Réf. ${dossierReference}</p>` : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #F5F5F5;">
  <!-- Container -->
  <div style="background-color: #FFFFFF; border-radius: 8px; overflow: hidden; margin: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0FB6BC 0%, #0C9296 100%); padding: 32px 24px; text-align: center;">
      <div style="font-size: 28px; font-weight: bold; color: #FFFFFF; letter-spacing: 1px;">nomadays</div>
      <div style="font-size: 13px; color: rgba(255,255,255,0.8); margin-top: 4px;">Vos agences locales s'unissent et inventent</div>
    </div>

    <!-- Body -->
    <div style="padding: 32px 24px;">
      <p style="font-size: 16px; color: #333; margin: 0 0 16px;">Bonjour <strong>${clientName}</strong>,</p>

      <p style="font-size: 15px; color: #525252; margin: 0 0 24px;">
        ${advisorName} vous propose une nouvelle offre de voyage :
      </p>

      <!-- Offer name -->
      <div style="background-color: #F5F5F5; border-radius: 8px; padding: 16px 20px; margin-bottom: 8px;">
        <div style="font-size: 18px; font-weight: 600; color: #171717;">${offerName}</div>
        ${refLine}
      </div>

      <!-- Pricing -->
      ${pricingHtml}

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${offerUrl}" target="_blank" rel="noopener noreferrer"
           style="display: inline-block; background-color: #0FB6BC; color: #FFFFFF; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px;">
          ${ctaLabel}
        </a>
      </div>

      <p style="font-size: 14px; color: #737373; text-align: center; margin: 0;">
        N'hésitez pas à répondre à cet email pour toute question.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #FAFAFA; padding: 20px 24px; border-top: 1px solid #E5E5E5;">
      <p style="font-size: 13px; color: #525252; margin: 0 0 4px;">
        <strong>${advisorName}</strong>
      </p>
      <p style="font-size: 12px; color: #A3A3A3; margin: 0;">
        Votre conseiller voyage Nomadays
      </p>
    </div>
  </div>

  <!-- Sub-footer -->
  <div style="text-align: center; padding: 12px 20px;">
    <p style="font-size: 11px; color: #A3A3A3; margin: 0;">
      Cet email a été envoyé par Nomadays. Pour répondre, utilisez simplement la fonction répondre de votre messagerie.
    </p>
  </div>
</body>
</html>
`
}

// ============================================================
// INVOICE EMAIL TEMPLATE
// ============================================================

const INVOICE_TYPE_LABELS_EMAIL: Record<string, string> = {
  DEV: 'Devis',
  PRO: 'Facture proforma',
  FA: 'Facture',
  AV: 'Avoir',
}

const INVOICE_TYPE_COLORS: Record<string, string> = {
  DEV: '#8BA080', // sage
  PRO: '#0FB6BC', // turquoise
  FA: '#DD9371',  // terracotta
  AV: '#DC2626',  // red
}

interface InvoiceEmailParams {
  clientName: string
  invoiceType: 'DEV' | 'PRO' | 'FA' | 'AV'
  invoiceNumber: string
  totalTtc: number
  currency: string
  issueDate: string
  dueDate: string | null
  travelDates: string | null
  pdfUrl: string | null
  advisorName: string
  dossierReference: string | null
  depositAmount: number | null
  balanceAmount: number | null
  depositDueDate: string | null
  balanceDueDate: string | null
  clientNotes: string | null
  tenantName: string
}

/**
 * Génère le HTML pour un email de facture/devis envoyé au client.
 * Design Nomadays : turquoise (#0FB6BC) + terracotta (#DD9371).
 */
export function generateInvoiceEmailHtml(params: InvoiceEmailParams): string {
  const {
    clientName,
    invoiceType,
    invoiceNumber,
    totalTtc,
    currency,
    issueDate,
    dueDate,
    travelDates,
    pdfUrl,
    advisorName,
    dossierReference,
    depositAmount,
    balanceAmount,
    depositDueDate,
    balanceDueDate,
    clientNotes,
    tenantName,
  } = params

  const typeLabel = INVOICE_TYPE_LABELS_EMAIL[invoiceType] || 'Document'
  const typeColor = INVOICE_TYPE_COLORS[invoiceType] || '#0FB6BC'

  // Header subtitle based on type
  const headerSubtitle = invoiceType === 'AV'
    ? 'Un avoir a été émis sur votre dossier'
    : invoiceType === 'DEV'
      ? 'Votre devis de voyage'
      : invoiceType === 'PRO'
        ? 'Votre facture proforma'
        : 'Votre facture de voyage'

  // Build payment schedule if applicable (PRO or FA)
  let paymentScheduleHtml = ''
  if ((invoiceType === 'PRO' || invoiceType === 'FA') && depositAmount && balanceAmount) {
    paymentScheduleHtml = `
      <div style="margin: 24px 0;">
        <div style="font-size: 14px; font-weight: 600; color: #171717; margin-bottom: 12px;">Échéancier de paiement</div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 12px; border: 1px solid #E5E5E5; background-color: #FAFAFA; font-size: 13px; color: #525252;">Acompte (30%)</td>
            <td style="padding: 10px 12px; border: 1px solid #E5E5E5; font-size: 13px; font-weight: 600; text-align: right;">${formatPrice(depositAmount, currency)}</td>
            <td style="padding: 10px 12px; border: 1px solid #E5E5E5; font-size: 13px; color: #737373; text-align: right;">${depositDueDate || '-'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; border: 1px solid #E5E5E5; background-color: #FAFAFA; font-size: 13px; color: #525252;">Solde (70%)</td>
            <td style="padding: 10px 12px; border: 1px solid #E5E5E5; font-size: 13px; font-weight: 600; text-align: right;">${formatPrice(balanceAmount, currency)}</td>
            <td style="padding: 10px 12px; border: 1px solid #E5E5E5; font-size: 13px; color: #737373; text-align: right;">${balanceDueDate || '-'}</td>
          </tr>
        </table>
      </div>
    `
  }

  // Client notes
  const clientNotesHtml = clientNotes
    ? `<div style="background-color: #F5F5F5; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 14px; color: #525252; border-left: 3px solid #0FB6BC;">${clientNotes}</div>`
    : ''

  // Due date line
  const dueDateLine = dueDate
    ? `<tr><td style="padding: 6px 0; font-size: 13px; color: #737373;">Échéance</td><td style="padding: 6px 0; font-size: 13px; font-weight: 500; text-align: right;">${dueDate}</td></tr>`
    : ''

  // Travel dates line
  const travelDatesLine = travelDates
    ? `<tr><td style="padding: 6px 0; font-size: 13px; color: #737373;">Dates de voyage</td><td style="padding: 6px 0; font-size: 13px; font-weight: 500; text-align: right;">${travelDates}</td></tr>`
    : ''

  // Ref line
  const refLine = dossierReference
    ? `<tr><td style="padding: 6px 0; font-size: 13px; color: #737373;">Réf. dossier</td><td style="padding: 6px 0; font-size: 13px; font-weight: 500; text-align: right;">${dossierReference}</td></tr>`
    : ''

  // CTA button
  const ctaHtml = pdfUrl
    ? `
      <div style="text-align: center; margin: 32px 0;">
        <a href="${pdfUrl}" target="_blank" rel="noopener noreferrer"
           style="display: inline-block; background-color: #0FB6BC; color: #FFFFFF; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px;">
          Télécharger le ${typeLabel.toLowerCase()}
        </a>
      </div>
    `
    : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #F5F5F5;">
  <!-- Container -->
  <div style="background-color: #FFFFFF; border-radius: 8px; overflow: hidden; margin: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0FB6BC 0%, #0C9296 100%); padding: 32px 24px; text-align: center;">
      <div style="font-size: 28px; font-weight: bold; color: #FFFFFF; letter-spacing: 1px;">nomadays</div>
      <div style="font-size: 13px; color: rgba(255,255,255,0.8); margin-top: 4px;">${headerSubtitle}</div>
    </div>

    <!-- Body -->
    <div style="padding: 32px 24px;">
      <p style="font-size: 16px; color: #333; margin: 0 0 16px;">Bonjour <strong>${clientName}</strong>,</p>

      <p style="font-size: 15px; color: #525252; margin: 0 0 24px;">
        ${invoiceType === 'AV'
          ? `Veuillez trouver ci-joint l'avoir <strong>${invoiceNumber}</strong> relatif à votre dossier.`
          : `Veuillez trouver ci-joint ${invoiceType === 'DEV' ? 'le devis' : invoiceType === 'PRO' ? 'la facture proforma' : 'la facture'} <strong>${invoiceNumber}</strong> pour votre voyage.`
        }
      </p>

      <!-- Type Badge + Amount -->
      <div style="background-color: #FDF5F2; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; border: 1px solid #FBEBE5;">
        <div style="display: inline-block; background-color: ${typeColor}; color: #FFFFFF; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 12px;">${typeLabel}</div>
        <div style="font-size: 32px; font-weight: bold; color: #DD9371;">${formatPrice(totalTtc, currency)}</div>
        <div style="font-size: 12px; color: #A3A3A3; margin-top: 4px;">TTC</div>
      </div>

      <!-- Details table -->
      <div style="margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #737373;">Numéro</td>
            <td style="padding: 6px 0; font-size: 13px; font-weight: 600; text-align: right;">${invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #737373;">Date d'émission</td>
            <td style="padding: 6px 0; font-size: 13px; font-weight: 500; text-align: right;">${issueDate}</td>
          </tr>
          ${dueDateLine}
          ${travelDatesLine}
          ${refLine}
        </table>
      </div>

      <!-- Payment schedule -->
      ${paymentScheduleHtml}

      <!-- Client notes -->
      ${clientNotesHtml}

      <!-- CTA Button -->
      ${ctaHtml}

      <p style="font-size: 14px; color: #737373; text-align: center; margin: 0;">
        N'hésitez pas à répondre à cet email pour toute question.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #FAFAFA; padding: 20px 24px; border-top: 1px solid #E5E5E5;">
      <p style="font-size: 13px; color: #525252; margin: 0 0 4px;">
        <strong>${advisorName}</strong>
      </p>
      <p style="font-size: 12px; color: #A3A3A3; margin: 0;">
        Votre conseiller voyage — ${tenantName}
      </p>
    </div>
  </div>

  <!-- Sub-footer -->
  <div style="text-align: center; padding: 12px 20px;">
    <p style="font-size: 11px; color: #A3A3A3; margin: 0;">
      Cet email a été envoyé par ${tenantName} via Nomadays. Pour répondre, utilisez simplement la fonction répondre de votre messagerie.
    </p>
  </div>
</body>
</html>
`
}
