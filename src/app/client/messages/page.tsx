import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  MessageSquare,
  ArrowRight,
  User,
  Building2,
} from 'lucide-react'

export default async function ClientMessagesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Récupérer le participant
  if (!user.email) {
    redirect('/login')
  }

  const { data: participantData } = await supabase
    .from('participants')
    .select('id, first_name, last_name')
    .eq('email', user.email)
    .single()

  const participant = participantData as { id: string; first_name: string; last_name: string } | null

  if (!participant) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Aucun message disponible.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Récupérer tous les dossiers du participant avec le dernier message
  const { data: dossierParticipants } = await supabase
    .from('dossier_participants')
    .select(`
      dossier:dossiers(
        id,
        reference,
        title,
        tenant:tenants(name)
      )
    `)
    .eq('participant_id', participant.id)

  const dossierIds = (dossierParticipants || [])
    .map((dp: any) => dp.dossier?.id)
    .filter(Boolean)

  // Récupérer les derniers messages de chaque dossier
  const conversationsWithMessages = await Promise.all(
    dossierIds.map(async (dossierId: string) => {
      const { data: messages } = await supabase
        .from('dossier_messages')
        .select('*')
        .eq('dossier_id', dossierId)
        .order('created_at', { ascending: false })
        .limit(1)

      const { data: unreadCount } = await supabase
        .from('dossier_messages')
        .select('id', { count: 'exact' })
        .eq('dossier_id', dossierId)
        .eq('direction', 'outbound')
        .is('read_at', null)

      const dossierData = ((dossierParticipants || []) as any[]).find(
        (dp) => dp.dossier?.id === dossierId
      )

      return {
        dossier: dossierData?.dossier as any,
        lastMessage: (messages?.[0] || null) as any,
        unreadCount: unreadCount?.length || 0,
      }
    })
  )

  // Trier par date du dernier message
  const sortedConversations = conversationsWithMessages
    .filter((c) => c.dossier)
    .sort((a, b) => {
      if (!a.lastMessage) return 1
      if (!b.lastMessage) return -1
      return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
    })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Hier'
    } else if (diffDays < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-muted-foreground">
          Vos conversations avec les conseillers voyage
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Toutes les conversations</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedConversations.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune conversation</p>
              <p className="text-sm text-muted-foreground mt-1">
                Vos échanges avec les conseillers apparaîtront ici
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {sortedConversations.map((conversation) => (
                  <Link
                    key={conversation.dossier.id}
                    href={`/client/voyages/${conversation.dossier.id}?tab=messages`}
                    className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium truncate">
                          {conversation.dossier.title}
                        </p>
                        {conversation.lastMessage && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatDate(conversation.lastMessage.created_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.dossier.tenant?.name || 'Nomadays'} • {conversation.dossier.reference}
                      </p>
                      {conversation.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {conversation.lastMessage.direction === 'inbound' ? (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              Vous : {conversation.lastMessage.body_text.substring(0, 50)}...
                            </span>
                          ) : (
                            <span>
                              {conversation.lastMessage.sender_name} : {conversation.lastMessage.body_text.substring(0, 50)}...
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Badge + Arrow */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {conversation.unreadCount > 0 && (
                        <Badge variant="destructive">{conversation.unreadCount}</Badge>
                      )}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
