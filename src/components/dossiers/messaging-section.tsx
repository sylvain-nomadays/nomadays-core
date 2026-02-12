'use client'

import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Mail,
  Send,
  Paperclip,
  MoreHorizontal,
  Reply,
  Sparkles,
  FileText,
  ChevronDown,
  Check,
  X,
  Loader2,
  User,
  Building2,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Wand2,
  MessageCircle,
  Phone
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  getDossierMessages,
  sendMessage,
  sendWhatsAppMessage,
  getEmailTemplates,
  renderTemplate,
  generateAISuggestion,
  rejectAISuggestion,
  provideSuggestionFeedback,
  type Message,
  type EmailTemplate,
  type AISuggestion,
} from '@/lib/actions/messaging'
import { toast } from 'sonner'
import { useUserRole, permissions } from '@/lib/hooks/use-user-role'

interface MessagingSectionProps {
  dossierId: string
  clientEmail: string
  clientName: string
  clientWhatsApp?: string | null      // Numéro WhatsApp du participant lead
  advisorName: string
  destination?: string
  variables?: Record<string, string>  // Variables pour les templates
}

// Catégories de templates avec labels
const TEMPLATE_CATEGORIES = {
  welcome: { label: 'Bienvenue', icon: '👋' },
  quote: { label: 'Devis', icon: '📋' },
  confirmation: { label: 'Confirmation', icon: '✅' },
  payment: { label: 'Paiement', icon: '💳' },
  pre_departure: { label: 'Avant départ', icon: '✈️' },
  during_trip: { label: 'Pendant voyage', icon: '🌴' },
  post_trip: { label: 'Après voyage', icon: '🙏' },
  follow_up: { label: 'Relance', icon: '🔔' },
  general: { label: 'Général', icon: '📧' },
}

