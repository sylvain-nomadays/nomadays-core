'use client'

import { useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  MessageSquare,
  Send,
  Pin,
  MoreHorizontal,
  Edit,
  Trash2,
  Lock,
  Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUserRole, permissions } from '@/lib/hooks/use-user-role'

interface DossierNote {
  id: string
  content: string
  is_internal_nomadays: boolean
  is_pinned: boolean
  created_at: string
  author: {
    id: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
    role: string
  }
}

interface DossierNotesSectionProps {
  dossierId: string
  notes: DossierNote[]
  nomadaysContactName?: string
  dmcAdvisorName?: string
}

export function DossierNotesSection({
  dossierId,
  notes,
  nomadaysContactName,
  dmcAdvisorName
}: DossierNotesSectionProps) {
  const { role, isNomadays, isDmc } = useUserRole()
  const [newNote, setNewNote] = useState('')
  const [isInternalOnly, setIsInternalOnly] = useState(false)
  const [sending, setSending] = useState(false)

  const canSeeInternalNotes = permissions.canSeeInternalNotes(role)

  // Filter notes based on role
  const visibleNotes = notes.filter(note => {
    if (note.is_internal_nomadays && !canSeeInternalNotes) {
      return false
    }
    return true
  })

  // Separate pinned and regular notes
  const pinnedNotes = visibleNotes.filter(n => n.is_pinned)
  const regularNotes = visibleNotes.filter(n => !n.is_pinned)

  const handleSendNote = async () => {
    if (!newNote.trim()) return
    setSending(true)
    try {
      // TODO: Implement API call
      console.log('Sending note:', { content: newNote, isInternalOnly })
      setNewNote('')
      setIsInternalOnly(false)
    } catch (error) {
      console.error('Error sending note:', error)
    } finally {
      setSending(false)
    }
  }

  const getRoleBadge = (authorRole: string) => {
    if (['admin_nomadays', 'support_nomadays'].includes(authorRole)) {
      return (
        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
          Nomadays
        </Badge>
      )
    }
    if (['dmc_manager', 'dmc_seller'].includes(authorRole)) {
      return (
        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600 border-orange-200">
          DMC
        </Badge>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Notes de suivi
        </CardTitle>
        {/* Show contact info */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
          {nomadaysContactName && (
            <span>Contact Nomadays: <strong>{nomadaysContactName}</strong></span>
          )}
          {dmcAdvisorName && (
            <span>Conseiller DMC: <strong>{dmcAdvisorName}</strong></span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New note input */}
        <div className="space-y-3">
          <Textarea
            placeholder="Écrire une note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          <div className="flex items-center justify-between">
            {isNomadays && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="internal"
                  checked={isInternalOnly}
                  onCheckedChange={(checked) => setIsInternalOnly(checked as boolean)}
                />
                <Label htmlFor="internal" className="text-sm text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Note interne Nomadays uniquement
                </Label>
              </div>
            )}
            <Button
              size="sm"
              onClick={handleSendNote}
              disabled={!newNote.trim() || sending}
              className="ml-auto"
            >
              <Send className="h-4 w-4 mr-2" />
              Envoyer
            </Button>
          </div>
        </div>

        {/* Pinned notes */}
        {pinnedNotes.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Pin className="h-3 w-3" />
              Notes épinglées
            </h4>
            {pinnedNotes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                canSeeInternalNotes={canSeeInternalNotes}
                getRoleBadge={getRoleBadge}
              />
            ))}
          </div>
        )}

        {/* Regular notes */}
        {regularNotes.length > 0 ? (
          <div className="space-y-2">
            {pinnedNotes.length > 0 && (
              <h4 className="text-xs font-medium text-muted-foreground">
                Autres notes
              </h4>
            )}
            {regularNotes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                canSeeInternalNotes={canSeeInternalNotes}
                getRoleBadge={getRoleBadge}
              />
            ))}
          </div>
        ) : pinnedNotes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune note pour le moment
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function NoteItem({
  note,
  canSeeInternalNotes,
  getRoleBadge
}: {
  note: DossierNote
  canSeeInternalNotes: boolean
  getRoleBadge: (role: string) => React.ReactNode
}) {
  return (
    <div className={`p-3 rounded-lg border ${note.is_internal_nomadays ? 'bg-yellow-50/50 border-yellow-200' : 'bg-card'}`}>
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={note.author.avatar_url || undefined} />
          <AvatarFallback className="text-xs">
            {note.author.first_name?.[0]}{note.author.last_name?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">
              {note.author.first_name} {note.author.last_name}
            </span>
            {getRoleBadge(note.author.role)}
            {note.is_internal_nomadays && (
              <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300">
                <Lock className="h-3 w-3 mr-1" />
                Interne
              </Badge>
            )}
            {note.is_pinned && (
              <Pin className="h-3 w-3 text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: fr })}
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{note.content}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Pin className="h-4 w-4 mr-2" />
              {note.is_pinned ? 'Désépingler' : 'Épingler'}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
