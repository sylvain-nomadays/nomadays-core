'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { getDossierMessages, sendClientMessage, type Message } from '@/lib/actions/messaging'
import { cn } from '@/lib/utils'
import {
  MessageSquare,
  Send,
  Loader2,
  User,
  Building2,
  PenSquare,
} from 'lucide-react'

interface ClientMessagingSectionProps {
  dossierId: string
  participantId: string
  participantEmail: string
  participantName: string
  advisorEmail: string
  advisorName: string
}

export function ClientMessagingSection({
  dossierId,
  participantId,
  participantEmail,
  participantName,
  advisorEmail,
  advisorName,
}: ClientMessagingSectionProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [showCompose, setShowCompose] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()
  }, [dossierId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadMessages = async () => {
    try {
      const data = await getDossierMessages(dossierId)
      setMessages(data)
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async () => {
    if (!body.trim()) return

    setSending(true)
    try {
      await sendClientMessage({
        dossierId,
        participantId,
        participantEmail,
        participantName,
        advisorEmail,
        advisorName,
        subject: subject || undefined,
        bodyText: body,
      })

      setShowCompose(false)
      setSubject('')
      setBody('')
      await loadMessages()
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleReply = (message: Message) => {
    setSubject(`Re: ${message.subject || 'Votre message'}`)
    setShowCompose(true)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    } else if (diffDays === 1) {
      return `Hier à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    } else if (diffDays < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        hour: '2-digit',
        minute: '2-digit',
      })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Messages
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Échangez avec {advisorName}
            </p>
          </div>
          <Button onClick={() => setShowCompose(true)}>
            <PenSquare className="h-4 w-4 mr-2" />
            Nouveau message
          </Button>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun message pour le moment</p>
              <p className="text-sm text-muted-foreground mt-1">
                Envoyez un message à votre conseiller
              </p>
              <Button className="mt-4" onClick={() => setShowCompose(true)}>
                <PenSquare className="h-4 w-4 mr-2" />
                Écrire un message
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {messages.map((message) => {
                  const isFromClient = message.direction === 'inbound'

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        'flex gap-3',
                        isFromClient ? 'flex-row-reverse' : 'flex-row'
                      )}
                    >
                      {/* Avatar */}
                      <div
                        className={cn(
                          'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                          isFromClient
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        {isFromClient ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Building2 className="h-4 w-4" />
                        )}
                      </div>

                      {/* Message bubble */}
                      <div
                        className={cn(
                          'max-w-[75%] rounded-lg p-3',
                          isFromClient
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">
                            {isFromClient ? 'Vous' : message.sender_name || advisorName}
                          </span>
                          <span
                            className={cn(
                              'text-xs',
                              isFromClient
                                ? 'text-primary-foreground/70'
                                : 'text-muted-foreground'
                            )}
                          >
                            {formatDate(message.created_at)}
                          </span>
                        </div>

                        {/* Subject */}
                        {message.subject && (
                          <p
                            className={cn(
                              'text-sm font-medium mb-1',
                              isFromClient
                                ? 'text-primary-foreground'
                                : 'text-foreground'
                            )}
                          >
                            {message.subject}
                          </p>
                        )}

                        {/* Body */}
                        <p
                          className={cn(
                            'text-sm whitespace-pre-wrap',
                            isFromClient
                              ? 'text-primary-foreground'
                              : 'text-foreground'
                          )}
                        >
                          {message.body_text}
                        </p>

                        {/* Reply button for advisor messages */}
                        {!isFromClient && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 h-7 text-xs"
                            onClick={() => handleReply(message)}
                          >
                            Répondre
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Dialog de composition */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouveau message</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Destinataire */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">À</label>
              <p className="text-sm">{advisorName} ({advisorEmail})</p>
            </div>

            {/* Sujet */}
            <div>
              <label className="text-sm font-medium">Sujet (optionnel)</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Objet de votre message"
                className="mt-1"
              />
            </div>

            {/* Corps du message */}
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Écrivez votre message ici..."
                rows={10}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompose(false)}>
              Annuler
            </Button>
            <Button onClick={handleSend} disabled={sending || !body.trim()}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
