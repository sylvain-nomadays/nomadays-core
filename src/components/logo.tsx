interface LogoProps {
  className?: string
  showText?: boolean
}

export function Logo({ className = 'h-8 w-auto', showText = true }: LogoProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Nomadays infinity symbol logo */}
      <svg
        viewBox="0 0 912 440"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <path
          d="M456 80C456 80 380 80 320 140C260 200 200 280 160 320C120 360 80 400 40 400C40 400 0 400 0 360C0 320 40 280 80 240C120 200 180 140 240 100C300 60 380 40 456 40C532 40 612 60 672 100C732 140 792 200 832 240C872 280 912 320 912 360C912 400 872 400 872 400C832 400 792 360 752 320C712 280 652 200 592 140C532 80 456 80 456 80Z"
          fill="#0FB6BC"
          transform="translate(0, 20)"
        />
      </svg>
      {showText && (
        <span className="font-semibold text-xl tracking-tight text-foreground">
          nomadays
        </span>
      )}
    </div>
  )
}

export function LogoIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M50 10C50 10 38 10 30 18C22 26 14 36 10 42C6 48 2 54 2 54C2 54 0 56 2 58C4 60 8 58 12 54C16 50 24 40 32 32C40 24 50 22 50 22C50 22 60 24 68 32C76 40 84 50 88 54C92 58 96 60 98 58C100 56 98 54 98 54C94 48 86 38 78 30C70 22 62 10 50 10Z"
        fill="#0FB6BC"
      />
    </svg>
  )
}
