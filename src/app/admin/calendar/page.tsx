'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ChevronLeft,
  ChevronRight,
  Plane,
  Search,
  Calendar as CalendarIcon,
  Users,
  Clock,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { getArrivalsAndDepartures } from '@/lib/actions/calendar'

interface TravelLogistic {
  id: string
  dossier_id: string
  type: 'arrival' | 'departure'
  transport_type: string
  transport_info: string | null
  scheduled_datetime: string
  location: string | null
  all_participants: boolean
  dossier: {
    id: string
    reference: string
    title: string
    status: string
    pax_adults: number
    pax_children: number
  }
}

export default function CalendarPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [logistics, setLogistics] = useState<TravelLogistic[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Days of the week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = new Date()

  // Format week range for display
  const weekRangeText = `${format(weekStart, 'd MMM', { locale: fr })} - ${format(addDays(weekStart, 6), 'd MMM yyyy', { locale: fr })}`

  // Navigate weeks
  const goToPreviousWeek = () => setWeekStart(addDays(weekStart, -7))
  const goToNextWeek = () => setWeekStart(addDays(weekStart, 7))
  const goToToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))

  // Load data
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const data = await getArrivalsAndDepartures(
          format(weekStart, 'yyyy-MM-dd'),
          format(addDays(weekStart, 6), 'yyyy-MM-dd')
        )
        setLogistics(data)
      } catch (error) {
        console.error('Error loading calendar data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [weekStart])

  // Filter by search
  const filteredLogistics = logistics.filter(l => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      l.dossier.reference.toLowerCase().includes(searchLower) ||
      l.dossier.title.toLowerCase().includes(searchLower) ||
      l.transport_info?.toLowerCase().includes(searchLower)
    )
  })

  // Group by day
  const getLogisticsForDay = (day: Date) => {
    return filteredLogistics.filter(l => {
      if (!l.scheduled_datetime) return false
      return isSameDay(parseISO(l.scheduled_datetime), day)
    }).sort((a, b) => {
      return new Date(a.scheduled_datetime).getTime() - new Date(b.scheduled_datetime).getTime()
    })
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'deposit_paid':
      case 'fully_paid':
        return 'bg-green-50 border-green-200 hover:bg-green-100'
      case 'quote_sent':
      case 'negotiation':
        return 'bg-pink-50 border-pink-200 hover:bg-pink-100'
      default:
        return 'bg-white border-gray-200 hover:bg-gray-50'
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Plane className="h-6 w-6" />
            Calendrier des arrivées / départs
          </h1>
          <p className="text-muted-foreground">Vue hebdomadaire des vols et transferts</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" onClick={goToToday}>
          Aujourd'hui
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <h2 className="text-lg font-semibold capitalize">{weekRangeText}</h2>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const isToday = isSameDay(day, today)
          const dayLogistics = getLogisticsForDay(day)

          return (
            <div key={day.toISOString()} className="min-h-[500px]">
              {/* Day Header */}
              <div className={`
                text-center py-2 mb-3 rounded-lg
                ${isToday ? 'bg-primary text-primary-foreground' : 'bg-muted'}
              `}>
                <p className="text-xs font-medium uppercase">
                  {format(day, 'EEE', { locale: fr })}
                </p>
                <p className={`text-2xl font-bold ${isToday ? '' : 'text-foreground'}`}>
                  {format(day, 'd')}
                </p>
              </div>

              {/* Day Content */}
              <div className="space-y-2">
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2].map(i => (
                      <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : dayLogistics.length > 0 ? (
                  dayLogistics.map((logistic) => (
                    <LogisticCard key={logistic.id} logistic={logistic} getStatusColor={getStatusColor} />
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    —
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LogisticCard({
  logistic,
  getStatusColor
}: {
  logistic: TravelLogistic
  getStatusColor: (status: string) => string
}) {
  const totalPax = logistic.dossier.pax_adults + logistic.dossier.pax_children
  const time = logistic.scheduled_datetime
    ? format(parseISO(logistic.scheduled_datetime), 'HH:mm')
    : '--:--'

  const hasTransferInfo = !!logistic.transport_info

  return (
    <Link href={`/admin/dossiers/${logistic.dossier_id}`}>
      <Card className={`
        p-3 cursor-pointer transition-colors border-l-4
        ${getStatusColor(logistic.dossier.status)}
        ${logistic.type === 'arrival' ? 'border-l-blue-500' : 'border-l-orange-500'}
      `}>
        {/* Reference + Name */}
        <div className="mb-2">
          <Link
            href={`/admin/dossiers/${logistic.dossier_id}`}
            className="text-sm font-medium text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {logistic.dossier.reference}
          </Link>
          <span className="text-sm ml-1">{logistic.dossier.title}</span>
        </div>

        {/* Flight info */}
        {hasTransferInfo ? (
          <p className="text-sm text-muted-foreground mb-1">
            {logistic.transport_info}
          </p>
        ) : (
          <p className="text-sm text-orange-600 mb-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            No transfer
          </p>
        )}

        {/* Time + Pax */}
        <div className="flex items-center gap-2 text-sm">
          <span className="flex items-center gap-1">
            {logistic.type === 'arrival' ? '✈️' : '🛫'}
            <span className="font-medium">{time}</span>
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {totalPax} pax
          </span>
        </div>

        {/* Add info link if no transfer */}
        {!hasTransferInfo && (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-primary mt-1"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              // TODO: Open modal to add info
            }}
          >
            Add info
          </Button>
        )}
      </Card>
    </Link>
  )
}
