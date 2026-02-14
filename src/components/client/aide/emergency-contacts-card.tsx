import Link from 'next/link'
import { Phone, ChatCircle } from '@phosphor-icons/react/dist/ssr'

// ─── Types ───────────────────────────────────────────────────────────────────

interface EmergencyContactsCardProps {
  advisorName: string
  advisorEmail: string
  dossierId: string | number
  themeColor: string
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EmergencyContactsCard({
  advisorName,
  advisorEmail,
  dossierId,
  themeColor,
}: EmergencyContactsCardProps) {
  return (
    <div
      className="rounded-xl border-2 overflow-hidden"
      style={{ borderColor: `${themeColor}30`, backgroundColor: `${themeColor}06` }}
    >
      <div className="px-5 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${themeColor}15` }}
          >
            <Phone size={18} weight="duotone" style={{ color: themeColor }} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Besoin d&apos;aide rapidement ?</h2>
            <p className="text-xs text-gray-500">Votre hôte local est là pour vous</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white rounded-lg px-4 py-3 border border-gray-100">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: themeColor }}
          >
            {advisorName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{advisorName}</p>
            <p className="text-xs text-gray-500 truncate">{advisorEmail}</p>
          </div>
          <Link
            href={`/client/voyages/${dossierId}?tab=messages`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90 flex-shrink-0"
            style={{ backgroundColor: themeColor }}
          >
            <ChatCircle size={14} weight="duotone" />
            Envoyer un message
          </Link>
        </div>
      </div>
    </div>
  )
}
