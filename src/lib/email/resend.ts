'use server'

import { Resend } from 'resend'

// Lazy init — avoid crashing at build time when RESEND_API_KEY is not set
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

// Adresse email utilisée pour envoyer (doit être vérifiée dans Resend)
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@nomadays.com'
const REPLY_TO_DOMAIN = process.env.EMAIL_REPLY_DOMAIN || 'reply.nomadays.com'

export interface SendEmailParams {
  to: string
  toName?: string
  subject: string
  html: string
  text?: string
  replyTo?: string
  threadId?: string
  messageId?: string
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Envoie un email via Resend
 * Le Reply-To est configuré pour router les réponses vers notre webhook
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    // Construire le Reply-To avec le threadId pour tracker les réponses
    // Format: thread-{threadId}@reply.nomadays.com
    const replyToAddress = params.threadId
      ? `thread-${params.threadId}@${REPLY_TO_DOMAIN}`
      : params.replyTo || FROM_EMAIL

    const { data, error } = await getResend().emails.send({
      from: `Nomadays <${FROM_EMAIL}>`,
      to: params.toName ? `${params.toName} <${params.to}>` : params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: replyToAddress,
      headers: {
        // Headers personnalisés pour le tracking
        'X-Nomadays-Thread-Id': params.threadId || '',
        'X-Nomadays-Message-Id': params.messageId || '',
      },
    })

    if (error) {
      console.error('Resend error:', error)
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      messageId: data?.id,
    }
  } catch (error) {
    console.error('Email send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
