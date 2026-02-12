'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Bell,
  FileText,
  Clock,
  CreditCard,
  UserPlus,
  CheckCircle,
  XCircle,
  Plane,
  Upload,
  AtSign,
  Loader2,
  ClipboardList,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNotifications, type NotificationItem as NotificationType } from '@/hooks/useNotifications'
import { toast } from 'sonner'

// Configuration des types de notifications
type NotificationTypeKey =
  | 'new_request'
  | 'follow_up_reminder'
  | 'payment_received'
  | 'proposal_accepted'
  | 'proposal_rejected'
  | 'trip_starting_soon'
  | 'document_uploaded'
  | 'mention'
  | 'assignment'
  | 'pre_booking_request'
  | 'pre_booking_confirmed'
  | 'pre_booking_refused'

const NOTIFICATION_CONFIG: Record<NotificationTypeKey, {
  icon: React.ReactNode
  color: string
  bgColor: string
  label: string
}> = {
  new_request: {
    icon: <FileText className="h-4 w-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    label: 'Nouvelle demande',
  },
  follow_up_reminder: {
    icon: <Clock className="h-4 w-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    label: 'Rappel de suivi',
  },
  payment_received: {
    icon: <CreditCard className="h-4 w-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label: 'Paiement reçu',
  },
  proposal_accepted: {
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label: 'Proposition acceptée',
  },
  proposal_rejected: {
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    label: 'Proposition refusée',
  },
  trip_starting_soon: {
    icon: <Plane className="h-4 w-4" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    label: 'Voyage imminent',
  },
  document_uploaded: {
    icon: <Upload className="h-4 w-4" />,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    label: 'Document ajouté',
  },
  mention: {
    icon: <AtSign className="h-4 w-4" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    label: 'Vous êtes mentionné',
  },
  assignment: {
    icon: <UserPlus className="h-4 w-4" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    label: 'Nouvelle assignation',
  },
  pre_booking_request: {
    icon: <ClipboardList className="h-4 w-4" />,
    color: 'text-[#0FB6BC]',
    bgColor: 'bg-[#E6F9FA]',
    label: 'Demande de pré-réservation',
  },
  pre_booking_confirmed: {
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-[#8BA080]',
    bgColor: 'bg-[#8BA080]/10',
    label: 'Pré-réservation confirmée',
  },
  pre_booking_refused: {
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    label: 'Pré-réservation refusée',
  },
}

// Default config for unknown types
const DEFAULT_CONFIG = {
  icon: <Bell className="h-4 w-4" />,
  color: 'text-gray-600',
  bgColor: 'bg-gray-50',
  label: 'Notification',
}

function NotificationItemRow({
  notification,
  onRead,
  onClick
}: {
  notification: NotificationType
  onRead: () => void
  onClick: () => void
}) {
  const config = NOTIFICATION_CONFIG[notification.type as NotificationTypeKey] || DEFAULT_CONFIG

  let timeAgo = ''
  try {
    timeAgo = formatDistanceToNow(new Date(notification.created_at), {
      addSuffix: false,
      locale: fr
    })
  } catch {
    timeAgo = ''
  }

  return (
    <button
      onClick={() => {
        if (!notification.is_read) {
          onRead()
        }
        onClick()
      }}
      className={`w-full text-left p-3 hover:bg-accent/50 transition-colors ${
        !notification.is_read ? 'bg-accent/30' : ''
      }`}
    >
      <div className="flex gap-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-full ${config.bgColor} ${config.color} flex items-center justify-center`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${config.color}`}>
            {notification.title || config.label}
          </p>
          {notification.message && (
            <p className="text-sm text-foreground truncate">
              {notification.message}
            </p>
          )}
          {timeAgo && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {timeAgo}
            </p>
          )}
        </div>
        {!notification.is_read && (
          <div className="flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-primary" />
          </div>
        )}
      </div>
    </button>
  )
}

export function NotificationsBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllRead,
    markingAllRead,
  } = useNotifications()

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markAsRead(notificationId)
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllRead(undefined as never)
      toast.success('Toutes les notifications marquées comme lues')
    } catch (error) {
      toast.error('Erreur lors du marquage')
    }
  }

  const handleNotificationClick = (notification: NotificationType) => {
    setOpen(false)
    if (notification.link) {
      router.push(notification.link)
    } else if (notification.metadata_json?.trip_id) {
      router.push(`/admin/circuits/${notification.metadata_json.trip_id}`)
    } else if (notification.metadata_json?.booking_id) {
      router.push('/admin/reservations')
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="link"
              size="sm"
              className="text-primary h-auto p-0"
              onClick={handleMarkAllAsRead}
              disabled={markingAllRead}
            >
              {markingAllRead ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              Tout marquer comme lu
            </Button>
          )}
        </div>

        {/* Notifications list */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItemRow
                  key={notification.id}
                  notification={notification}
                  onRead={() => handleMarkAsRead(notification.id)}
                  onClick={() => handleNotificationClick(notification)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
