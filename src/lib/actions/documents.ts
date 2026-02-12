'use server'

import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

// Read client (uses user session, subject to RLS)
async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component
          }
        },
      },
    }
  )
}

// Write client (service_role key, bypasses RLS — needed for storage uploads)
function createWriteClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceKey) {
    return createSupabaseClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — cannot create write client')
}

// ============================================================
// DOCUMENT TYPES
// ============================================================

export interface DossierDocument {
  id: string
  dossier_id: string | null
  type: string // 'proposal_pdf' | 'other'
  name: string
  file_url: string
  file_size: number | null
  mime_type: string | null
  is_client_visible: boolean
  uploaded_by: string | null
  created_at: string
  price_total: number | null
  price_per_person: number | null
  currency: string
  published_at: string | null
  published_by: string | null
}

// ============================================================
// UPLOAD PDF DOCUMENT
// ============================================================

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const ALLOWED_MIME_TYPES = ['application/pdf']
const STORAGE_BUCKET = 'documents'

export async function uploadDossierDocument(
  dossierId: string,
  formData: FormData
): Promise<DossierDocument> {
  const supabase = await createClient()
  const writeClient = createWriteClient()

  // Get file from formData
  const file = formData.get('file') as File | null
  const name = (formData.get('name') as string) || ''
  const rawPriceTotal = formData.get('price_total') as string | null
  const rawPricePerPerson = formData.get('price_per_person') as string | null
  const currency = (formData.get('currency') as string) || 'EUR'
  const priceTotal = rawPriceTotal ? parseFloat(rawPriceTotal) : null
  const pricePerPerson = rawPricePerPerson ? parseFloat(rawPricePerPerson) : null

  if (!file) {
    throw new Error('Aucun fichier fourni')
  }

  // Validate file
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Seuls les fichiers PDF sont acceptés')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Le fichier ne doit pas dépasser 20 MB')
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // Generate unique filename (no "documents/" prefix — bucket name is already "documents")
  const fileId = crypto.randomUUID()
  const storagePath = `${dossierId}/${fileId}.pdf`

  // Upload to Supabase Storage (use service_role client to bypass RLS)
  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await writeClient.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadError) {
    console.error('Error uploading file:', uploadError)
    throw new Error(`Erreur lors de l'upload du fichier: ${uploadError.message}`)
  }

  // Get public URL
  const { data: { publicUrl } } = writeClient.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath)

  // Create document record in DB (use write client for insert)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (writeClient.from('documents') as any)
    .insert({
      dossier_id: dossierId,
      type: 'proposal_pdf' as const,
      name: name || file.name,
      file_url: publicUrl,
      file_size: file.size,
      mime_type: file.type,
      is_client_visible: true,
      uploaded_by: user?.id || null,
      price_total: priceTotal && !isNaN(priceTotal) ? priceTotal : null,
      price_per_person: pricePerPerson && !isNaN(pricePerPerson) ? pricePerPerson : null,
      currency,
    })
    .select()
    .single()

  if (error) {
    // Cleanup: delete uploaded file if DB insert fails
    await writeClient.storage.from(STORAGE_BUCKET).remove([storagePath])
    console.error('Error creating document record:', JSON.stringify(error, null, 2))
    throw new Error(`Erreur lors de l'enregistrement du document: ${error.message} (code: ${error.code}, details: ${error.details})`)
  }

  revalidatePath(`/admin/dossiers/${dossierId}`)
  return data as DossierDocument
}

// ============================================================
// CREATE EXTERNAL LINK OFFER
// ============================================================

