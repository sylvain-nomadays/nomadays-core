import { Camera, AirplaneTilt } from '@phosphor-icons/react/dist/ssr'

export default function SouvenirsPage() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh] p-8">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-5">
          <Camera size={40} weight="duotone" className="text-gray-200" />
        </div>
        <h2 className="font-display font-bold text-xl text-gray-800 mb-2">
          Mes Souvenirs
        </h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          Effectuez un premier voyage avec Nomadays pour retrouver ici vos plus beaux souvenirs.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 text-xs text-gray-300">
          <AirplaneTilt size={14} weight="duotone" />
          <span>Bientôt disponible</span>
        </div>
      </div>
    </div>
  )
}
