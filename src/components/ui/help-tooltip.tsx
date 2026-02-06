'use client'

import { useState } from 'react'
import { HelpCircle, X, Lightbulb, Info, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface HelpTooltipProps {
  /** Short title for the help topic */
  title: string
  /** Main explanation text */
  children: React.ReactNode
  /** Optional tips or best practices */
  tips?: string[]
  /** Visual variant */
  variant?: 'icon' | 'inline' | 'badge'
  /** Icon size */
  size?: 'sm' | 'md'
  /** Position preference */
  side?: 'top' | 'right' | 'bottom' | 'left'
}

/**
 * HelpTooltip - Contextual help component for user guidance
 *
 * Use this throughout the app to explain features, especially for DMC users
 * who need to understand how Nomadays works.
 *
 * @example
 * <HelpTooltip title="Dossier chaud">
 *   Un dossier chaud est prioritaire et apparaît en haut de votre liste.
 *   Utilisez-le pour les clients qui ont besoin d'une réponse rapide.
 * </HelpTooltip>
 */
export function HelpTooltip({
  title,
  children,
  tips,
  variant = 'icon',
  size = 'sm',
  side = 'top'
}: HelpTooltipProps) {
  const [open, setOpen] = useState(false)

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const buttonSize = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6'

  // Simple tooltip for short explanations (no tips)
  if (!tips && typeof children === 'string' && children.length < 100) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            {variant === 'badge' ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                <HelpCircle className={iconSize} />
                {title}
              </span>
            ) : variant === 'inline' ? (
              <span className="inline-flex items-center text-muted-foreground cursor-help ml-1">
                <HelpCircle className={iconSize} />
              </span>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className={`${buttonSize} text-muted-foreground hover:text-foreground`}
              >
                <HelpCircle className={iconSize} />
              </Button>
            )}
          </TooltipTrigger>
          <TooltipContent side={side} className="max-w-xs">
            <p className="text-sm">{children}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Rich popover for longer explanations with tips
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === 'badge' ? (
          <button className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-help transition-colors">
            <HelpCircle className={iconSize} />
            {title}
          </button>
        ) : variant === 'inline' ? (
          <button className="inline-flex items-center text-muted-foreground hover:text-foreground cursor-help ml-1 transition-colors">
            <HelpCircle className={iconSize} />
          </button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className={`${buttonSize} text-muted-foreground hover:text-foreground`}
          >
            <HelpCircle className={iconSize} />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent side={side} className="w-80" align="start">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Info className="h-4 w-4 text-primary" />
              </div>
              <h4 className="font-semibold text-sm">{title}</h4>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mr-2 -mt-1"
              onClick={() => setOpen(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Main content */}
          <div className="text-sm text-muted-foreground">
            {children}
          </div>

          {/* Tips section */}
          {tips && tips.length > 0 && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 mb-2">
                <Lightbulb className="h-3.5 w-3.5" />
                Conseils
              </div>
              <ul className="space-y-1.5">
                {tips.map((tip, index) => (
                  <li key={index} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-amber-500">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * FeatureExplainer - Larger explanation block for new/complex features
 *
 * Use this for first-time feature discovery or complex workflows
 */
interface FeatureExplainerProps {
  title: string
  description: string
  steps?: string[]
  learnMoreUrl?: string
  onDismiss?: () => void
  variant?: 'info' | 'tip' | 'new'
}

export function FeatureExplainer({
  title,
  description,
  steps,
  learnMoreUrl,
  onDismiss,
  variant = 'info'
}: FeatureExplainerProps) {
  const variantStyles = {
    info: {
      bg: 'bg-blue-50 border-blue-200',
      icon: <Info className="h-5 w-5 text-blue-600" />,
      iconBg: 'bg-blue-100'
    },
    tip: {
      bg: 'bg-amber-50 border-amber-200',
      icon: <Lightbulb className="h-5 w-5 text-amber-600" />,
      iconBg: 'bg-amber-100'
    },
    new: {
      bg: 'bg-green-50 border-green-200',
      icon: <BookOpen className="h-5 w-5 text-green-600" />,
      iconBg: 'bg-green-100'
    }
  }

  const style = variantStyles[variant]

  return (
    <div className={`rounded-lg border p-4 ${style.bg}`}>
      <div className="flex gap-3">
        <div className={`h-10 w-10 rounded-full ${style.iconBg} flex items-center justify-center flex-shrink-0`}>
          {style.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm">{title}</h4>
            {onDismiss && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mr-2 -mt-1"
                onClick={onDismiss}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>

          {steps && steps.length > 0 && (
            <ol className="mt-3 space-y-1.5">
              {steps.map((step, index) => (
                <li key={index} className="text-xs text-muted-foreground flex gap-2">
                  <span className="font-medium text-foreground">{index + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          )}

          {learnMoreUrl && (
            <a
              href={learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-3"
            >
              <BookOpen className="h-3 w-3" />
              En savoir plus
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * EmptyStateWithHelp - Empty state component with built-in explanation
 *
 * Use this when a section is empty to explain what it's for
 */
interface EmptyStateWithHelpProps {
  icon: React.ReactNode
  title: string
  description: string
  features?: string[]
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyStateWithHelp({
  icon,
  title,
  description,
  features,
  action
}: EmptyStateWithHelpProps) {
  return (
    <div className="text-center py-8 px-4">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h4 className="font-medium text-sm mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        {description}
      </p>

      {features && features.length > 0 && (
        <ul className="mt-4 space-y-1 text-left max-w-xs mx-auto">
          {features.map((feature, index) => (
            <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              {feature}
            </li>
          ))}
        </ul>
      )}

      {action && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