export async function createExternalOffer(
  dossierId: string,
  input: {
    name: string
    url: string
    price_total?: number | null
    price_per_person?: number | null
    currency?: string
  }
): Promise<DossierDocument> {
  const supabase = await createClient()
  const writeClient = createWriteClient()

  // Basic URL validation
  if (!input.url || (!input.url.startsWith('http://') && !input.url.startsWith('https://'))) {
    throw new Error('L\'URL doit commencer par http:// ou https://')
  }

  if (!input.name.trim()) {
    throw new Error('Le nom de l\'offre est requis')
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (writeClient.from('documents') as any)
    .insert({
      dossier_id: dossierId,
      type: 'other' as const,
      name: input.name.trim(),
      file_url: input.url.trim(),
      file_size: null,
      mime_type: null,
      is_client_visible: true,
      uploaded_by: user?.id || null,
      price_total: input.price_total ?? null,
      price_per_person: input.price_per_person ?? null,
      currency: input.currency || 'EUR',
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating external offer:', error)
    throw new Error('Erreur lors de l\'enregistrement de l\'offre')
  }

  revalidatePath(`/admin/dossiers/${dossierId}`)
  return data as DossierDocument
}

// ============================================================
// LIST DOSSIER DOCUMENTS (offers only)
// ============================================================

export async function getDossierOfferDocuments(
  dossierId: string
): Promise<DossierDocument[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('dossier_id', dossierId)
    .in('type', ['proposal_pdf', 'other'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching dossier documents:', error)
    return []
  }

  return (data || []) as DossierDocument[]
}

// ============================================================
// DELETE DOCUMENT
// ============================================================

export async function deleteDossierDocument(
  documentId: string,
  dossierId: string
): Promise<void> {
  const supabase = await createClient()
  const writeClient = createWriteClient()

  // First fetch the document to check if it has a storage file
  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single()

  if (fetchError || !doc) {
    throw new Error('Document non trouvé')
  }

  // If it's a PDF with storage, delete the file
  if (doc.type === 'proposal_pdf' && doc.file_url) {
    // Extract storage path from public URL
    // Public URLs look like: https://xxx.supabase.co/storage/v1/object/public/documents/dossierId/fileId.pdf
    const url = doc.file_url
    const pathMatch = url.match(/\/storage\/v1\/object\/public\/documents\/(.+)$/)
    if (pathMatch) {
      const storagePath = pathMatch[1]
      const { error: deleteStorageError } = await writeClient.storage
        .from(STORAGE_BUCKET)
        .remove([storagePath])
      if (deleteStorageError) {
        console.error('Error deleting file from storage:', deleteStorageError)
        // Continue with DB deletion even if storage cleanup fails
      }
    }
  }

  // Delete from DB (use write client to bypass RLS)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (writeClient.from('documents') as any)
    .delete()
    .eq('id', documentId)

  if (error) {
    console.error('Error deleting document:', error)
    throw new Error('Erreur lors de la suppression du document')
  }

  revalidatePath(`/admin/dossiers/${dossierId}`)
}

// ============================================================
// PUBLISH EXTERNAL OFFER (send email to client)
// ============================================================

export async function publishExternalOffer(
  documentId: string,
  dossierId: string
): Promise<void> {
  const supabase = await createClient()
  const writeClient = createWriteClient()

  // 1. Fetch document
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single()

  if (docError || !doc) {
    throw new Error('Document non trouvé')
  }

  // 2. Fetch dossier info (client name)
  const { data: dossier, error: dossierError } = await supabase
    .from('dossiers')
    .select('id, client_name, reference')
    .eq('id', dossierId)
    .single()

  if (dossierError || !dossier) {
    throw new Error('Dossier non trouvé')
  }

  // 3. Fetch lead participant email
  const { data: leadLinks } = await supabase
    .from('dossier_participants')
    .select(`
      is_lead,
      participant:participants!dossier_participants_participant_id_fkey(email, first_name, last_name)
    `)
    .eq('dossier_id', dossierId)
    .eq('is_lead', true)
    .limit(1)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leadParticipant = (leadLinks as any)?.[0]?.participant
  const clientEmail = leadParticipant?.email
  const clientName = dossier.client_name || `${leadParticipant?.first_name || ''} ${leadParticipant?.last_name || ''}`.trim() || 'Client'

  if (!clientEmail || clientEmail.endsWith('@noemail.local')) {
    throw new Error('Aucune adresse email client trouvée pour ce dossier')
  }

  // 4. Get current user for advisor info
  const { data: { user } } = await supabase.auth.getUser()
  let advisorName = 'Votre conseiller'
  if (user?.id) {
    const { data: advisor } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single()
    if (advisor) {
      advisorName = `${advisor.first_name || ''} ${advisor.last_name || ''}`.trim() || 'Votre conseiller'
    }
  }

  // 5. Generate email HTML
  const { generateExternalOfferEmailHtml } = await import('@/lib/email/templates')
  const html = generateExternalOfferEmailHtml({
    clientName,
    offerName: doc.name,
    offerUrl: doc.file_url,
    priceTotal: doc.price_total,
    pricePerPerson: doc.price_per_person,
    currency: doc.currency || 'EUR',
    isPdf: doc.type === 'proposal_pdf',
    advisorName,
    dossierReference: dossier.reference,
  })

  // 6. Send email via Resend
  const { sendEmail } = await import('@/lib/email/resend')
  const result = await sendEmail({
    to: clientEmail,
    toName: clientName,
    subject: `Nouvelle offre de voyage — ${doc.name}`,
    html,
    threadId: dossierId,
  })

  if (!result.success) {
    console.error('Email send failed:', result.error)
    throw new Error(`Erreur lors de l'envoi de l'email: ${result.error}`)
  }

  // 7. Update document with publish info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (writeClient.from('documents') as any)
    .update({
      published_at: new Date().toISOString(),
      published_by: user?.id || null,
    })
    .eq('id', documentId)

  if (updateError) {
    console.error('Error updating document published_at:', updateError)
    // Email was sent, don't throw — just log
  }

  revalidatePath(`/admin/dossiers/${dossierId}`)
}
