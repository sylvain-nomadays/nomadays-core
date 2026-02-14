'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  MessageSquare,
  Send,
  Pin,
  MoreHorizontal,
  Trash2,
  AtSign,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  createTripNote,
  getTripNotes,
  deleteTripNote,
  toggleTripNotePin,
} from '@/lib/actions/trip-notes';
import type { TripNote } from '@/lib/actions/trip-notes';
import { toast } from 'sonner';

// ─── Props ───────────────────────────────────────────────────────────────────

interface TripNotesPanelProps {
  tripId: number;
  tenantId: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TripNotesPanel({ tripId, tenantId }: TripNotesPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState<TripNote[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [sendingNote, setSendingNote] = useState(false);

  // Load notes on mount
  const loadNotes = useCallback(async () => {
    try {
      const data = await getTripNotes(tripId, tenantId);
      setNotes(data);
    } catch (error) {
      console.error('Error loading trip notes:', error);
    } finally {
      setIsLoadingNotes(false);
    }
  }, [tripId, tenantId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Separate pinned and regular notes
  const pinnedNotes = notes.filter(n => n.is_pinned);
  const regularNotes = notes
    .filter(n => !n.is_pinned)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // ── Handlers ──

  const handleSendNote = async () => {
    if (!newNote.trim()) return;
    setSendingNote(true);

    // Extract @mentions
    const mentionRegex = /@(\w+)/g;
    const mentions = [...newNote.matchAll(mentionRegex)].map(m => m[1]).filter((m): m is string => !!m);

    try {
      const created = await createTripNote({
        tripId,
        tenantId,
        content: newNote,
        mentions,
      });

      if (created) {
        setNotes(prev => [created, ...prev]);
      }

      setNewNote('');
      toast.success('Note ajoutée');
    } catch (error) {
      console.error('Error creating note:', error);
      toast.error("Erreur lors de l'ajout de la note");
    } finally {
      setSendingNote(false);
    }
  };

  const handleTogglePin = async (noteId: string, currentlyPinned: boolean) => {
    startTransition(async () => {
      try {
        await toggleTripNotePin(noteId, !currentlyPinned, tripId);
        setNotes(prev => prev.map(n =>
          n.id === noteId ? { ...n, is_pinned: !currentlyPinned } : n
        ));
        toast.success(currentlyPinned ? 'Note désépinglée' : 'Note épinglée');
      } catch {
        toast.error('Erreur lors de la mise à jour');
      }
    });
  };

  const handleDeleteNote = async (noteId: string) => {
    startTransition(async () => {
      try {
        await deleteTripNote(noteId, tripId);
        setNotes(prev => prev.filter(n => n.id !== noteId));
        toast.success('Note supprimée');
      } catch {
        toast.error('Erreur lors de la suppression');
      }
    });
  };

  // ── Render ──

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 260px)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-gray-600" />
        <h3 className="text-sm font-semibold text-gray-800">
          Notes d&apos;échange
        </h3>
        {notes.length > 0 && (
          <Badge variant="secondary" className="text-xs ml-auto">
            {notes.length}
          </Badge>
        )}
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="relative">
          <Textarea
            placeholder="Écrire une note... @nom pour mentionner"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-[68px] resize-none pr-10 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSendNote();
              }
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 bottom-2 h-6 w-6"
            onClick={() => setNewNote(prev => prev + '@')}
            title="Mentionner quelqu'un"
          >
            <AtSign className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">
            Ctrl+Entrée pour envoyer
          </span>
          <Button
            size="sm"
            onClick={handleSendNote}
            disabled={!newNote.trim() || sendingNote}
          >
            {sendingNote ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5 mr-1.5" />
            )}
            Envoyer
          </Button>
        </div>
      </div>

      {/* Notes list (scrollable) */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {isLoadingNotes ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-[#0FB6BC] animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-gray-400">
              Aucune note pour le moment
            </p>
            <p className="text-xs text-gray-300 mt-1">
              Démarrez la conversation ci-dessus
            </p>
          </div>
        ) : (
          <>
            {/* Pinned notes */}
            {pinnedNotes.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                  <Pin className="w-3 h-3" />
                  Notes épinglées
                </div>
                {pinnedNotes.map(note => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    onTogglePin={() => handleTogglePin(note.id, note.is_pinned)}
                    onDelete={() => handleDeleteNote(note.id)}
                    isPending={isPending}
                  />
                ))}
                {regularNotes.length > 0 && <Separator />}
              </>
            )}

            {/* Regular notes */}
            {regularNotes.map(note => (
              <NoteItem
                key={note.id}
                note={note}
                onTogglePin={() => handleTogglePin(note.id, note.is_pinned)}
                onDelete={() => handleDeleteNote(note.id)}
                isPending={isPending}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Note Item ───────────────────────────────────────────────────────────────

function NoteItem({
  note,
  onTogglePin,
  onDelete,
  isPending,
}: {
  note: TripNote;
  onTogglePin: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  // Highlight @mentions
  const renderContent = (content: string) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="bg-[#0FB6BC]/10 text-[#0C9296] px-1 rounded font-medium">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const getRoleBadge = (authorRole: string) => {
    if (['admin_nomadays', 'support_nomadays'].includes(authorRole)) {
      return (
        <Badge variant="outline" className="text-[10px] bg-[#0FB6BC]/10 text-[#0C9296] border-[#0FB6BC]/30">
          Nomadays
        </Badge>
      );
    }
    if (['dmc_manager', 'dmc_seller'].includes(authorRole)) {
      return (
        <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-600 border-orange-200">
          DMC
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className={`p-2.5 rounded-lg border ${note.is_pinned ? 'bg-[#0FB6BC]/5 border-[#0FB6BC]/20' : 'bg-white border-gray-100'} group`}>
      <div className="flex items-start gap-2.5">
        <Avatar className="h-7 w-7 flex-shrink-0">
          <AvatarImage src={note.author.avatar_url || undefined} />
          <AvatarFallback className="text-[10px]">
            {note.author.first_name?.[0]}{note.author.last_name?.[0]}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className="text-xs font-medium text-gray-800">
              {note.author.first_name} {note.author.last_name}
            </span>
            {getRoleBadge(note.author.role)}
            {note.is_pinned && (
              <Pin className="w-3 h-3 text-[#0FB6BC] fill-[#0FB6BC]" />
            )}
            <span className="text-[10px] text-gray-400 ml-auto">
              {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: fr })}
            </span>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {renderContent(note.content)}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
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
  );
}
