'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Airplane,
  CalendarDots,
  MapPin,
  User,
  EnvelopeSimple,
  Lock,
  Eye,
  EyeSlash,
  CheckCircle,
  ArrowRight,
} from '@phosphor-icons/react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface InvitationData {
  participantId: string
  participantName: string
  participantEmail: string | null
  dossierId: string
  dossierTitle: string
  destination: string | null
  departureDateFrom: string | null
  departureDateTo: string | null
  tenantName: string | null
  advisorName: string | null
  token: string
}

interface InvitationFormProps {
  invitation: InvitationData
  isLoggedIn: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateRange(from: string | null, to: string | null): string {
  if (!from && !to) return ''
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
  if (from && to) {
    const fromStr = new Date(from).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    const toStr = new Date(to).toLocaleDateString('fr-FR', opts)
    return `${fromStr} — ${toStr}`
  }
  if (from) return new Date(from).toLocaleDateString('fr-FR', opts)
  return ''
}

// ─── Component ───────────────────────────────────────────────────────────────

export function InvitationForm({ invitation, isLoggedIn }: InvitationFormProps) {
  const router = useRouter()

  const [email, setEmail] = useState(invitation.participantEmail || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'welcome' | 'register' | 'success'>('welcome')

  const dateRange = formatDateRange(invitation.departureDateFrom, invitation.departureDateTo)

  // If user is already logged in but email doesn't match → show info
  const handleContinue = () => setStep('register')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // Sign up with Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: invitation.participantName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=/client/voyages/${invitation.dossierId}`,
        },
      })

      if (signUpError) {
        // If user already exists, try to sign in
        if (signUpError.message.includes('already registered') || signUpError.message.includes('already been registered')) {
          setError('Un compte existe déjà avec cette adresse email. Essayez de vous connecter.')
          setLoading(false)
          return
        }
        setError(signUpError.message)
        setLoading(false)
        return
      }

      // Now link the participant to the auth user via server action
      if (signUpData.user) {
        const response = await fetch('/api/invitation/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: invitation.token,
            userId: signUpData.user.id,
            participantId: invitation.participantId,
          }),
        })

        if (!response.ok) {
          console.error('Failed to complete invitation linking')
        }
      }

      setStep('success')
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Welcome step ───────────────────────────────────────────────────────────

  if (step === 'welcome') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 max-w-lg w-full overflow-hidden">
        {/* Travel info header */}
        <div
          className="p-6 text-white"
          style={{ background: 'linear-gradient(135deg, #0FB6BC 0%, #0C9296 50%, #096D71 100%)' }}
        >
          <div className="flex items-center gap-2 text-white/80 text-xs uppercase tracking-wider mb-3">
            <Airplane size={14} weight="duotone" />
            Invitation voyage
          </div>
          <h1 className="font-display font-bold text-2xl leading-tight mb-2">
            {invitation.dossierTitle}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/85 mt-3">
            {invitation.destination && (
              <span className="flex items-center gap-1.5">
                <MapPin size={15} weight="duotone" />
                {invitation.destination}
              </span>
            )}
            {dateRange && (
              <span className="flex items-center gap-1.5">
                <CalendarDots size={15} weight="duotone" />
                {dateRange}
              </span>
            )}
          </div>
        </div>

        {/* Welcome message */}
        <div className="p-6 space-y-5">
          <div>
            <p className="text-gray-700 text-[15px] leading-relaxed">
              Bonjour <strong>{invitation.participantName}</strong>,
            </p>
            <p className="text-gray-600 text-sm mt-2 leading-relaxed">
              Vous avez été invité(e) à rejoindre l&apos;espace voyageur pour ce voyage
              {invitation.advisorName ? ` organisé par ${invitation.advisorName}` : ''}
              {invitation.tenantName ? ` chez ${invitation.tenantName}` : ''}.
            </p>
            <p className="text-gray-600 text-sm mt-2 leading-relaxed">
              Créez votre compte pour accéder au programme détaillé, aux propositions de circuit,
              et à toutes les informations de votre voyage.
            </p>
          </div>

          {/* Features list */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <CheckCircle size={18} weight="duotone" className="text-[#8BA080] flex-shrink-0" />
              Consultez le programme jour par jour
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <CheckCircle size={18} weight="duotone" className="text-[#8BA080] flex-shrink-0" />
              Échangez avec votre hôte local
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <CheckCircle size={18} weight="duotone" className="text-[#8BA080] flex-shrink-0" />
              Retrouvez tous vos documents de voyage
            </div>
          </div>

          <button
            onClick={handleContinue}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: '#0FB6BC' }}
          >
            Créer mon compte
            <ArrowRight size={16} weight="bold" />
          </button>

          <p className="text-center text-xs text-gray-400">
            Déjà un compte ?{' '}
            <a
              href={`/login?redirect=/client/voyages/${invitation.dossierId}`}
              className="text-[#0FB6BC] hover:underline"
            >
              Se connecter
            </a>
          </p>
        </div>
      </div>
    )
  }

  // ─── Success step ───────────────────────────────────────────────────────────

  if (step === 'success') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">✉️</div>
        <h1 className="font-display font-bold text-xl text-gray-800 mb-2">
          Vérifiez votre email
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          Un email de confirmation a été envoyé à <strong className="text-gray-700">{email}</strong>.
          <br />
          Cliquez sur le lien dans l&apos;email pour activer votre compte et accéder à votre espace voyageur.
        </p>
        <a
          href={`/login?redirect=/client/voyages/${invitation.dossierId}`}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: '#0FB6BC' }}
        >
          Se connecter
        </a>
      </div>
    )
  }

  // ─── Register step ──────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md w-full overflow-hidden">
      {/* Compact header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ backgroundColor: '#0FB6BC' }}
        >
          {invitation.participantName[0]?.toUpperCase() || 'V'}
        </div>
        <div>
          <p className="font-display font-bold text-sm text-gray-800">{invitation.participantName}</p>
          <p className="text-xs text-gray-400">{invitation.dossierTitle}</p>
        </div>
      </div>

      <div className="p-6">
        <h2 className="font-display font-bold text-lg text-gray-800 mb-1">
          Créer votre compte
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          Renseignez votre email et choisissez un mot de passe
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <EnvelopeSimple size={14} weight="duotone" className="text-gray-400" />
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0FB6BC]/30 focus:border-[#0FB6BC] transition-all"
              readOnly={!!invitation.participantEmail}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <Lock size={14} weight="duotone" className="text-gray-400" />
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Au moins 8 caractères"
                required
                minLength={8}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0FB6BC]/30 focus:border-[#0FB6BC] transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <Lock size={14} weight="duotone" className="text-gray-400" />
              Confirmer le mot de passe
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmez votre mot de passe"
              required
              minLength={8}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0FB6BC]/30 focus:border-[#0FB6BC] transition-all"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#0FB6BC' }}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Création en cours...
              </>
            ) : (
              <>
                <User size={16} weight="duotone" />
                Créer mon compte
              </>
            )}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
          <button
            onClick={() => setStep('welcome')}
            className="hover:text-gray-600 transition-colors"
          >
            ← Retour
          </button>
          <a
            href={`/login?redirect=/client/voyages/${invitation.dossierId}`}
            className="text-[#0FB6BC] hover:underline"
          >
            Déjà un compte ?
          </a>
        </div>
      </div>
    </div>
  )
}
