'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Bell,
  FileText,
  Clock,
  CreditCard,
  MessageSquare,
  UserPlus,
  CheckCircle,
  XCircle,
  Plane,
  Upload,
  AtSign,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type Notification,
  type NotificationType
} from '@/lib/actions/notifications'
import { toast } from 'sonner'

// Configuration des types de notifications
const NOTIFICATION_CONFIG: Record<NotificationType, {
  icon: React.ReactNode
  color: string
  bgColor: string
}> = {
  new_request: {
    icon: <FileText className="h-4 w-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  follow_up_reminder: {
    icon: <Clock className="h-4 w-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  payment_received: {
    icon: <CreditCard className="h-4 w-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  proposal_accepted: {
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  proposal_rejected: {
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  trip_starting_soon: {
    icon: <Plane className="h-4 w-4" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  document_uploaded: {
    icon: <Upload className="h-4 w-4" />,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
  },
  mention: {
    icon: <AtSign className="h-4 w-4" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
  },
  assignment: {
    icon: <UserPlus className="h-4 w-4" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
  },
}

const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  new_request: 'New request',
  follow_up_reminder: 'Follow up reminder',
  payment_received: 'Payment received',
  proposal_accepted: 'Proposal accepted',
  proposal_rejected: 'Proposal rejected',
  trip_starting_soon: 'Trip starting soon',
  document_uploaded: 'Document uploaded',
  mention: 'You were mentioned',
  assignment: 'New assignment',
}

function NotificationItem({
  notification,
  onRead,
  onClick
}: {
  notification: Notification
  onRead: () => void
  onClick: () => void
}) {
  const config = NOTIFICATION_CONFIG[notification.type]
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: false,
    locale: fr
  })

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
            {NOTIFICATION_LABELS[notification.type]}
          </p>
          <p className="text-sm text-foreground truncate">
            {notification.dossier_reference && (
              <span className="font-mono">{notification.dossier_reference}</span>
            )}
            {notification.participant_name && (
              <span> - {notification.participant_name}</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {timeAgo}
          </p>
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
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [markingAllRead, setMarkingAllRead] = useState(false)

  // Charger les notifications
  const loadNotifications = async () => {
    try {
      const data = await getUserNotifications({ limit: 20 })
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()

    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId)
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    setMarkingAllRead(true)
    try {
      await markAllNotificationsAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
      toast.success('Toutes les notifications marquées comme lues')
    } catch (error) {
      toast.error('Erreur lors du marquage')
    } finally {
      setMarkingAllRead(false)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    setOpen(false)
    if (notification.dossier_id) {
      router.push(`/admin/dossiers/${notification.dossier_id}`)
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
              Mark all as seen
            </Button>
          )}
        </div>

        {/* Notifications list */}
        <ScrollArea className="h-[400px]">
          {loading ? (
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
                <NotificationItem
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
