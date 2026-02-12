import { createClient } from '@supabase/supabase-js'

// ============================================================
// TYPES
// ============================================================

export interface SendWhatsAppParams {
  to: string              // Format E.164 : +33612345678
  from: string            // Numéro WhatsApp Business (E.164)
  body: string            // Texte du message
  mediaUrls?: string[]    // URLs médias (images, PDF)
  tenantId: string
}

export interface SendWhatsAppResult {
  success: boolean
  messageSid?: string     // Twilio Message SID
  error?: string
}

export interface WhatsAppConfig {
  id: string
  tenant_id: string
  twilio_account_sid: string
  twilio_auth_token: string
  whatsapp_number: string
  whatsapp_number_display: string | null
  is_active: boolean
  default_greeting_template: string | null
  business_hours: Record<string, unknown>
}

// ============================================================
// SUPABASE SERVICE CLIENT (contexte webhook / server action)
// ============================================================

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ============================================================
// CONFIGURATION
// ============================================================

/**
 * Récupère la configuration WhatsApp Twilio d'un tenant
 */
export async function getTenantWhatsAppConfig(tenantId: string): Promise<WhatsAppConfig | null> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('tenant_whatsapp_config')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .single()

  if (error || !data) return null
  return data as WhatsAppConfig
}

/**
 * Récupère la configuration par numéro WhatsApp (pour les webhooks entrants)
 */
export async function getConfigByWhatsAppNumber(whatsappNumber: string): Promise<WhatsAppConfig | null> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('tenant_whatsapp_config')
    .select('*')
    .eq('whatsapp_number', whatsappNumber)
    .eq('is_active', true)
    .single()

  if (error || !data) return null
  return data as WhatsAppConfig
}

// ============================================================
// UTILITAIRES
// ============================================================

/**
 * Normalise un numéro de téléphone au format E.164
 * Ex: "06 12 34 56 78" → "+33612345678"
 *     "+33 6 12 34 56 78" → "+33612345678"
 */
export function normalizePhone(phone: string): string {
  let normalized = phone.replace(/[^\d+]/g, '')
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized
  }
  return normalized
}

/**
 * Extrait le numéro de téléphone du format Twilio WhatsApp
 * Ex: "whatsapp:+33612345678" → "+33612345678"
 */
export function extractPhoneFromWhatsApp(twilioFormat: string): string {
  return twilioFormat.replace('whatsapp:', '')
}

// ============================================================
// ENVOI DE MESSAGE WHATSAPP
// ============================================================

/**
 * Envoie un message WhatsApp via Twilio
 * Les credentials sont récupérées par tenant depuis la base de données
 */
export async function sendWhatsApp(params: SendWhatsAppParams): Promise<SendWhatsAppResult> {
  try {
    // Récupérer les credentials Twilio du tenant
    const config = await getTenantWhatsAppConfig(params.tenantId)
    if (!config) {
      return { success: false, error: 'WhatsApp non configuré pour ce tenant' }
    }

    // Import dynamique de Twilio (évite le chargement quand pas utilisé)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const twilio = require('twilio')
    const client = twilio(config.twilio_account_sid, config.twilio_auth_token)

    // Construire les paramètres du message
    const messageParams: Record<string, unknown> = {
      from: `whatsapp:${params.from}`,
      to: `whatsapp:${params.to}`,
      body: params.body,
    }

    // Ajouter les médias si présents
    if (params.mediaUrls && params.mediaUrls.length > 0) {
      messageParams.mediaUrl = params.mediaUrls
    }

    const message = await client.messages.create(messageParams)

    return {
      success: true,
      messageSid: message.sid,
    }
  } catch (error) {
    console.error('WhatsApp send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================
// VALIDATION DE SIGNATURE TWILIO
// ============================================================

/**
 * Valide la signature d'un webhook Twilio
 * Protège contre les requêtes falsifiées
 */
export async function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>,
  authToken: string
): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const twilio = require('twilio')
    return twilio.validateRequest(authToken, signature, url, params)
  } catch (error) {
    console.error('Twilio signature validation error:', error)
    return false
  }
}
