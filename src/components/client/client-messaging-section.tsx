'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getDossierMessages, sendClientMessage, markMessageAsRead, type Message } from '@/lib/actions/messaging'
import { cn } from '@/lib/utils'
import {
  MessageSquare,
  Send,
  Loader2,
  User,
  Building2,
  ChevronDown,
  Check,
  CheckCheck,
  Paperclip,
  AlertCircle,
  RefreshCw,
  Download,
} from 'lucide-react'
import type { ContinentTheme } from './continent-theme'

// ─── Default theme (turquoise Nomadays) for fallback ─────────────────────────

const DEFAULT_THEME: ContinentTheme = {
  continent: 'default',
  primary: '#0FB6BC',
  accent: '#DD9371',
  light: '#F0FAFA',
  gradient: 'from-[#0FB6BC] to-[#DD9371]',
  label: 'Voyage',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateString: string) {
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

/** Check if two messages are from the same sender and within 5 minutes */
function isGroupedWithPrev(messages: Message[], index: number): boolean {
  if (index === 0) return false
  const curr = messages[index]
  const prev = messages[index - 1]
  if (!curr || !prev) return false
  if (curr.direction !== prev.direction) return false
  if (curr.sender_email !== prev.sender_email) return false
  const diffMs = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime()
  return diffMs < 5 * 60 * 1000
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface ClientMessagingSectionProps {
  dossierId: string
  participantId: string
  participantEmail: string
  participantName: string
  advisorEmail: string
  advisorName: string
  continentTheme?: ContinentTheme
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ClientMessagingSection({
  dossierId,
  participantId,
  participantEmail,
  participantName,
  advisorEmail,
  advisorName,
  continentTheme,
}: ClientMessagingSectionProps) {
  const theme = continentTheme ?? DEFAULT_THEME
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [showSubject, setShowSubject] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const markedAsReadRef = useRef<Set<string>>(new Set())
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Load messages ─────────────────────────────────────────────────────────

  const loadMessages = useCallback(async () => {
    try {
      const data = await getDossierMessages(dossierId)
      setMessages(data)
      return data
    } catch (error) {
      console.error('Error loading messages:', error)
      return null
    } finally {
      setLoading(false)
    }
  }, [dossierId])

  // ── Mark advisor messages as read ─────────────────────────────────────────

  const markAdvisorMessagesRead = useCallback(async (msgs: Message[]) => {
    const unreadAdvisorMsgs = msgs.filter(
      (m) => m.direction === 'outbound' && !m.read_at && !markedAsReadRef.current.has(m.id)
    )
    for (const msg of unreadAdvisorMsgs) {
      markedAsReadRef.current.add(msg.id)
      try {
        await markMessageAsRead(msg.id)
      } catch {
        // Silent — don't block UX for read receipts
      }
    }
  }, [])

  // ── Initial load + polling ────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const data = await loadMessages()
      if (mounted && data) {
        markAdvisorMessagesRead(data)
      }
    }
    init()

    // Set up 10s polling
    pollingRef.current = setInterval(async () => {
      if (!mounted) return
      const data = await loadMessages()
      if (data) markAdvisorMessagesRead(data)
    }, 10000)

    return () => {
      mounted = false
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [dossierId, loadMessages, markAdvisorMessagesRead])

  // ── Auto-scroll on new messages ───────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // ── Send message (optimistic) ─────────────────────────────────────────────

  const handleSend = async () => {
    if (!body.trim()) return

    const optimisticMessage: Message = {
      id: `optimistic-${Date.now()}`,
      dossier_id: dossierId,
      thread_id: '',
      direction: 'inbound',
      sender_type: 'client',
      sender_id: participantId,
      sender_email: participantEmail,
      sender_name: participantName,
      recipient_email: advisorEmail,
      recipient_name: advisorName,
      subject: subject || null,
      body_text: body,
      body_html: null,
      attachments: [],
      status: 'queued',
      read_at: null,
      template_id: null,
      ai_assisted: false,
      created_at: new Date().toISOString(),
      channel: 'email',
    }

    // Add optimistic message immediately
    setMessages((prev) => [...prev, optimisticMessage])
    setSendError(null)
    setSending(true)

    const savedBody = body
    const savedSubject = subject
    setSubject('')
    setBody('')
    setShowSubject(false)

    try {
      await sendClientMessage({
        dossierId,
        participantId,
        participantEmail,
        participantName,
        advisorEmail,
        advisorName,
        subject: savedSubject || undefined,
        bodyText: savedBody,
      })

      // Reload to get the real message (replaces optimistic one)
      await loadMessages()
    } catch (error) {
      console.error('Error sending message:', error)
      // Remove the optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id))
      // Restore the compose fields
      setBody(savedBody)
      setSubject(savedSubject)
      if (savedSubject) setShowSubject(true)
      setSendError('Impossible d\'envoyer le message. Vérifiez votre connexion.')
    } finally {
      setSending(false)
    }
  }

  const handleReply = (message: Message) => {
    setSubject(`Re: ${message.subject || 'Votre message'}`)
    setShowSubject(true)
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Status indicator for client messages ──────────────────────────────────

  const renderStatusIcon = (message: Message) => {
    if (message.direction !== 'inbound') return null
    if (message.id.startsWith('optimistic-')) {
      return <Loader2 className="h-3 w-3 animate-spin text-white/50" />
    }
    switch (message.status) {
      case 'queued':
        return <Loader2 className="h-3 w-3 animate-spin text-white/50" />
      case 'sent':
      case 'delivered':
        return <Check className="h-3 w-3 text-white/60" />
      case 'read':
        return <CheckCheck className="h-3 w-3 text-white/80" />
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-300" />
      default:
        return <Check className="h-3 w-3 text-white/60" />
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[600px] rounded-xl border border-gray-100 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${theme.primary}15` }}
          >
            <MessageSquare className="h-4 w-4" style={{ color: theme.primary }} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">Messages</p>
            <p className="text-xs text-gray-500">Échangez avec {advisorName}</p>
          </div>
        </div>
      </div>

      {/* Messages thread */}
      <ScrollArea className="flex-1 px-5">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
              <MessageSquare className="h-6 w-6 text-gray-300" />
            </div>
            <p className="text-sm text-gray-500">Aucun message pour le moment</p>
            <p className="text-xs text-gray-400 mt-1">
              Écrivez à votre hôte ci-dessous
            </p>
          </div>
        ) : (
          <div className="space-y-1 py-4">
            {messages.map((message, index) => {
              const isFromClient = message.direction === 'inbound'
              const isGrouped = isGroupedWithPrev(messages, index)

              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex',
                    isFromClient ? 'flex-row-reverse' : 'flex-row',
                    isGrouped ? 'mt-0.5' : 'mt-3 first:mt-0'
                  )}
                  style={{ gap: '0.625rem' }}
                >
                  {/* Avatar — hidden when grouped */}
                  {isGrouped ? (
                    <div className="w-7 flex-shrink-0" />
                  ) : (
                    <div
                      className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                      style={{
                        backgroundColor: isFromClient ? theme.primary : '#f3f4f6',
                      }}
                    >
                      {isFromClient ? (
                        <User className="h-3.5 w-3.5 text-white" />
                      ) : (
                        <Building2 className="h-3.5 w-3.5 text-gray-500" />
                      )}
                    </div>
                  )}

                  {/* Message bubble */}
                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl px-4 py-2.5',
                      isFromClient
                        ? 'rounded-tr-md text-white'
                        : 'rounded-tl-md bg-gray-100'
                    )}
                    style={isFromClient ? { backgroundColor: theme.primary } : undefined}
                  >
                    {/* Header — hidden when grouped */}
                    {!isGrouped && (
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn(
                          'text-xs font-medium',
                          isFromClient ? 'text-white/90' : 'text-gray-700'
                        )}>
                          {isFromClient ? 'Vous' : message.sender_name || advisorName}
                        </span>
                        <span className={cn(
                          'text-xs',
                          isFromClient ? 'text-white/60' : 'text-gray-400'
                        )}>
                          {formatDate(message.created_at)}
                        </span>
                      </div>
                    )}

                    {/* Subject */}
                    {message.subject && (
                      <p className={cn(
                        'text-sm font-medium mb-0.5',
                        isFromClient ? 'text-white' : 'text-gray-900'
                      )}>
                        {message.subject}
                      </p>
                    )}

                    {/* Body */}
                    <p className={cn(
                      'text-sm whitespace-pre-wrap leading-relaxed',
                      isFromClient ? 'text-white/95' : 'text-gray-700'
                    )}>
                      {message.body_text}
                    </p>

                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {message.attachments.map((attachment, i) => (
                          <a
                            key={i}
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors',
                              isFromClient
                                ? 'bg-white/15 hover:bg-white/25 text-white/90'
                                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
                            )}
                          >
                            <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate flex-1">{attachment.filename}</span>
                            <span className={cn(
                              'flex-shrink-0',
                              isFromClient ? 'text-white/60' : 'text-gray-400'
                            )}>
                              {formatFileSize(attachment.size)}
                            </span>
                            <Download className="h-3 w-3 flex-shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Footer: reply + status */}
                    <div className="flex items-center justify-between mt-1">
                      {/* Reply button for advisor messages */}
                      {!isFromClient ? (
                        <button
                          className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                          onClick={() => handleReply(message)}
                        >
                          Répondre
                        </button>
                      ) : (
                        <span />
                      )}

                      {/* Status icon for client messages */}
                      {isFromClient && (
                        <div className="flex items-center gap-1">
                          {renderStatusIcon(message)}
                          {message.status === 'failed' && (
                            <span className="text-[10px] text-red-300">Échec</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Send error banner */}
      {sendError && (
        <div className="mx-4 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600 flex-1">{sendError}</p>
          <button
            onClick={() => {
              setSendError(null)
              handleSend()
            }}
            className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
          >
            <RefreshCw className="h-3 w-3" />
            Réessayer
          </button>
        </div>
      )}

      {/* Inline compose */}
      <div className="border-t border-gray-100 p-4">
        {/* Optional subject line */}
        {showSubject && (
          <div className="mb-2">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Objet (optionnel)"
              className="w-full text-sm px-3 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:border-transparent"
              style={{ '--tw-ring-color': theme.primary } as React.CSSProperties}
            />
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Subject toggle */}
          <button
            onClick={() => setShowSubject(!showSubject)}
            className={cn(
              'h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
              showSubject ? 'bg-gray-200 text-gray-700' : 'hover:bg-gray-100 text-gray-400'
            )}
            title="Ajouter un objet"
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', showSubject && 'rotate-180')} />
          </button>

          {/* Textarea */}
          <Textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrivez votre message..."
            rows={1}
            className="min-h-[36px] max-h-[120px] resize-none text-sm border-gray-200 focus-visible:ring-1 focus-visible:ring-offset-0"
            style={{ '--tw-ring-color': theme.primary } as React.CSSProperties}
          />

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={sending || !body.trim()}
            size="sm"
            className="h-9 w-9 p-0 rounded-lg flex-shrink-0"
            style={{
              backgroundColor: body.trim() ? theme.primary : undefined,
              opacity: body.trim() ? 1 : 0.5,
            }}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        <p className="text-xs text-gray-400 mt-1.5">
          Appuyez sur Cmd+Entrée pour envoyer
        </p>
      </div>
    </div>
  )
}
