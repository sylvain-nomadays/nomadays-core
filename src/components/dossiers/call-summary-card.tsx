'use client'

import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Phone,
  Play,
  Clock,
  CheckCircle2,
  Circle,
  User,
  Building2,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'

// ============================================================
// TYPES (for future telephony integration)
// ============================================================

export interface CallSummary {
  id: string
  dossier_id: string
  call_date: string
  duration_seconds: number
  caller_name: string
  caller_type: 'advisor' | 'client' | 'supplier'
  callee_name: string
  callee_type: 'advisor' | 'client' | 'supplier'
  ai_summary: string
  extracted_tasks: CallTask[]
  audio_url?: string
  created_at: string
}

export interface CallTask {
  id: string
  description: string
  is_completed: boolean
  assigned_to?: string
}

// ============================================================
// CALL SUMMARIES SECTION (placeholder)
// ============================================================

export function CallSummariesSection({ dossierId }: { dossierId: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Appels & transcriptions
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Bientot
          </Badge>
        </CardTitle>
        <CardDescription>
          Enregistrements, transcriptions et analyses IA de vos appels avec le client
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="relative mb-4">
            <Phone className="h-12 w-12 text-muted-foreground/20" />
            <Sparkles className="h-5 w-5 text-primary/40 absolute -top-1 -right-1" />
          </div>
          <h3 className="text-base font-medium mb-2">Bientot disponible</h3>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            Chaque appel sera automatiquement transcrit et resume par l&apos;IA,
            avec extraction des taches a suivre et des points importants.
          </p>
          <div className="flex items-center gap-6 mt-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              Enregistrement
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Resume IA
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Taches extraites
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// CALL SUMMARY CARD (for future use)
// ============================================================

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function getParticipantIcon(type: 'advisor' | 'client' | 'supplier') {
  switch (type) {
    case 'advisor': return <Building2 className="h-3 w-3" />
    case 'client': return <User className="h-3 w-3" />
    case 'supplier': return <Building2 className="h-3 w-3" />
  }
}

export function CallSummaryCard({ summary }: { summary: CallSummary }) {
  return (
    <div className="p-4 rounded-lg border bg-card space-y-3">
      {/* Header: date + duration */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-primary" />
          <span className="font-medium">
            {format(new Date(summary.call_date), 'dd MMM yyyy a HH:mm', { locale: fr })}
          </span>
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {formatDuration(summary.duration_seconds)}
          </Badge>
        </div>
        {summary.audio_url && (
          <Button variant="outline" size="sm" disabled>
            <Play className="h-3 w-3 mr-1" />
            Ecouter
          </Button>
        )}
      </div>

      {/* Participants */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          {getParticipantIcon(summary.caller_type)}
          {summary.caller_name}
        </div>
        <span>→</span>
        <div className="flex items-center gap-1">
          {getParticipantIcon(summary.callee_type)}
          {summary.callee_name}
        </div>
      </div>

      {/* AI Summary */}
      <div className="bg-primary/5 rounded-md p-3 border border-primary/10">
        <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-1.5">
          <Sparkles className="h-3 w-3" />
          Resume IA
        </div>
        <p className="text-sm leading-relaxed">{summary.ai_summary}</p>
      </div>

      {/* Extracted Tasks */}
      {summary.extracted_tasks.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Taches extraites ({summary.extracted_tasks.length})
          </h4>
          <div className="space-y-1">
            {summary.extracted_tasks.map((task) => (
              <div key={task.id} className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={task.is_completed}
                  disabled
                  className="mt-0.5"
                />
                <span className={task.is_completed ? 'line-through text-muted-foreground' : ''}>
                  {task.description}
                </span>
                {task.assigned_to && (
                  <Badge variant="outline" className="text-xs ml-auto">
                    {task.assigned_to}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
