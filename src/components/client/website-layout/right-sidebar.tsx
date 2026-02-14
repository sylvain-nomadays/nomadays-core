import Image from 'next/image'
import Link from 'next/link'
import { House, Phone, WhatsappLogo, EnvelopeSimple, ShieldCheck, Gift, DeviceMobileSpeaker, InstagramLogo, YoutubeLogo, FacebookLogo, MapPin, CalendarDots, ArrowRight } from '@phosphor-icons/react/dist/ssr'
import type { ContinentTheme } from '../continent-theme'

// ─── Sidebar content types (from CMS snippets) ─────────────────────────────

export interface SidebarContent {
  collectif: {
    title: string
    tagline: string
    description: string
    phone: string
    whatsapp: string
    email: string
  }
  insurance: {
    title: string
    subtitle: string
    description: string
    cta_text: string
    cta_link: string
  }
  ambassador: {
    title: string
    description: string
    cta_text: string
  }
  social: {
    instagram: string
    facebook: string
    youtube: string
  }
}

// ─── Proposal mini-card type ────────────────────────────────────────────────

export interface ProposalMiniCard {
  dossierId: string
  tripName: string
  countryName: string
  countryFlag: string
  heroPhotoUrl: string | null
  durationDays: number | null
  pricePerPerson: number | null
  currency: string
  continentTheme: ContinentTheme
}

// ─── Defaults (hardcoded fallback) ──────────────────────────────────────────

const DEFAULT_SIDEBAR: SidebarContent = {
  collectif: {
    title: 'Le collectif Nomadays',
    tagline: 'Vos agences locales s\'unissent et inventent',
    description: 'Nos h\u00f4tes locaux vous accueillent comme en famille. Expertise du terrain + garanties d\'une agence fran\u00e7aise.',
    phone: '01 23 45 67 89',
    whatsapp: 'WhatsApp',
    email: 'contact@nomadays.fr',
  },
  insurance: {
    title: 'Assurance Chapka',
    subtitle: 'Notre partenaire',
    description: 'Voyagez l\'esprit tranquille. Annulation, rapatriement, frais m\u00e9dicaux...',
    cta_text: 'D\u00e9couvrir les garanties',
    cta_link: '#',
  },
  ambassador: {
    title: 'Passeurs d\'Horizons',
    description: 'Chaque voyage partag\u00e9 pr\u00e9pare le suivant.',
    cta_text: 'Passer le relais',
  },
  social: {
    instagram: '#',
    facebook: '#',
    youtube: '#',
  },
}

// ─── Format price helper ────────────────────────────────────────────────────

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

// ─── Component ──────────────────────────────────────────────────────────────

interface RightSidebarProps {
  continentTheme: ContinentTheme
  content?: SidebarContent
  proposals?: ProposalMiniCard[]
}

// ─── Proposal Cards (reusable) ───────────────────────────────────────────────

