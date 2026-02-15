import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import Anthropic from '@anthropic-ai/sdk'

// ─── Supabase clients ─────────────────────────────────────────────────────────

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

// ─── Country name helper ──────────────────────────────────────────────────────

function countryNameFr(code: string): string {
  try {
    return new Intl.DisplayNames(['fr'], { type: 'region' }).of(code.toUpperCase()) || code
  } catch {
    return code
  }
}

function monthNameFr(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  } catch {
    return dateStr
  }
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

function buildCountryPrompt(countryName: string): string {
  return `Tu es un expert voyage spécialisé sur ${countryName}. Génère des informations pratiques structurées en JSON pour un voyageur français.

RÈGLES IMPORTANTES :
- Chaque item a un contenu CONCIS (1-3 phrases maximum, directement utile)
- Sois factuel et pratique, pas de blabla marketing
- Adapte au public français (visa, adaptateurs, etc.)
- Utilise des emojis pertinents pour chaque item

Format de sortie attendu (JSON array stricte, pas de texte avant ou après) :
[
  {
    "key": "formalities",
    "label": "Formalités",
    "icon": "Stamp",
    "items": [
      { "key": "visa", "label": "Visa", "emoji": "🛂", "content": "..." },
      { "key": "enregistrement_vol", "label": "Enregistrement vol", "emoji": "✈️", "content": "..." }
    ]
  },
  {
    "key": "preparation",
    "label": "Préparation du voyage",
    "icon": "Suitcase",
    "items": [
      { "key": "bagages", "label": "Bagages", "emoji": "🧳", "content": "..." },
      { "key": "tenue_vestimentaire", "label": "Tenue vestimentaire", "emoji": "👔", "content": "..." },
      { "key": "assurance", "label": "Assurance voyage", "emoji": "🛡️", "content": "..." },
      { "key": "adaptateur", "label": "Adaptateur électrique", "emoji": "🔌", "content": "..." },
      { "key": "documents_importants", "label": "Documents importants", "emoji": "📋", "content": "..." }
    ]
  },
  {
    "key": "budget",
    "label": "Budget & Paiement",
    "icon": "CurrencyDollar",
    "items": [
      { "key": "devise_locale", "label": "Devise locale", "emoji": "💱", "content": "..." },
      { "key": "change", "label": "Change & retrait", "emoji": "🏧", "content": "..." },
      { "key": "pourboire", "label": "Pourboire", "emoji": "💰", "content": "..." },
      { "key": "paiement_carte", "label": "Paiement par carte", "emoji": "💳", "content": "..." },
      { "key": "budget_quotidien", "label": "Budget quotidien", "emoji": "📊", "content": "..." }
    ]
  },
  {
    "key": "communication",
    "label": "Communication",
    "icon": "WifiHigh",
    "items": [
      { "key": "carte_sim", "label": "Carte SIM locale", "emoji": "📱", "content": "..." },
      { "key": "wifi", "label": "Wi-Fi", "emoji": "📶", "content": "..." },
      { "key": "applications_utiles", "label": "Applications utiles", "emoji": "📲", "content": "..." }
    ]
  },
  {
    "key": "health_safety",
    "label": "Santé et sécurité",
    "icon": "FirstAidKit",
    "items": [
      { "key": "vaccins", "label": "Vaccins", "emoji": "💉", "content": "..." },
      { "key": "pharmacie", "label": "Pharmacie de voyage", "emoji": "💊", "content": "..." },
      { "key": "eau_alimentation", "label": "Eau & alimentation", "emoji": "🚰", "content": "..." },
      { "key": "securite_locale", "label": "Sécurité locale", "emoji": "🔒", "content": "..." },
      { "key": "numeros_urgence", "label": "Numéros d'urgence", "emoji": "🆘", "content": "..." }
    ]
  },
  {
    "key": "culture",
    "label": "Culture & Savoir-vivre",
    "icon": "HandsPraying",
    "items": [
      { "key": "coutumes_locales", "label": "Coutumes locales", "emoji": "🙏", "content": "..." },
      { "key": "code_vestimentaire", "label": "Code vestimentaire", "emoji": "👗", "content": "..." },
      { "key": "religion", "label": "Religion & temples", "emoji": "🛕", "content": "..." },
      { "key": "gestes_a_eviter", "label": "Gestes à éviter", "emoji": "🚫", "content": "..." },
      { "key": "mots_utiles", "label": "Mots utiles", "emoji": "🗣️", "content": "..." }
    ]
  }
]

Pays : ${countryName}

IMPORTANT : Retourne UNIQUEMENT le JSON array, sans texte additionnel ni backticks markdown.`
}

