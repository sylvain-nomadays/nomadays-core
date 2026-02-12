'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Globe, UserCog, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createDossier, getAdvisors } from '@/lib/actions/dossiers'
import { LANGUAGES, MARKETING_SOURCES, DOSSIER_ORIGINS } from '@/lib/constants'
import { toast } from 'sonner'
import { useEffect } from 'react'
import { useUserRole, permissions } from '@/lib/hooks/use-user-role'

interface Advisor {
  id: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
}

export default function NewDossierPage() {
  const router = useRouter()
  const { role, tenantId, isNomadays } = useUserRole()
  const [loading, setLoading] = useState(false)
  const [advisors, setAdvisors] = useState<Advisor[]>([])

  // Check if user can see marketing source (Nomadays only)
  const canSeeMarketingSource = permissions.canSeeMarketingSource(role)

  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [language, setLanguage] = useState('FR')
  const [advisorId, setAdvisorId] = useState('')
  const [origin, setOrigin] = useState('website_b2c')
  const [marketingSource, setMarketingSource] = useState('organic')
  const [affiliateName, setAffiliateName] = useState('')
  const [notes, setNotes] = useState('')

  // Load advisors
  useEffect(() => {
    async function loadAdvisors() {
      const data = await getAdvisors()
      setAdvisors(data)
    }
    loadAdvisors()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Veuillez renseigner le nom du client')
      return
    }

    setLoading(true)
    try {
      // Build dossier payload — field names must match REAL Supabase table columns
      // Real columns: tenant_id, status, client_name, client_email, client_phone,
      // client_company, client_address, departure_date_from/to, budget_min/max,
      // budget_currency, pax_adults/children/infants, destination_countries,
      // marketing_source, marketing_campaign, internal_notes, is_hot, priority,
      // assigned_to_id, partner_agency_id
      // Generate a unique reference: ND-YYYY-XXXXXX
      const year = new Date().getFullYear()
      const seq = String(Date.now()).slice(-6)
      const reference = `ND-${year}-${seq}`

      const dossierPayload: Record<string, unknown> = {
        reference,
        tenant_id: tenantId || '00000000-0000-0000-0000-000000000001',
        status: 'lead',
        client_name: `${firstName} ${lastName}`.trim(),
        client_email: email.trim() || null,
        client_phone: phone.trim() || null,
        marketing_source: marketingSource || null,
        destination_countries: [],
        pax_adults: 2,
        pax_children: 0,
        pax_infants: 0,
      }

      // Optional fields — only include if set
      if (advisorId) dossierPayload.assigned_to_id = advisorId
      if (notes.trim()) dossierPayload.internal_notes = notes.trim()

      const dossier = await createDossier(dossierPayload)
      // Note: createDossier auto-creates the lead participant internally

      toast.success('Dossier créé avec succès')
      router.push(`/admin/dossiers/${dossier.id}`)
    } catch (error) {
      console.error('Error creating dossier:', error)
      toast.error('Erreur lors de la création du dossier')
    } finally {
      setLoading(false)
    }
  }

  const getLangConfig = (code: string) => {
    return LANGUAGES.find(l => l.value === code) || LANGUAGES[0]
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nouveau dossier</h1>
          <p className="text-muted-foreground">Créer une nouvelle demande</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Contact principal
            </CardTitle>
            <CardDescription>
              Informations du client qui fait la demande
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Prénom"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Nom"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemple.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Langue
            </CardTitle>
            <CardDescription>
              Site d'origine de la demande
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.value}
                  type="button"
                  onClick={() => setLanguage(lang.value)}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border transition-all
                    ${language === lang.value
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="font-medium">{lang.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Manager / Advisor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Conseiller clientèle
            </CardTitle>
            <CardDescription>
              Personne en charge du dossier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={advisorId} onValueChange={setAdvisorId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un conseiller" />
              </SelectTrigger>
              <SelectContent>
                {advisors.map((advisor) => (
                  <SelectItem key={advisor.id} value={advisor.id}>
                    {advisor.first_name} {advisor.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Source - Only visible for Nomadays staff */}
        {canSeeMarketingSource && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="h-4 w-4" />
                Source
              </CardTitle>
              <CardDescription>
                Comment le client nous a contacté (visible uniquement par Nomadays)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Origine</Label>
                <Select value={origin} onValueChange={setOrigin}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOSSIER_ORIGINS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Source marketing</Label>
                <Select value={marketingSource} onValueChange={setMarketingSource}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MARKETING_SOURCES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {marketingSource === 'affiliate' && (
                <div className="space-y-2">
                  <Label htmlFor="affiliateName">Nom de l'affilié</Label>
                  <Input
                    id="affiliateName"
                    value={affiliateName}
                    onChange={(e) => setAffiliateName(e.target.value)}
                    placeholder="Nom de l'affilié"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
            <CardDescription>
              Informations complémentaires sur la demande
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes sur la demande du client..."
              className="min-h-[100px]"
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Annuler
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Création...' : 'Créer le dossier'}
          </Button>
        </div>
      </form>
    </div>
  )
}
