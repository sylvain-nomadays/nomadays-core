'use client'

import { useState, useEffect, useTransition } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  MessageSquare,
  Send,
  Pin,
  MoreHorizontal,
  Trash2,
  Lock,
  StickyNote,
  AtSign,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUserRole, permissions } from '@/lib/hooks/use-user-role'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { createDossierNote, toggleNotePin, deleteDossierNote } from '@/lib/actions/notes'
import { toast } from 'sonner'
import { CallSummariesSection } from './call-summary-card'

// ============================================================
// TYPES
// ============================================================

interface DossierNote {
  id: string
  content: string
  is_internal_nomadays: boolean
  is_personal: boolean
  is_pinned: boolean
  mentions?: string[]
  created_at: string
  author: {
    id: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
    role: string
  }
}

interface DossierNotesFullSectionProps {
  dossierId: string
  notes: {
    teamNotes: DossierNote[]
    personalNotes: DossierNote[]
  }
  nomadaysContactId?: string
  nomadaysContactName?: string
  dmcAdvisorId?: string
  dmcAdvisorName?: string
  currentUserId: string
  onNotesChange?: () => void
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function DossierNotesFullSection({
  dossierId,
  notes: notesProp,
  nomadaysContactName,
  dmcAdvisorName,
  currentUserId,
  onNotesChange,
}: DossierNotesFullSectionProps) {
  const { role, isNomadays } = useUserRole()
  const [isPending, startTransition] = useTransition()

  // Local state for optimistic updates
  const [teamNotes, setTeamNotes] = useState(notesProp.teamNotes)
  const [personalNotes, setPersonalNotes] = useState(notesProp.personalNotes)

  // Sync from parent when props change (e.g. sidebar creates a note)
  useEffect(() => {
    setTeamNotes(notesProp.teamNotes)
  }, [notesProp.teamNotes])

  useEffect(() => {
    setPersonalNotes(notesProp.personalNotes)
  }, [notesProp.personalNotes])

  // Team notes input
  const [newTeamNote, setNewTeamNote] = useState('')
  const [isInternalOnly, setIsInternalOnly] = useState(false)
  const [sendingTeamNote, setSendingTeamNote] = useState(false)

  // Personal notes input
  const [newPersonalNote, setNewPersonalNote] = useState('')
  const [sendingPersonalNote, setSendingPersonalNote] = useState(false)

  const canSeeInternalNotes = permissions.canSeeInternalNotes(role)

  // Filter team notes
  const visibleTeamNotes = teamNotes.filter(note => {
    if (note.is_personal) return false
    if (note.is_internal_nomadays && !canSeeInternalNotes) return false
    return true
  })

  const pinnedNotes = visibleTeamNotes.filter(n => n.is_pinned)
  const regularNotes = visibleTeamNotes
    .filter(n => !n.is_pinned)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // ---- Handlers ----

  const handleSendTeamNote = async () => {
    if (!newTeamNote.trim()) return
    setSendingTeamNote(true)

    const mentionRegex = /@(\w+)/g
    const mentions = [...newTeamNote.matchAll(mentionRegex)].map(m => m[1]).filter((m): m is string => !!m)

    try {
      const newNote = await createDossierNote({
        dossierId,
        content: newTeamNote,
        isInternalNomadays: isInternalOnly,
        isPersonal: false,
        mentions,
      })

      if (newNote) {
        setTeamNotes(prev => [newNote as DossierNote, ...prev])
      }

      setNewTeamNote('')
      setIsInternalOnly(false)
      toast.success('Note ajoutee')
      onNotesChange?.()
    } catch (error) {
      console.error('Error sending note:', error)
      toast.error('Erreur lors de l\'ajout de la note')
    } finally {
      setSendingTeamNote(false)
    }
  }

  const handleSendPersonalNote = async () => {
    if (!newPersonalNote.trim()) return
    setSendingPersonalNote(true)

    try {
      const newNote = await createDossierNote({
        dossierId,
        content: newPersonalNote,
        isPersonal: true,
      })

      if (newNote) {
        setPersonalNotes(prev => [newNote as DossierNote, ...prev])
      }

      setNewPersonalNote('')
      toast.success('Note personnelle ajoutee')
      onNotesChange?.()
    } catch (error) {
      console.error('Error sending personal note:', error)
      toast.error('Erreur lors de l\'ajout de la note')
    } finally {
      setSendingPersonalNote(false)
    }
  }

  const handleTogglePin = async (noteId: string, currentlyPinned: boolean) => {
    startTransition(async () => {
      try {
        await toggleNotePin(noteId, !currentlyPinned)
        setTeamNotes(prev => prev.map(n =>
          n.id === noteId ? { ...n, is_pinned: !currentlyPinned } : n
        ))
        toast.success(currentlyPinned ? 'Note desepinglee' : 'Note epinglee')
      } catch {
        toast.error('Erreur lors de la mise a jour')
      }
    })
  }

  const handleDeleteNote = async (noteId: string, isPersonal: boolean) => {
    startTransition(async () => {
      try {
        await deleteDossierNote(noteId, dossierId)
        if (isPersonal) {
          setPersonalNotes(prev => prev.filter(n => n.id !== noteId))
        } else {
          setTeamNotes(prev => prev.filter(n => n.id !== noteId))
        }
        toast.success('Note supprimee')
        onNotesChange?.()
      } catch {
        toast.error('Erreur lors de la suppression')
      }
    })
  }

  const insertMention = () => {
    if (dmcAdvisorName) {
      setNewTeamNote(prev => prev + `@${dmcAdvisorName.split(' ')[0]} `)
    } else {
      setNewTeamNote(prev => prev + '@manager ')
    }
  }

  // ---- Render ----

  return (
    <div className="space-y-6">
      {/* Two columns: Team Notes (2/3) + Personal Notes (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ======== TEAM NOTES (2/3 width) ======== */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Notes d&apos;equipe
              <HelpTooltip title="Notes d'equipe" size="sm">
                Echangez avec le support Nomadays ou le manager DMC.
                Utilisez @manager pour envoyer une notification.
              </HelpTooltip>
              {visibleTeamNotes.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {visibleTeamNotes.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="flex items-center gap-4">
              {nomadaysContactName && (
                <span>Support: <strong>{nomadaysContactName}</strong></span>
              )}
              {dmcAdvisorName && (
                <span>Manager: <strong>{dmcAdvisorName}</strong></span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Input for new team note */}
            <div className="space-y-3">
              <div className="relative">
                <Textarea
                  placeholder="Ecrire une note... Utilisez @manager pour notifier"
                  value={newTeamNote}
                  onChange={(e) => setNewTeamNote(e.target.value)}
                  className="min-h-[80px] resize-none pr-10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleSendTeamNote()
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 bottom-2 h-7 w-7"
                  onClick={insertMention}
                  title="Mentionner le manager"
                >
                  <AtSign className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                {isNomadays && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="internal-full"
                      checked={isInternalOnly}
                      onCheckedChange={(checked) => setIsInternalOnly(checked as boolean)}
                    />
                    <Label htmlFor="internal-full" className="text-sm text-muted-foreground flex items-center gap-1 cursor-pointer">
                      <Lock className="h-3 w-3" />
                      Note interne Nomadays uniquement
                    </Label>
                  </div>
                )}
                <Button
                  size="sm"
                  onClick={handleSendTeamNote}
                  disabled={!newTeamNote.trim() || sendingTeamNote}
                  className="ml-auto"
                >
                  {sendingTeamNote ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-1.5" />
                  )}
                  Envoyer
                </Button>
              </div>
            </div>

            {/* Pinned notes */}
            {pinnedNotes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Pin className="h-3 w-3" />
                  Notes epinglees
                </h4>
                {pinnedNotes.map((note) => (
                  <FullNoteItem
                    key={note.id}
                    note={note}
                    onTogglePin={() => handleTogglePin(note.id, note.is_pinned)}
                    onDelete={() => handleDeleteNote(note.id, false)}
                    isPending={isPending}
                  />
                ))}
              </div>
            )}

            {(pinnedNotes.length > 0 && regularNotes.length > 0) && (
              <Separator />
            )}

            {/* Regular notes */}
            <div className="space-y-2">
              {regularNotes.length > 0 ? (
                regularNotes.map((note) => (
                  <FullNoteItem
                    key={note.id}
                    note={note}
                    onTogglePin={() => handleTogglePin(note.id, note.is_pinned)}
                    onDelete={() => handleDeleteNote(note.id, false)}
                    isPending={isPending}
                  />
                ))
              ) : pinnedNotes.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    Aucune note pour le moment
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ecrivez une note ci-dessus pour demarrer la conversation
                  </p>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* ======== PERSONAL NOTES (1/3 width) ======== */}
        <Card className="lg:col-span-1 border-amber-200/50 bg-amber-50/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Mes notes personnelles
              <HelpTooltip title="Notes personnelles" size="sm">
                Ces notes ne sont visibles que par vous.
                Ideal pour vos rappels et pense-betes sur ce dossier.
              </HelpTooltip>
              {personalNotes.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {personalNotes.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Visible uniquement par vous
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Input for personal note */}
            <div className="space-y-2">
              <Textarea
                placeholder="Note pour moi-meme..."
                value={newPersonalNote}
                onChange={(e) => setNewPersonalNote(e.target.value)}
                className="min-h-[60px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSendPersonalNote()
                  }
                }}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleSendPersonalNote}
                  disabled={!newPersonalNote.trim() || sendingPersonalNote}
                >
                  {sendingPersonalNote ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <StickyNote className="h-4 w-4 mr-1.5" />
                  )}
                  Ajouter
                </Button>
              </div>
            </div>

            {/* Personal notes list */}
            <div className="space-y-2">
              {personalNotes.length > 0 ? (
                personalNotes
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-lg bg-amber-50/50 border border-amber-200/50 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm flex-1 whitespace-pre-wrap">{note.content}</p>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
                            >
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteNote(note.id, true)}
                              disabled={isPending}
                            >
                              <Trash2 className="h-3 w-3 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                  ))
              ) : (
                <div className="text-center py-6">
                  <StickyNote className="h-6 w-6 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">
                    Aucune note personnelle
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ======== CALL SUMMARIES (full width) ======== */}
      <CallSummariesSection dossierId={dossierId} />
    </div>
  )
}

// ============================================================
// FULL NOTE ITEM (larger version for the full tab)
// ============================================================

function FullNoteItem({
  note,
  onTogglePin,
  onDelete,
  isPending,
}: {
  note: DossierNote
  onTogglePin: () => void
  onDelete: () => void
  isPending: boolean
}) {
  // Highlight mentions
  const renderContent = (content: string) => {
    const parts = content.split(/(@\w+)/g)
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="bg-primary/10 text-primary px-1 rounded font-medium">
            {part}
          </span>
        )
      }
      return part
    })
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
    <div className={`p-3 rounded-lg border ${note.is_internal_nomadays ? 'bg-yellow-50/50 border-yellow-200' : 'bg-card'} group`}>
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={note.author.avatar_url || undefined} />
          <AvatarFallback className="text-xs">
            {note.author.first_name?.[0]}{note.author.last_name?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
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
              <Pin className="h-3 w-3 text-primary fill-primary" />
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: fr })}
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{renderContent(note.content)}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 flex-shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onTogglePin} disabled={isPending}>
              <Pin className="h-3 w-3 mr-2" />
              {note.is_pinned ? 'Desepingler' : 'Epingler'}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={onDelete} disabled={isPending}>
              <Trash2 className="h-3 w-3 mr-2" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
