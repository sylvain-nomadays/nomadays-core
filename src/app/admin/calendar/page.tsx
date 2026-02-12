'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  format,
  startOfWeek,
  startOfMonth,
  addDays,
  isSameDay,
  isSameMonth,
  parseISO,
  getMonth,
  getYear,
  setMonth,
  setYear,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ChevronLeft,
  ChevronRight,
  PlaneLanding,
  PlaneTakeoff,
  Plane,
  Search,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [logistics, setLogistics] = useState<TravelLogistic[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Current month/year derived from weekStart for the selectors
  const currentMonth = getMonth(weekStart)
  const currentYear = getYear(weekStart)

  // Year range for selector (current year -1 to +2)
  const yearOptions = useMemo(() => {
    const now = new Date()
    const thisYear = getYear(now)
    return Array.from({ length: 4 }, (_, i) => thisYear - 1 + i)
  }, [])

  // Days of the week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = new Date()

  // Format week range for display
  const weekEnd = addDays(weekStart, 6)
  const weekRangeText = isSameMonth(weekStart, weekEnd)
    ? `${format(weekStart, 'd')} - ${format(weekEnd, 'd MMMM yyyy', { locale: fr })}`
    : `${format(weekStart, 'd MMM', { locale: fr })} - ${format(weekEnd, 'd MMM yyyy', { locale: fr })}`

  // Navigate weeks
  const goToPreviousWeek = () => setWeekStart(addDays(weekStart, -7))
  const goToNextWeek = () => setWeekStart(addDays(weekStart, 7))
  const goToToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))

  // Navigate by month
  const handleMonthChange = (monthStr: string) => {
    const month = parseInt(monthStr)
    const newDate = setMonth(weekStart, month)
    // Go to first Monday of that month
    const firstOfMonth = startOfMonth(newDate)
    setWeekStart(startOfWeek(firstOfMonth, { weekStartsOn: 1 }))
  }

  const handleYearChange = (yearStr: string) => {
    const year = parseInt(yearStr)
    const newDate = setYear(weekStart, year)
    const firstOfMonth = startOfMonth(newDate)
    setWeekStart(startOfWeek(firstOfMonth, { weekStartsOn: 1 }))
  }

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

  // Count stats for the week
  const weekArrivals = filteredLogistics.filter(l => l.type === 'arrival').length
  const weekDepartures = filteredLogistics.filter(l => l.type === 'departure').length
  const weekMissing = filteredLogistics.filter(l => !l.transport_info).length

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Plane className="h-6 w-6" />
            Calendrier des arrivées / départs
          </h1>
          <p className="text-muted-foreground text-sm">Vue hebdomadaire des vols et transferts</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher dossier, vol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Navigation bar */}
      <div className="flex items-center justify-between mb-4 bg-muted/50 rounded-lg px-4 py-2">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Aujourd&apos;hui
          </Button>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Month selector */}
          <Select value={currentMonth.toString()} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-[140px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((name, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year selector */}
          <Select value={currentYear.toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[90px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-sm font-medium text-muted-foreground ml-2">
            Semaine du {weekRangeText}
          </span>
        </div>

        {/* Week stats */}
        <div className="flex items-center gap-3">
          {weekArrivals > 0 && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
              <PlaneLanding className="h-3 w-3" />
              {weekArrivals} arrivée{weekArrivals > 1 ? 's' : ''}
            </Badge>
          )}
          {weekDepartures > 0 && (
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 gap-1">
              <PlaneTakeoff className="h-3 w-3" />
              {weekDepartures} départ{weekDepartures > 1 ? 's' : ''}
            </Badge>
          )}
          {weekMissing > 0 && (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
              <AlertTriangle className="h-3 w-3" />
              {weekMissing} sans info
            </Badge>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-300" />
          Arrivée
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-orange-100 border border-orange-300" />
          Départ
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-100 border border-red-300" />
          Info manquante
        </span>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-3">
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
                    <LogisticCard key={logistic.id} logistic={logistic} />
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

function LogisticCard({ logistic }: { logistic: TravelLogistic }) {
  const totalPax = logistic.dossier.pax_adults + logistic.dossier.pax_children
  const time = logistic.scheduled_datetime
    ? format(parseISO(logistic.scheduled_datetime), 'HH:mm')
    : '--:--'

  const hasTransferInfo = !!logistic.transport_info
  const isArrival = logistic.type === 'arrival'

  // 3 color schemes:
  // 1. Arrival = blue
  // 2. Departure = orange
  // 3. Missing info = red/alert (overrides arrival/departure color)
  const getCardColors = () => {
    if (!hasTransferInfo) {
      return {
        bg: 'bg-red-50 hover:bg-red-100',
        border: 'border-red-300',
        borderLeft: 'border-l-red-500',
        textColor: 'text-red-800',
        iconColor: 'text-red-500',
      }
    }
    if (isArrival) {
      return {
        bg: 'bg-blue-50 hover:bg-blue-100',
        border: 'border-blue-200',
        borderLeft: 'border-l-blue-500',
        textColor: 'text-blue-900',
        iconColor: 'text-blue-600',
      }
    }
    return {
      bg: 'bg-orange-50 hover:bg-orange-100',
      border: 'border-orange-200',
      borderLeft: 'border-l-orange-500',
      textColor: 'text-orange-900',
      iconColor: 'text-orange-600',
    }
  }

  const colors = getCardColors()

  return (
    <Link href={`/admin/dossiers/${logistic.dossier_id}`}>
      <Card className={`
        p-2.5 cursor-pointer transition-colors border-l-4
        ${colors.bg} ${colors.border} ${colors.borderLeft}
      `}>
        {/* Reference + Name */}
        <div className="mb-1.5">
          <span className="text-xs font-semibold text-primary hover:underline">
            {logistic.dossier.reference}
          </span>
          <span className="text-xs ml-1 text-muted-foreground">{logistic.dossier.title}</span>
        </div>

        {/* Flight info or missing alert */}
        {hasTransferInfo ? (
          <p className="text-sm font-medium mb-1">
            {logistic.transport_info}
          </p>
        ) : (
          <p className="text-xs text-red-600 mb-1 flex items-center gap-1 font-medium">
            <AlertTriangle className="h-3 w-3" />
            Info vol manquante
          </p>
        )}

        {/* Icon + Time + Pax */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className={`flex items-center gap-1 ${colors.iconColor}`}>
            {isArrival
              ? <PlaneLanding className="h-3.5 w-3.5" />
              : <PlaneTakeoff className="h-3.5 w-3.5" />
            }
          </span>
          <span className="font-bold">{time}</span>
          <span className="text-muted-foreground">·</span>
          <span className="flex items-center gap-0.5 text-muted-foreground">
            {totalPax} pax
          </span>
        </div>
      </Card>
    </Link>
  )
}
