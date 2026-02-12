import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import {
  extractPhoneFromWhatsApp,
  validateTwilioSignature,
} from '@/lib/whatsapp/twilio'

// ============================================================
// Supabase service client (pas de contexte utilisateur)
// ============================================================

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ============================================================
// WEBHOOK: Réception des messages WhatsApp entrants via Twilio
//
// Twilio envoie un POST form-urlencoded avec:
// - MessageSid, AccountSid
// - From (whatsapp:+336...), To (whatsapp:+336...)
// - Body (texte du message)
// - NumMedia, MediaUrl0, MediaContentType0, etc.
//
// URL à configurer dans Twilio:
// https://votre-domaine.com/api/webhooks/whatsapp/inbound
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()

    // Twilio envoie du form-urlencoded
    const formData = await request.formData()
    const payload: Record<string, string> = {}
    formData.forEach((value, key) => {
      payload[key] = value.toString()
    })

    // Extraire les données WhatsApp
    const messageSid = payload.MessageSid
    const fromPhone = extractPhoneFromWhatsApp(payload.From || '')
    const toPhone = extractPhoneFromWhatsApp(payload.To || '')
    const body = payload.Body || ''
    const numMedia = parseInt(payload.NumMedia || '0')

    if (!fromPhone || !toPhone || !messageSid) {
      console.error('WhatsApp webhook: missing required fields', { fromPhone, toPhone, messageSid })
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    console.log('WhatsApp webhook received:', {
      messageSid,
      from: fromPhone,
      to: toPhone,
      bodyLength: body.length,
      numMedia,
    })

    // ============================================================
    // 1. Trouver le tenant via le numéro WhatsApp destination
    // ============================================================

    const { data: config } = await supabase
      .from('tenant_whatsapp_config')
      .select('tenant_id, twilio_auth_token')
      .eq('whatsapp_number', toPhone)
      .eq('is_active', true)
      .single()

    if (!config) {
      console.error('WhatsApp webhook: no tenant config for number:', toPhone)
      // Retourner 200 pour éviter les retries Twilio
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // ============================================================
    // 2. Valider la signature Twilio (si présente)
    // ============================================================

    const twilioSignature = request.headers.get('x-twilio-signature')
    if (twilioSignature && config.twilio_auth_token) {
      const requestUrl = process.env.WHATSAPP_WEBHOOK_URL || request.url
      const isValid = await validateTwilioSignature(
        twilioSignature,
        requestUrl,
        payload,
        config.twilio_auth_token
      )
      if (!isValid) {
        console.error('WhatsApp webhook: invalid Twilio signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    // ============================================================
    // 3. Trouver le dossier associé via le numéro de téléphone
    // ============================================================

    const { data: dossierMatch } = await supabase
      .rpc('find_dossier_by_whatsapp', {
        p_phone: fromPhone,
        p_tenant_id: config.tenant_id,
      })

    const match = dossierMatch?.[0]

    if (!match) {
      console.log('WhatsApp webhook: no dossier match for phone:', fromPhone)
      // TODO: Créer une notification admin pour message non-matché
      // Retourner 200 pour éviter les retries
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // ============================================================
    // 4. Récupérer ou créer un thread
    // ============================================================

    const { data: threadId } = await supabase
      .rpc('get_active_thread', { p_dossier_id: match.dossier_id })

    // ============================================================
    // 5. Traiter les médias (images, PDF, audio)
    // ============================================================

    const attachments: Array<{
      filename: string
      url: string
      size: number
      mime_type: string
    }> = []
    const mediaUrls: string[] = []

    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = payload[`MediaUrl${i}`]
      const mediaType = payload[`MediaContentType${i}`]
      if (mediaUrl) {
        // Phase 1 : stocker les URLs Twilio temporaires
        // TODO Phase 2 : télécharger et uploader vers Supabase Storage
        const extension = mediaType?.split('/')[1] || 'bin'
        attachments.push({
          filename: `whatsapp_media_${i}.${extension}`,
          url: mediaUrl,
          size: 0,
          mime_type: mediaType || 'application/octet-stream',
        })
        mediaUrls.push(mediaUrl)
      }
    }

    // ============================================================
    // 6. Créer le message entrant
    // ============================================================

    const { data: message, error: messageError } = await supabase
      .from('dossier_messages')
      .insert({
        dossier_id: match.dossier_id,
        thread_id: threadId || crypto.randomUUID(),
        direction: 'inbound',
        sender_type: 'client',
        sender_id: match.participant_id,
        sender_email: fromPhone,       // Téléphone stocké dans sender_email
        sender_name: match.participant_name,
        recipient_email: toPhone,
        recipient_name: null,
        subject: null,                 // WhatsApp n'a pas de sujet
        body_text: body,
        body_html: null,
        attachments: attachments,
        channel: 'whatsapp',
        whatsapp_message_sid: messageSid,
        whatsapp_media_urls: mediaUrls,
        status: 'delivered',
        external_message_id: messageSid,
      })
      .select()
      .single()

    if (messageError) {
      console.error('WhatsApp webhook: error saving message:', messageError)
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
    }

    // ============================================================
    // 7. Notifier le conseiller
    // ============================================================

    const { data: dossier } = await supabase
      .from('dossiers')
      .select('advisor_id, title, reference')
      .eq('id', match.dossier_id)
      .single()

    if (dossier?.advisor_id) {
      // Utiliser la fonction create_notification() existante
      await supabase.rpc('create_notification', {
        p_user_id: dossier.advisor_id,
        p_type: 'new_request',
        p_title: 'Nouveau message WhatsApp',
        p_message: `${match.participant_name} a envoyé un message WhatsApp sur le dossier "${dossier.title}"`,
        p_dossier_id: match.dossier_id,
        p_dossier_reference: dossier.reference,
        p_participant_name: match.participant_name,
        p_metadata: {
          message_id: message.id,
          channel: 'whatsapp',
          from_phone: fromPhone,
        },
      })
    }

    // ============================================================
    // 8. Mettre à jour last_activity_at du dossier
    // ============================================================

    await supabase
      .from('dossiers')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', match.dossier_id)

    // ============================================================
    // 9. Mettre à jour le cache de routage
    // ============================================================

    await supabase.rpc('upsert_whatsapp_mapping', {
      p_phone: fromPhone,
      p_participant_id: match.participant_id,
      p_dossier_id: match.dossier_id,
      p_tenant_id: config.tenant_id,
    })

    console.log('WhatsApp message processed:', {
      messageId: message.id,
      dossierId: match.dossier_id,
      from: fromPhone,
      participant: match.participant_name,
    })

    // ============================================================
    // 10. Répondre en TwiML vide (Twilio attend ce format)
    // ============================================================

    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    // Retourner 200 même en erreur pour éviter les retries Twilio
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )
  }
}