function ProposalCards({
  proposals,
  continentTheme,
  maxCards = 2,
  layout = 'vertical',
}: {
  proposals: ProposalMiniCard[]
  continentTheme: ContinentTheme
  maxCards?: number
  layout?: 'vertical' | 'horizontal'
}) {
  if (!proposals || proposals.length === 0) return null

  const isHorizontal = layout === 'horizontal'
  // Only show the last N proposals (most recent first, already sorted desc by created_at)
  const visibleProposals = proposals.slice(0, maxCards)
  // Find the dossierId from the first proposal for the "Voir toutes" button
  const firstDossierId = proposals[0]?.dossierId

  return (
    <div>
      {/* Heading — hidden in horizontal mode (context is obvious in Salon de Thé) */}
      {!isHorizontal && (
        <h3 className="right-sidebar-proposals-heading font-display font-bold text-sm text-gray-800 flex items-center gap-2 mb-4">
          <MapPin size={16} weight="duotone" style={{ color: continentTheme.primary }} />
          Vos propositions
        </h3>
      )}

      <div className={isHorizontal ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-4'}>
        {visibleProposals.map((proposal, idx) => (
          <Link
            key={`${proposal.dossierId}-${idx}`}
            href={`/client/voyages/${proposal.dossierId}?tab=proposals`}
            className="block rounded-2xl overflow-hidden border border-gray-100 bg-white hover:shadow-md hover:border-gray-200 transition-all group"
          >
            {/* Image — aspect-[4/3] for horizontal, fixed h-[130px] for vertical */}
            <div className={`relative ${isHorizontal ? 'aspect-[4/3]' : 'h-[130px]'}`}>
              {proposal.heroPhotoUrl ? (
                <Image
                  src={proposal.heroPhotoUrl}
                  alt={proposal.tripName}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes={isHorizontal ? '(max-width: 640px) 100vw, 50vw' : '300px'}
                />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, ${proposal.continentTheme.primary} 0%, ${proposal.continentTheme.accent} 100%)`,
                  }}
                />
              )}
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

              {/* Country badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1">
                <span className="text-sm">{proposal.countryFlag}</span>
                <span className="text-[11px] font-semibold text-gray-800">{proposal.countryName}</span>
              </div>
            </div>

            {/* Body */}
            <div className="p-4">
              <h4 className="font-display font-bold text-[13px] text-gray-800 line-clamp-2 mb-2 leading-snug">
                {proposal.tripName}
              </h4>

              <div className="flex items-center gap-3 text-[11px] text-gray-500">
                {proposal.durationDays && (
                  <span className="flex items-center gap-1">
                    <CalendarDots size={12} weight="duotone" />
                    {proposal.durationDays} jours
                  </span>
                )}
                {proposal.pricePerPerson && (
                  <span className="font-semibold" style={{ color: proposal.continentTheme.primary }}>
                    {formatPrice(proposal.pricePerPerson, proposal.currency)}/pers
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* "Voir toutes mes propositions" button */}
      {firstDossierId && (
        <Link
          href={`/client/voyages/${firstDossierId}?tab=proposals`}
          className="flex items-center justify-center gap-2 w-full py-3 mt-4 rounded-xl text-sm font-semibold transition-colors hover:opacity-90"
          style={{ backgroundColor: `${continentTheme.primary}12`, color: continentTheme.primary }}
        >
          Voir toutes mes propositions
          <ArrowRight size={14} weight="bold" />
        </Link>
      )}
    </div>
  )
}

export { ProposalCards }

export function RightSidebar({ continentTheme, content, proposals }: RightSidebarProps) {
  const c = content || DEFAULT_SIDEBAR

  return (
    <aside className="hidden xl:flex flex-col gap-6 bg-white border-l border-gray-100 p-6 overflow-y-auto">

      {/* ── Proposal Mini-Cards ── */}
      <div className="right-sidebar-proposals">
        <ProposalCards proposals={proposals || []} continentTheme={continentTheme} />
      </div>

      {/* Nomadays Collectif */}
      <div
        className="right-sidebar-collectif rounded-[20px] p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #2D3436 0%, #3d4648 100%)' }}
      >
        <House size={48} weight="duotone" className="absolute top-4 right-4 opacity-10 text-white" />
        <h3 className="font-display font-bold text-base mb-2.5 flex items-center gap-2">
          <House size={20} weight="duotone" /> {c.collectif.title}
        </h3>
        <p className="text-sm italic mb-3" style={{ color: '#D4A847' }}>
          &laquo; {c.collectif.tagline} &raquo;
        </p>
        <p className="text-sm opacity-85 leading-relaxed mb-4">
          {c.collectif.description}
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5 text-sm px-3.5 py-2.5 bg-white/10 rounded-[10px] cursor-pointer hover:bg-white/[0.18] transition-colors">
            <Phone size={16} weight="duotone" className="opacity-70 flex-shrink-0" />
            <span>{c.collectif.phone}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm px-3.5 py-2.5 bg-white/10 rounded-[10px] cursor-pointer hover:bg-white/[0.18] transition-colors">
            <WhatsappLogo size={16} weight="duotone" className="opacity-70 flex-shrink-0" />
            <span>{c.collectif.whatsapp}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm px-3.5 py-2.5 bg-white/10 rounded-[10px] cursor-pointer hover:bg-white/[0.18] transition-colors">
            <EnvelopeSimple size={16} weight="duotone" className="opacity-70 flex-shrink-0" />
            <span>{c.collectif.email}</span>
          </div>
        </div>
      </div>

      {/* Chapka Assurance */}
      <div className="right-sidebar-insurance rounded-[20px] p-6 border" style={{ backgroundColor: '#F2F5F0', borderColor: 'rgba(139, 160, 128, 0.3)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: '#8BA080' }}>
            <ShieldCheck size={24} weight="duotone" />
          </div>
          <div>
            <h3 className="font-display font-bold text-[15px] text-gray-800">{c.insurance.title}</h3>
            <span className="text-xs text-gray-500">{c.insurance.subtitle}</span>
          </div>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed mb-3.5">
          {c.insurance.description}
        </p>
        <a
          href={c.insurance.cta_link}
          className="block text-center text-white text-sm font-semibold py-3 rounded-[10px] transition-colors hover:opacity-90"
          style={{ backgroundColor: '#8BA080' }}
        >
          {c.insurance.cta_text}
        </a>
      </div>

      {/* Programme Ambassadeur */}
      <div
        className="right-sidebar-ambassador rounded-[20px] p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #D4A847 0%, #c49a3d 100%)' }}
      >
        <Gift size={40} weight="duotone" className="absolute top-3 right-3 opacity-20 text-white" />
        <h3 className="font-display font-bold text-base mb-2">{c.ambassador.title}</h3>
        <p className="text-sm opacity-90 leading-relaxed mb-4">
          {c.ambassador.description}
        </p>
        <div className="bg-white/20 rounded-xl py-3.5 px-4 text-center mb-3">
          <div className="font-display font-extrabold text-[26px]">0 &euro;</div>
          <div className="text-[11px] opacity-80">Vos Cr&eacute;dits Nomadays</div>
        </div>
        <p className="text-[11px] opacity-70 leading-relaxed mb-3.5 text-center">
          En invitant vos proches &agrave; d&eacute;couvrir Nomadays, une part de leur voyage nourrit le v&ocirc;tre.
        </p>
        <a
          href="#"
          className="block text-center font-bold text-sm py-3 rounded-[10px] transition-colors"
          style={{ backgroundColor: 'white', color: '#D4A847' }}
        >
          {c.ambassador.cta_text}
        </a>
      </div>

      {/* Reseaux sociaux */}
      <div className="right-sidebar-social rounded-[20px] p-5 bg-gray-50">
        <h4 className="font-display font-bold text-sm text-gray-800 mb-3.5 flex items-center gap-2">
          <DeviceMobileSpeaker size={16} weight="duotone" className="text-gray-500" />
          Suivez-nous
        </h4>
        <div className="flex gap-2.5">
          <a
            href={c.social.instagram}
            className="flex-1 py-3 rounded-xl flex items-center justify-center text-white transition-transform hover:scale-105"
            style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}
          >
            <InstagramLogo size={22} weight="duotone" />
          </a>
          <a
            href={c.social.facebook}
            className="flex-1 py-3 rounded-xl flex items-center justify-center text-white transition-transform hover:scale-105"
            style={{ backgroundColor: '#1877F2' }}
          >
            <FacebookLogo size={22} weight="duotone" />
          </a>
          <a
            href={c.social.youtube}
            className="flex-1 py-3 rounded-xl flex items-center justify-center text-white transition-transform hover:scale-105"
            style={{ backgroundColor: '#FF0000' }}
          >
            <YoutubeLogo size={22} weight="duotone" />
          </a>
        </div>
      </div>
    </aside>
  )
}
