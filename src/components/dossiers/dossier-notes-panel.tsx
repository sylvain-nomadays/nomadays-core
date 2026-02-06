'use client'

import { useState, useTransition } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  MessageSquare,
  Send,
  Pin,
  MoreHorizontal,
  Edit,
  Trash2,
  Lock,
  StickyNote,
  AtSign,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useUserRole, permissions } from '@/lib/hooks/use-user-role'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { createDossierNote, toggleNotePin, deleteDossierNote } from '@/lib/actions/notes'
import { toast } from 'sonner'

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

interface DossierNotesPanelProps {
  dossierId: string
  notes: DossierNote[]
  personalNotes: DossierNote[]
  nomadaysContactId?: string
  nomadaysContactName?: string
  dmcAdvisorId?: string
  dmcAdvisorName?: string
  currentUserId: string
  onNotesChange?: () => void
}

export function DossierNotesPanel({
  dossierId,
  notes: initialNotes,
  personalNotes: initialPersonalNotes,
  nomadaysContactId,
  nomadaysContactName,
  dmcAdvisorId,
  dmcAdvisorName,
  currentUserId,
  onNotesChange
}: DossierNotesPanelProps) {
  const { role, isNomadays, isDmc } = useUserRole()
  const [isPending, startTransition] = useTransition()
  const [teamNotesOpen, setTeamNotesOpen] = useState(true)
  const [personalNotesOpen, setPersonalNotesOpen] = useState(true)

  // Local state for optimistic updates
  const [notes, setNotes] = useState(initialNotes)
  const [personalNotes, setPersonalNotes] = useState(initialPersonalNotes)

  // Team notes state
  const [newTeamNote, setNewTeamNote] = useState('')
  const [sendingTeamNote, setSendingTeamNote] = useState(false)

  // Personal notes state
  const [newPersonalNote, setNewPersonalNote] = useState('')
  const [sendingPersonalNote, setSendingPersonalNote] = useState(false)

  const canSeeInternalNotes = permissions.canSeeInternalNotes(role)

  // Filter team notes (exclude personal notes)
  const teamNotes = notes.filter(note => !note.is_personal)
  const visibleTeamNotes = teamNotes.filter(note => {
    if (note.is_internal_nomadays && !canSeeInternalNotes) {
      return false
    }
    return true
  })

  const handleSendTeamNote = async () => {
    if (!newTeamNote.trim()) return
    setSendingTeamNote(true)

    // Extract mentions
    const mentionRegex = /@(\w+)/g
    const mentions = [...newTeamNote.matchAll(mentionRegex)].map(m => m[1]).filter((m): m is string => !!m)

    try {
      const newNote = await createDossierNote({
        dossierId,
        content: newTeamNote,
        isInternalNomadays: false,
        isPersonal: false,
        mentions,
      })

      // Optimistic update
      if (newNote) {
        setNotes(prev => [newNote as DossierNote, ...prev])
      }

      setNewTeamNote('')
      toast.success('Note ajoutée')
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

      // Optimistic update
      if (newNote) {
        setPersonalNotes(prev => [newNote as DossierNote, ...prev])
      }

      setNewPersonalNote('')
      toast.success('Note personnelle ajoutée')
      onNotesChange?.()
    } catch (error) {
      console.error('Error sending personal note:', error)
      toast.error('Erreur lors de l\'ajout de la note')
    } finally {
      setSendingPersonalNote(false)
    }
  }

  const handleTogglePin = async (noteId: string, isPinned: boolean) => {
    startTransition(async () => {
      try {
        await toggleNotePin(noteId, !isPinned)
        // Update local state
        setNotes(prev => prev.map(n =>
          n.id === noteId ? { ...n, is_pinned: !isPinned } : n
        ))
        toast.success(isPinned ? 'Note désépinglée' : 'Note épinglée')
      } catch (error) {
        toast.error('Erreur lors de la mise à jour')
      }
    })
  }

  const handleDeleteNote = async (noteId: string, isPersonal: boolean) => {
    startTransition(async () => {
      try {
        await deleteDossierNote(noteId, dossierId)
        // Update local state
        if (isPersonal) {
          setPersonalNotes(prev => prev.filter(n => n.id !== noteId))
        } else {
          setNotes(prev => prev.filter(n => n.id !== noteId))
        }
        toast.success('Note supprimée')
        onNotesChange?.()
      } catch (error) {
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
    <div className="space-y-4 h-full flex flex-col">
      {/* Team Notes Section - Nomadays <-> DMC */}
      <Collapsible open={teamNotesOpen} onOpenChange={setTeamNotesOpen} className="flex-1">
        <Card className="h-full flex flex-col">
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Notes de suivi
                  <HelpTooltip title="Notes de suivi" size="sm">
                    Échangez avec le support Nomadays ou le manager DMC sur ce dossier.
                    Utilisez @manager pour envoyer une notification.
                  </HelpTooltip>
                  {visibleTeamNotes.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {visibleTeamNotes.length}
                    </Badge>
                  )}
                </div>
                {teamNotesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CardTitle>
              {/* Contact info */}
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                {nomadaysContactName && (
                  <span>Support: <strong>{nomadaysContactName}</strong></span>
                )}
                {dmcAdvisorName && (
                  <span>Manager: <strong>{dmcAdvisorName}</strong></span>
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent className="flex-1 flex flex-col">
            <CardContent className="space-y-3 flex-1 flex flex-col pt-2">
              {/* Input for new team note */}
              <div className="space-y-2">
                <div className="relative">
                  <Textarea
                    placeholder="Écrire une note... Utilisez @manager pour notifier"
                    value={newTeamNote}
                    onChange={(e) => setNewTeamNote(e.target.value)}
                    className="min-h-[60px] resize-none pr-10 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        handleSendTeamNote()
                      }
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 bottom-1 h-7 w-7"
                    onClick={insertMention}
                    title="Mentionner le manager"
                  >
                    <AtSign className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleSendTeamNote}
                    disabled={!newTeamNote.trim() || sendingTeamNote}
                  >
                    {sendingTeamNote ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3 mr-1" />
                    )}
                    Envoyer
                  </Button>
                </div>
              </div>

              {/* Notes list */}
              <div className="flex-1 overflow-auto space-y-2 max-h-[300px]">
                {visibleTeamNotes.length > 0 ? (
                  visibleTeamNotes
                    .sort((a, b) => {
                      // Pinned first, then by date
                      if (a.is_pinned && !b.is_pinned) return -1
                      if (!a.is_pinned && b.is_pinned) return 1
                      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    })
                    .map((note) => (
                      <NoteItem
                        key={note.id}
                        note={note}
                        getRoleBadge={getRoleBadge}
                        onTogglePin={() => handleTogglePin(note.id, note.is_pinned)}
                        onDelete={() => handleDeleteNote(note.id, false)}
                        isPending={isPending}
                        compact
                      />
                    ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Aucune note
                  </p>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Personal Notes Section - For the current user only */}
      <Collapsible open={personalNotesOpen} onOpenChange={setPersonalNotesOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  Mes notes personnelles
                  <HelpTooltip title="Notes personnelles" size="sm">
                    Ces notes ne sont visibles que par vous. Idéal pour vos rappels et pense-bêtes sur ce dossier.
                  </HelpTooltip>
                  {personalNotes.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {personalNotes.length}
                    </Badge>
                  )}
                </div>
                {personalNotesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Visible uniquement par vous
              </p>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3 pt-2">
              {/* Input for personal note */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Note pour moi-même..."
                  value={newPersonalNote}
                  onChange={(e) => setNewPersonalNote(e.target.value)}
                  className="min-h-[50px] resize-none text-sm"
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
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <StickyNote className="h-3 w-3 mr-1" />
                    )}
                    Ajouter
                  </Button>
                </div>
              </div>

              {/* Personal notes list */}
              <div className="space-y-2 max-h-[200px] overflow-auto">
                {personalNotes.length > 0 ? (
                  personalNotes
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((note) => (
                      <div
                        key={note.id}
                        className="p-2 rounded-lg bg-amber-50/50 border border-amber-200/50 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm flex-1">{note.content}</p>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                              >
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteNote(note.id, true)}
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: fr })}
                        </p>
                      </div>
                    ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Aucune note personnelle
                  </p>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  )
}

function NoteItem({
  note,
  getRoleBadge,
  onTogglePin,
  onDelete,
  isPending,
  compact = false
}: {
  note: DossierNote
  getRoleBadge: (role: string) => React.ReactNode
  onTogglePin: () => void
  onDelete: () => void
  isPending: boolean
  compact?: boolean
}) {
  // Highlight mentions
  const renderContent = (content: string) => {
    const parts = content.split(/(@\w+)/g)
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="bg-primary/10 text-primary px-1 rounded">
            {part}
          </span>
        )
      }
      return part
    })
  }

  return (
    <div className={`p-2 rounded-lg border ${note.is_internal_nomadays ? 'bg-yellow-50/50 border-yellow-200' : 'bg-card'} group`}>
      <div className="flex items-start gap-2">
        <Avatar className={compact ? "h-6 w-6" : "h-8 w-8"}>
          <AvatarImage src={note.author.avatar_url || undefined} />
          <AvatarFallback className="text-xs">
            {note.author.first_name?.[0]}{note.author.last_name?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5 flex-wrap">
            <span className="text-xs font-medium">
              {note.author.first_name}
            </span>
            {getRoleBadge(note.author.role)}
            {note.is_internal_nomadays && (
              <Lock className="h-3 w-3 text-yellow-600" />
            )}
            {note.is_pinned && (
              <Pin className="h-3 w-3 text-primary fill-primary" />
            )}
          </div>
          <p className="text-xs whitespace-pre-wrap">{renderContent(note.content)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: fr })}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onTogglePin} disabled={isPending}>
              <Pin className="h-3 w-3 mr-2" />
              {note.is_pinned ? 'Désépingler' : 'Épingler'}
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