function buildOverlayPrompt(countryName: string, startDate: string, endDate: string): string {
  const startMonth = monthNameFr(startDate)
  const endMonth = monthNameFr(endDate)

  return `Tu es un expert voyage spécialisé sur ${countryName}. Génère des informations météo et saisonnières pour un voyage prévu de ${startMonth} à ${endMonth}.

RÈGLES :
- Contenu CONCIS (1-3 phrases max par item)
- Sois précis sur les températures et conditions réelles pour cette période
- Adapte les conseils bagages à cette saison spécifique

Format de sortie (JSON array stricte) :
[
  {
    "key": "weather",
    "label": "Météo & Saisonnalité",
    "icon": "CloudSun",
    "items": [
      { "key": "climat", "label": "Climat général", "emoji": "🌤️", "content": "..." },
      { "key": "saison", "label": "Saison", "emoji": "📅", "content": "..." },
      { "key": "temperatures", "label": "Températures", "emoji": "🌡️", "content": "..." },
      { "key": "precipitations", "label": "Précipitations", "emoji": "🌧️", "content": "..." },
      { "key": "bagages_saison", "label": "Bagages recommandés", "emoji": "🎒", "content": "..." }
    ]
  }
]

Pays : ${countryName}
Période : ${startDate} — ${endDate}

IMPORTANT : Retourne UNIQUEMENT le JSON array, sans texte additionnel ni backticks markdown.`
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Anthropic API key is configured
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured on the server' },
        { status: 500 }
      )
    }

    // 2. Verify auth (optional — for client calls, session may exist)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 3. Parse body
    const body = await request.json()
    const { type, countryCode, tenantId, dossierId, startDate, endDate } = body

    if (!type || !countryCode) {
      return NextResponse.json(
        { error: 'Missing required fields: type, countryCode' },
        { status: 400 }
      )
    }

    const countryName = countryNameFr(countryCode)
    const jobId = crypto.randomUUID()

    // 4. Call Claude
    const anthropic = new Anthropic({ apiKey: anthropicKey })

    let prompt: string
    if (type === 'overlay') {
      if (!dossierId || !startDate || !endDate) {
        return NextResponse.json(
          { error: 'Missing fields for overlay: dossierId, startDate, endDate' },
          { status: 400 }
        )
      }
      prompt = buildOverlayPrompt(countryName, startDate, endDate)
    } else {
      if (!tenantId) {
        return NextResponse.json(
          { error: 'Missing field for country: tenantId' },
          { status: 400 }
        )
      }
      prompt = buildCountryPrompt(countryName)
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    // 5. Parse the JSON response
    const firstBlock = message.content?.[0]
    const responseText = firstBlock && 'text' in firstBlock ? (firstBlock as { type: 'text'; text: string }).text : ''

    // Strip potential markdown code fences
    let cleanJson = responseText.trim()
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.slice(7)
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.slice(3)
    }
    if (cleanJson.endsWith('```')) {
      cleanJson = cleanJson.slice(0, -3)
    }
    cleanJson = cleanJson.trim()

    let categories: any[]
    try {
      categories = JSON.parse(cleanJson)
    } catch (parseErr) {
      console.error('[generate-travel-info] Failed to parse Claude response:', cleanJson.slice(0, 200))
      return NextResponse.json(
        { error: 'Failed to parse AI response as JSON', raw: cleanJson.slice(0, 500) },
        { status: 500 }
      )
    }

    if (!Array.isArray(categories)) {
      return NextResponse.json(
        { error: 'AI response is not a JSON array' },
        { status: 500 }
      )
    }

    // 6. Upsert into the appropriate table
    const writeClient = createWriteClient()
    const now = new Date().toISOString()

    if (type === 'overlay') {
      // Upsert dossier overlay
      const { error: upsertError } = await (writeClient.from('dossier_travel_info_overlay') as any)
        .upsert(
          {
            dossier_id: dossierId,
            country_code: countryCode.toUpperCase(),
            start_date: startDate,
            end_date: endDate,
            categories,
            prompt_version: '1.0',
            model: 'claude-sonnet-4-20250514',
            generated_at: now,
            updated_at: now,
          },
          { onConflict: 'dossier_id,country_code' }
        )

      if (upsertError) {
        console.error('[generate-travel-info] Overlay upsert error:', upsertError)
        return NextResponse.json(
          { error: 'Failed to save overlay', details: upsertError.message },
          { status: 500 }
        )
      }
    } else {
      // Upsert country travel info
      const { error: upsertError } = await (writeClient.from('country_travel_info') as any)
        .upsert(
          {
            tenant_id: tenantId,
            country_code: countryCode.toUpperCase(),
            categories,
            status: 'draft',
            job_id: jobId,
            prompt_version: '1.0',
            model: 'claude-sonnet-4-20250514',
            sources_used: ['ai_generated'],
            generated_at: now,
            updated_at: now,
          },
          { onConflict: 'tenant_id,country_code' }
        )

      if (upsertError) {
        console.error('[generate-travel-info] Country upsert error:', upsertError)
        return NextResponse.json(
          { error: 'Failed to save country info', details: upsertError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      type,
      countryCode: countryCode.toUpperCase(),
      categories,
      jobId: type === 'country' ? jobId : undefined,
    })
  } catch (err: any) {
    console.error('[generate-travel-info] Unhandled error:', err)
    return NextResponse.json(
      { error: 'Internal server error', message: err?.message },
      { status: 500 }
    )
  }
}
