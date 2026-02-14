import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getContinentTheme } from '@/components/client/continent-theme'
import {
  User,
  Mail,
  Phone,
  Globe,
  Shield,
  Compass,
  MessageSquare,
  Heart,
  UtensilsCrossed,
  AlertTriangle,
} from 'lucide-react'

export default async function ClientProfilPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    redirect('/login')
  }

  // Récupérer les infos du participant
  const { data: participantData } = await supabase
    .from('participants')
    .select('*')
    .eq('email', user.email)
    .single()

  const participant = participantData as {
    id: string
    first_name: string
    last_name: string
    email: string
    phone: string | null
    nationality: string | null
    birth_date: string | null
    passport_number: string | null
    passport_expiry: string | null
    country: string | null
    dietary_requirements: string | null
    medical_notes: string | null
    emergency_contact: { name?: string; phone?: string; relationship?: string } | null
  } | null

  // Fetch continent theme from active dossier (same pattern as layout)
  let continentTheme = getContinentTheme()
  let travelDateStart: string | null = null

  if (participant) {
    // Find dossiers by client_email (Alembic schema: departure_date_from, destination_countries[])
    const { data: dossierData } = await (supabase
      .from('dossiers') as any)
      .select('destination_countries, status, departure_date_from')
      .eq('client_email', participant.email)
      .not('status', 'eq', 'lost')
      .order('created_at', { ascending: false })
      .limit(5) as { data: any[] | null }

    const dossiers = (dossierData || []).map((d: any) => ({
      destination_country: d.destination_countries?.[0] || null,
      status: d.status,
      travel_date_start: d.departure_date_from || null,
    }))

    const now = new Date()
    const activeDossier = dossiers.find((d: any) =>
      d.travel_date_start && new Date(d.travel_date_start) > now
    ) ?? dossiers[0] ?? null

    if (activeDossier?.destination_country) {
      continentTheme = getContinentTheme(activeDossier.destination_country)
    }
    travelDateStart = activeDossier?.travel_date_start || null
  }

  const initials = participant
    ? `${participant.first_name?.[0] || ''}${participant.last_name?.[0] || ''}`.toUpperCase()
    : '?'

  const fullName = participant
    ? `${participant.first_name} ${participant.last_name}`
    : user.email

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-3xl">
      {/* Header with avatar */}
      <div className="flex items-center gap-5">
        <div
          className="h-16 w-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
          style={{ backgroundColor: continentTheme.primary }}
        >
          {initials}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
          <p className="text-gray-500 mt-0.5">Votre profil voyageur</p>
        </div>
      </div>

      {/* Personal info */}
      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${continentTheme.primary}15` }}
            >
              <User className="h-4 w-4" style={{ color: continentTheme.primary }} />
            </div>
            <h2 className="text-sm font-semibold text-gray-800">Informations personnelles</h2>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          <InfoRow
            icon={User}
            label="Nom complet"
            value={fullName}
            themeColor={continentTheme.primary}
          />
          <InfoRow
            icon={Mail}
            label="Email"
            value={participant?.email || user.email || ''}
            themeColor={continentTheme.primary}
          />
          <InfoRow
            icon={Phone}
            label="Téléphone"
            value={participant?.phone || null}
            placeholder="Non renseigné"
            themeColor={continentTheme.primary}
          />
          <InfoRow
            icon={Globe}
            label="Nationalité"
            value={participant?.nationality || null}
            placeholder="Non renseignée"
            themeColor={continentTheme.primary}
          />
        </div>
      </div>

      {/* Travel documents */}
      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${continentTheme.accent}15` }}
            >
              <Shield className="h-4 w-4" style={{ color: continentTheme.accent }} />
            </div>
            <h2 className="text-sm font-semibold text-gray-800">Documents de voyage</h2>
          </div>
        </div>
        {participant?.passport_number || participant?.passport_expiry || participant?.country ? (
          <div className="divide-y divide-gray-50">
            <InfoRow
              icon={Shield}
              label="Numéro de passeport"
              value={
                participant.passport_number
                  ? `****${participant.passport_number.slice(-4)}`
                  : null
              }
              placeholder="Non renseigné"
              themeColor={continentTheme.primary}
            />
            <div>
              <InfoRow
                icon={Shield}
                label="Date d'expiration"
                value={
                  participant.passport_expiry
                    ? new Date(participant.passport_expiry).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : null
                }
                placeholder="Non renseignée"
                themeColor={continentTheme.primary}
              />
              {/* Passport expiry warning */}
              {participant.passport_expiry && (() => {
                const expiry = new Date(participant.passport_expiry)
                const refDate = travelDateStart ? new Date(travelDateStart) : new Date()
                const sixMonthsBefore = new Date(refDate)
                sixMonthsBefore.setMonth(sixMonthsBefore.getMonth() + 6)
                if (expiry < sixMonthsBefore) {
                  return (
                    <div className="mx-5 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
                      <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <p className="text-xs text-red-600">
                        Attention : votre passeport expire dans moins de 6 mois
                        {travelDateStart ? ' avant votre date de voyage' : ''}.
                        Pensez à le renouveler.
                      </p>
                    </div>
                  )
                }
                return null
              })()}
            </div>
            <InfoRow
              icon={Globe}
              label="Pays d'émission"
              value={participant.country
                ? (() => { try { return new Intl.DisplayNames(['fr'], { type: 'region' }).of(participant.country.toUpperCase()) || participant.country } catch { return participant.country } })()
                : null}
              placeholder="Non renseigné"
              themeColor={continentTheme.primary}
            />
          </div>
        ) : (
          <div className="px-5 py-8 flex flex-col items-center justify-center">
            <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center mb-2">
              <Shield className="h-5 w-5 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">Aucun document renseigné</p>
            <p className="text-xs text-gray-300 mt-0.5">Contactez votre hôte pour les ajouter</p>
          </div>
        )}
      </div>

      {/* Special needs */}
      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${continentTheme.accent}15` }}
            >
              <Heart className="h-4 w-4" style={{ color: continentTheme.accent }} />
            </div>
            <h2 className="text-sm font-semibold text-gray-800">Besoins particuliers</h2>
          </div>
        </div>
        {participant?.dietary_requirements || participant?.medical_notes ? (
          <div className="divide-y divide-gray-50">
            {participant.dietary_requirements && (
              <InfoRow
                icon={UtensilsCrossed}
                label="Régime alimentaire"
                value={participant.dietary_requirements}
                themeColor={continentTheme.primary}
              />
            )}
            {participant.medical_notes && (
              <InfoRow
                icon={Heart}
                label="Informations médicales"
                value={participant.medical_notes}
                themeColor={continentTheme.primary}
              />
            )}
          </div>
        ) : (
          <div className="px-5 py-8 flex flex-col items-center justify-center">
            <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center mb-2">
              <Heart className="h-5 w-5 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">Aucun besoin particulier renseigné</p>
            <p className="text-xs text-gray-300 mt-0.5">Contactez votre hôte pour les ajouter</p>
          </div>
        )}
      </div>

      {/* Emergency contact */}
      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${continentTheme.accent}15` }}
            >
              <Phone className="h-4 w-4" style={{ color: continentTheme.accent }} />
            </div>
            <h2 className="text-sm font-semibold text-gray-800">Contact d&apos;urgence</h2>
          </div>
        </div>
        {participant?.emergency_contact && typeof participant.emergency_contact === 'object' &&
         (participant.emergency_contact.name || participant.emergency_contact.phone) ? (
          <div className="divide-y divide-gray-50">
            {participant.emergency_contact.name && (
              <InfoRow
                icon={User}
                label="Nom"
                value={participant.emergency_contact.name}
                themeColor={continentTheme.primary}
              />
            )}
            {participant.emergency_contact.phone && (
              <div className="flex items-center gap-4 px-5 py-3.5">
                <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">Téléphone</p>
                  <a
                    href={`tel:${participant.emergency_contact.phone}`}
                    className="text-sm font-medium hover:underline"
                    style={{ color: continentTheme.primary }}
                  >
                    {participant.emergency_contact.phone}
                  </a>
                </div>
              </div>
            )}
            {participant.emergency_contact.relationship && (
              <InfoRow
                icon={Heart}
                label="Lien"
                value={participant.emergency_contact.relationship}
                themeColor={continentTheme.primary}
              />
            )}
          </div>
        ) : (
          <div className="px-5 py-8 flex flex-col items-center justify-center">
            <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center mb-2">
              <Phone className="h-5 w-5 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">Aucun contact d&apos;urgence renseigné</p>
            <p className="text-xs text-gray-300 mt-0.5">Contactez votre hôte pour l&apos;ajouter</p>
          </div>
        )}
      </div>

      {/* Security */}
      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-gray-100">
              <Shield className="h-4 w-4 text-gray-500" />
            </div>
            <h2 className="text-sm font-semibold text-gray-800">Sécurité du compte</h2>
          </div>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-gray-600">
            Connecté avec <span className="font-medium text-gray-800">{user.email}</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Votre compte est sécurisé via Nomadays.
          </p>
        </div>
      </div>

      {/* Contact advisor CTA */}
      <Link
        href="/client/messages"
        className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 bg-white hover:shadow-md transition-all group"
      >
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${continentTheme.primary}15` }}
        >
          <MessageSquare className="h-5 w-5" style={{ color: continentTheme.primary }} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800">Modifier mes informations</p>
          <p className="text-xs text-gray-500">Contactez votre hôte pour toute modification</p>
        </div>
      </Link>
    </div>
  )
}

// ─── InfoRow helper ─────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  placeholder,
  themeColor,
}: {
  icon: typeof User
  label: string
  value: string | null
  placeholder?: string
  themeColor: string
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        {value ? (
          <p className="text-sm text-gray-800">{value}</p>
        ) : (
          <p className="text-sm text-gray-300 italic">{placeholder || 'Non renseigné'}</p>
        )}
      </div>
    </div>
  )
}