function MessageBubble({ message, isLast }: { message: Message; isLast: boolean }) {
  const isOutbound = message.direction === 'outbound'
  const [expanded, setExpanded] = useState(isLast)

  return (
    <div className={`flex gap-3 ${isOutbound ? 'flex-row-reverse' : ''}`}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className={isOutbound ? 'bg-primary/10 text-primary' : 'bg-muted'}>
          {isOutbound ? (
            <Building2 className="h-4 w-4" />
          ) : (
            <User className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>

      <div className={`flex-1 max-w-[80%] ${isOutbound ? 'text-right' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium">
            {message.sender_name || message.sender_email}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.created_at), 'dd MMM à HH:mm', { locale: fr })}
          </span>
          {message.channel === 'whatsapp' && (
            <Badge variant="outline" className="h-5 text-xs gap-1 text-green-600 border-green-300">
              <MessageCircle className="h-3 w-3" />
              WA
            </Badge>
          )}
          {message.ai_assisted && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="h-5 text-xs gap-1">
                    <Sparkles className="h-3 w-3" />
                    IA
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Rédigé avec l&apos;assistant IA</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <div
            className={`rounded-lg p-3 ${
              message.channel === 'whatsapp'
                ? (isOutbound ? 'bg-green-600 text-white' : 'bg-green-50 border border-green-200')
                : (isOutbound ? 'bg-primary text-primary-foreground' : 'bg-muted')
            }`}
          >
            {message.subject && (
              <p className="font-medium text-sm mb-2">{message.subject}</p>
            )}
            <CollapsibleContent>
              <div
                className="text-sm prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: message.body_html || message.body_text.replace(/\n/g, '<br>')
                }}
              />
            </CollapsibleContent>
            {!expanded && (
              <p className="text-sm line-clamp-2">
                {message.body_text.substring(0, 150)}
                {message.body_text.length > 150 ? '...' : ''}
              </p>
            )}
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="mt-1 h-6 text-xs">
              {expanded ? 'Réduire' : 'Voir plus'}
              <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
        </Collapsible>

        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.attachments.map((att, i) => (
              <Badge key={i} variant="outline" className="gap-1">
                <Paperclip className="h-3 w-3" />
                {att.filename}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AISuggestionCard({
  suggestion,
  onAccept,
  onModify,
  onReject,
  onRegenerate,
  loading,
}: {
  suggestion: AISuggestion
  onAccept: () => void
  onModify: (text: string) => void
  onReject: () => void
  onRegenerate: () => void
  loading: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [editedText, setEditedText] = useState(suggestion.suggested_body)

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Suggestion de l'assistant IA
            {suggestion.confidence_score && (
              <Badge variant="outline" className="text-xs">
                {Math.round(suggestion.confidence_score * 100)}% confiance
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRegenerate} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Régénérer</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestion.suggested_subject && (
          <div>
            <Label className="text-xs text-muted-foreground">Objet suggéré</Label>
            <p className="text-sm font-medium">{suggestion.suggested_subject}</p>
          </div>
        )}

        {editing ? (
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="min-h-[200px] text-sm"
          />
        ) : (
          <div className="bg-background rounded-md p-3 text-sm whitespace-pre-wrap">
            {suggestion.suggested_body}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button size="sm" onClick={() => { onModify(editedText); setEditing(false); }}>
                  <Check className="h-4 w-4 mr-1" />
                  Valider les modifications
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setEditing(false); setEditedText(suggestion.suggested_body); }}>
                  Annuler
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" onClick={onAccept} disabled={loading}>
                  <Check className="h-4 w-4 mr-1" />
                  Utiliser
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  <Wand2 className="h-4 w-4 mr-1" />
                  Modifier
                </Button>
                <Button size="sm" variant="ghost" onClick={onReject}>
                  <X className="h-4 w-4 mr-1" />
                  Ignorer
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function MessagingSection({
  dossierId,
  clientEmail,
  clientName,
  clientWhatsApp,
  advisorName,
  destination,
  variables = {},
}: MessagingSectionProps) {
  const { role, tenantSettings } = useUserRole()
  const canSeeEmail = permissions.canSeeClientEmail(role, tenantSettings)

  const [messages, setMessages] = useState<Message[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)

  // Compose state
  const [showCompose, setShowCompose] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<'email' | 'whatsapp'>('email')

  // AI Suggestion
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Charger les messages et templates
  useEffect(() => {
    async function load() {
      try {
        const [messagesData, templatesData] = await Promise.all([
          getDossierMessages(dossierId),
          getEmailTemplates(),
        ])
        setMessages(messagesData)
        setTemplates(templatesData)
      } catch (error) {
        console.error('Error loading messaging data:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [dossierId])

  // Scroll to bottom when new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Appliquer un template
  const handleSelectTemplate = async (template: EmailTemplate) => {
    setSelectedTemplate(template)

    // Préparer les variables
    const allVariables: Record<string, string> = {
      client_name: clientName,
      advisor_name: advisorName,
      destination: destination || '',
      dossier_reference: dossierId.substring(0, 8).toUpperCase(),
      ...variables,
    }

    try {
      const rendered = await renderTemplate(template.id, allVariables)
      setSubject(rendered.subject)
      setBody(rendered.bodyHtml || rendered.bodyText)
    } catch (error) {
      toast.error('Erreur lors du chargement du template')
    }
  }

  // Générer une suggestion IA
  const handleGenerateAISuggestion = async (contextType: 'reply_to_client' | 'follow_up' | 'proactive' = 'proactive') => {
    setGeneratingAI(true)
    try {
      const suggestion = await generateAISuggestion({
        dossierId,
        contextType,
        triggerMessageId: messages[messages.length - 1]?.id,
      })
      setAiSuggestion(suggestion)
    } catch (error) {
      toast.error('Erreur lors de la génération de la suggestion')
    } finally {
      setGeneratingAI(false)
    }
  }

  // Accepter la suggestion IA
  const handleAcceptSuggestion = () => {
    if (aiSuggestion) {
      setSubject(aiSuggestion.suggested_subject || '')
      setBody(aiSuggestion.suggested_body)
      setShowCompose(true)
    }
  }

  // Modifier et utiliser la suggestion
  const handleModifySuggestion = (text: string) => {
    if (aiSuggestion) {
      setSubject(aiSuggestion.suggested_subject || '')
      setBody(text)
      setShowCompose(true)
    }
  }

  // Rejeter la suggestion
  const handleRejectSuggestion = async () => {
    if (aiSuggestion) {
      await rejectAISuggestion(aiSuggestion.id)
      setAiSuggestion(null)
    }
  }

  // Envoyer le message (email ou WhatsApp selon le canal sélectionné)
  const handleSend = async () => {
    if (!body.trim()) {
      toast.error('Le message ne peut pas être vide')
      return
    }

    setSending(true)
    try {
      let newMessage

      if (selectedChannel === 'whatsapp' && clientWhatsApp) {
        // Envoi WhatsApp
        newMessage = await sendWhatsAppMessage({
          dossierId,
          recipientPhone: clientWhatsApp,
          recipientName: clientName,
          bodyText: body,
          aiSuggestionId: aiSuggestion?.id,
        })
      } else {
        // Envoi Email (comportement existant)
        newMessage = await sendMessage({
          dossierId,
          recipientEmail: clientEmail,
          recipientName: clientName,
          subject: subject || undefined,
          bodyText: body.replace(/<[^>]*>/g, ''), // Strip HTML for text version
          bodyHtml: body,
          templateId: selectedTemplate?.id,
          aiSuggestionId: aiSuggestion?.id,
        })
      }

      setMessages(prev => [...prev, newMessage as Message])
      setShowCompose(false)
      setSubject('')
      setBody('')
      setSelectedTemplate(null)
      setSelectedChannel('email')
      setAiSuggestion(null)
      toast.success(selectedChannel === 'whatsapp' ? 'WhatsApp envoyé' : 'Email envoyé')
    } catch (error) {
      toast.error('Erreur lors de l\'envoi')
    } finally {
      setSending(false)
    }
  }

  // Répondre à un message client
  const handleReply = (message: Message) => {
    // Sélectionner le canal du message d'origine
    if (message.channel === 'whatsapp' && clientWhatsApp) {
      setSelectedChannel('whatsapp')
    } else {
      setSelectedChannel('email')
      setSubject(`Re: ${message.subject || 'Votre message'}`)
    }
    setShowCompose(true)
    // Générer une suggestion IA pour la réponse
    handleGenerateAISuggestion('reply_to_client')
  }

  // Grouper les templates par catégorie
  const templatesByCategory = templates.reduce<Record<string, EmailTemplate[]>>((acc, t) => {
    const category = t.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category]!.push(t)
    return acc
  }, {})

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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Messagerie
            {messages.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {messages.length} message{messages.length > 1 ? 's' : ''}
              </Badge>
            )}
            {messages.some(m => m.channel === 'whatsapp') && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-300 gap-1">
                <MessageCircle className="h-3 w-3" />
                WhatsApp
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerateAISuggestion('proactive')}
              disabled={generatingAI}
            >
              {generatingAI ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Suggérer
            </Button>
            <Button size="sm" onClick={() => setShowCompose(true)}>
              <Send className="h-4 w-4 mr-2" />
              Nouveau message
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* AI Suggestion Card */}
        {aiSuggestion && (
          <AISuggestionCard
            suggestion={aiSuggestion}
            onAccept={handleAcceptSuggestion}
            onModify={handleModifySuggestion}
            onReject={handleRejectSuggestion}
            onRegenerate={() => handleGenerateAISuggestion('proactive')}
            loading={generatingAI}
          />
        )}

        {/* Messages list */}
        <ScrollArea className="h-[400px] pr-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm">Aucun message</p>
              <p className="text-xs mt-1">Commencez la conversation avec le client</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div key={message.id}>
                  <MessageBubble
                    message={message}
                    isLast={index === messages.length - 1}
                  />
                  {message.direction === 'inbound' && (
                    <div className="flex justify-start mt-1 ml-11">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleReply(message)}
                      >
                        <Reply className="h-3 w-3 mr-1" />
                        Répondre
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Quick compose inline (optional) */}
        {!showCompose && messages.length > 0 && (
          <div className="flex gap-2 pt-2 border-t">
            <Input
              placeholder="Écrire un message rapide..."
              className="flex-1"
              onFocus={() => setShowCompose(true)}
            />
            <Button size="icon" variant="ghost" onClick={() => setShowCompose(true)}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>

      {/* Compose Dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedChannel === 'whatsapp' ? (
                <MessageCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Mail className="h-5 w-5" />
              )}
              Nouveau message à {clientName}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* Channel Selector */}
            {clientWhatsApp && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Canal</Label>
                <div className="flex gap-2">
                  <Button
                    variant={selectedChannel === 'email' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedChannel('email')}
                    className="h-9"
                  >
                    <Mail className="h-4 w-4 mr-1.5" />
                    Email
                  </Button>
                  <Button
                    variant={selectedChannel === 'whatsapp' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedChannel('whatsapp')}
                    className={`h-9 ${selectedChannel === 'whatsapp' ? 'bg-green-600 hover:bg-green-700' : 'text-green-600 border-green-300 hover:bg-green-50'}`}
                  >
                    <MessageCircle className="h-4 w-4 mr-1.5" />
                    WhatsApp
                  </Button>
                </div>
              </div>
            )}

            {/* Templates (email seulement) */}
            {selectedChannel === 'email' && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Templates</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
                  <DropdownMenu key={category}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8">
                        <span className="mr-1">
                          {TEMPLATE_CATEGORIES[category as keyof typeof TEMPLATE_CATEGORIES]?.icon || '📧'}
                        </span>
                        {TEMPLATE_CATEGORIES[category as keyof typeof TEMPLATE_CATEGORIES]?.label || category}
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {categoryTemplates.map((template) => (
                        <DropdownMenuItem
                          key={template.id}
                          onClick={() => handleSelectTemplate(template)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          {template.name}
                          {template.is_default && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              défaut
                            </Badge>
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ))}
              </div>
            </div>
            )}

            {selectedChannel === 'email' && <Separator />}

            {/* Subject (email seulement) */}
            {selectedChannel === 'email' && (
            <div className="space-y-2">
              <Label htmlFor="subject">Objet</Label>
              <Input
                id="subject"
                placeholder="Objet du message"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            )}

            {/* Body */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="body">Message</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleGenerateAISuggestion('proactive')}
                  disabled={generatingAI}
                >
                  {generatingAI ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3 mr-1" />
                  )}
                  Aide IA
                </Button>
              </div>
              <Textarea
                id="body"
                placeholder={selectedChannel === 'whatsapp'
                  ? 'Votre message WhatsApp...'
                  : 'Votre message...'
                }
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className={selectedChannel === 'whatsapp' ? 'min-h-[150px]' : 'min-h-[250px]'}
              />
              {selectedChannel === 'whatsapp' && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MessageCircle className="h-3 w-3 text-green-600" />
                  Message envoyé via WhatsApp à {clientWhatsApp}
                </p>
              )}
            </div>

            {/* Attachments placeholder (email seulement) */}
            {selectedChannel === 'email' && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Pièces jointes</Label>
              <Button variant="outline" size="sm" className="w-full" disabled>
                <Paperclip className="h-4 w-4 mr-2" />
                Ajouter une pièce jointe (bientôt disponible)
              </Button>
            </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <div className="flex items-center justify-between w-full">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                {selectedChannel === 'whatsapp' ? (
                  <>
                    <MessageCircle className="h-3 w-3 text-green-600" />
                    À : {clientWhatsApp}
                  </>
                ) : (
                  <>
                    <Mail className="h-3 w-3" />
                    À : {canSeeEmail ? clientEmail : clientName}
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowCompose(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={sending || !body.trim()}
                  className={selectedChannel === 'whatsapp' ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : selectedChannel === 'whatsapp' ? (
                    <MessageCircle className="h-4 w-4 mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {selectedChannel === 'whatsapp' ? 'Envoyer WhatsApp' : 'Envoyer'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
