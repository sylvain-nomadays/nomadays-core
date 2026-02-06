'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Calendar,
  Users,
  Wallet,
  Edit,
  Check,
  X,
  Plus,
  Minus,
  Bed
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ROOM_TYPES } from '@/lib/constants'

interface DossierInfoCardsProps {
  dossierId: string
  departureDateFrom: string | null
  departureDateTo: string | null
  durationDays: number | null
  paxAdults: number
  paxTeens?: number
  paxChildren: number
  paxInfants?: number
  roomingPreferences?: RoomingPreference[]
  budgetMin: number | null
  budgetMax: number | null
  currency?: string
  onUpdate: (data: Partial<DossierInfoCardsProps>) => Promise<void>
}

interface RoomingPreference {
  type: string
  count: number
}

export function DossierInfoCards({
  dossierId,
  departureDateFrom,
  departureDateTo,
  durationDays,
  paxAdults,
  paxTeens = 0,
  paxChildren,
  paxInfants = 0,
  roomingPreferences = [],
  budgetMin,
  budgetMax,
  currency = 'EUR',
  onUpdate
}: DossierInfoCardsProps) {
  const [editingDates, setEditingDates] = useState(false)
  const [editingTravelers, setEditingTravelers] = useState(false)
  const [editingBudget, setEditingBudget] = useState(false)
  const [saving, setSaving] = useState(false)

  // Date editing state
  const [dateFrom, setDateFrom] = useState(departureDateFrom || '')
  const [dateTo, setDateTo] = useState(departureDateTo || '')
  const [duration, setDuration] = useState(durationDays?.toString() || '')

  // Travelers editing state
  const [adults, setAdults] = useState(paxAdults)
  const [teens, setTeens] = useState(paxTeens)
  const [children, setChildren] = useState(paxChildren)
  const [infants, setInfants] = useState(paxInfants)
  const [rooming, setRooming] = useState<RoomingPreference[]>(
    roomingPreferences.length > 0 ? roomingPreferences : [{ type: 'DBL', count: 1 }]
  )

  // Budget editing state
  const [minBudget, setMinBudget] = useState(budgetMin?.toString() || '')
  const [maxBudget, setMaxBudget] = useState(budgetMax?.toString() || '')

  const totalPax = paxAdults + paxTeens + paxChildren + paxInfants

  const handleSaveDates = async () => {
    setSaving(true)
    try {
      await onUpdate({
        departureDateFrom: dateFrom || null,
        departureDateTo: dateTo || null,
        durationDays: duration ? parseInt(duration) : null
      })
      setEditingDates(false)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveTravelers = async () => {
    setSaving(true)
    try {
      await onUpdate({
        paxAdults: adults,
        paxTeens: teens,
        paxChildren: children,
        paxInfants: infants,
        roomingPreferences: rooming
      })
      setEditingTravelers(false)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveBudget = async () => {
    setSaving(true)
    try {
      await onUpdate({
        budgetMin: minBudget ? parseInt(minBudget) : null,
        budgetMax: maxBudget ? parseInt(maxBudget) : null
      })
      setEditingBudget(false)
    } finally {
      setSaving(false)
    }
  }

  const addRoom = () => {
    setRooming([...rooming, { type: 'DBL', count: 1 }])
  }

  const removeRoom = (index: number) => {
    setRooming(rooming.filter((_, i) => i !== index))
  }

  const updateRoom = (index: number, field: 'type' | 'count', value: string | number) => {
    setRooming(rooming.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Dates Card */}
      <Card className="relative group">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-xs font-medium">Dates</span>
            </div>
            <Popover open={editingDates} onOpenChange={setEditingDates}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-4">
                  <h4 className="font-medium">Modifier les dates</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Date de départ</Label>
                        <Input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Date de retour</Label>
                        <Input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Durée (jours)</Label>
                      <Input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="Ex: 14"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingDates(false)}>
                      <X className="h-3 w-3 mr-1" />
                      Annuler
                    </Button>
                    <Button size="sm" onClick={handleSaveDates} disabled={saving}>
                      <Check className="h-3 w-3 mr-1" />
                      Enregistrer
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <p className="font-semibold text-sm">
            {departureDateFrom
              ? format(new Date(departureDateFrom), 'dd MMM', { locale: fr })
              : '-'
            }
            {departureDateTo && (
              <> → {format(new Date(departureDateTo), 'dd MMM', { locale: fr })}</>
            )}
          </p>
          {durationDays && (
            <p className="text-xs text-muted-foreground">{durationDays} jours</p>
          )}
        </CardContent>
      </Card>

      {/* Travelers Card */}
      <Card className="relative group">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Voyageurs</span>
            </div>
            <Popover open={editingTravelers} onOpenChange={setEditingTravelers}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96" align="start">
                <div className="space-y-4">
                  <h4 className="font-medium">Modifier les voyageurs</h4>

                  {/* Traveler counts */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Adultes</p>
                        <p className="text-xs text-muted-foreground">18+ ans</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setAdults(Math.max(1, adults - 1))}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{adults}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setAdults(adults + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Adolescents</p>
                        <p className="text-xs text-muted-foreground">12-17 ans</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setTeens(Math.max(0, teens - 1))}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{teens}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setTeens(teens + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Enfants</p>
                        <p className="text-xs text-muted-foreground">2-11 ans</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setChildren(Math.max(0, children - 1))}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{children}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setChildren(children + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Bébés</p>
                        <p className="text-xs text-muted-foreground">0-2 ans</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setInfants(Math.max(0, infants - 1))}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{infants}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setInfants(infants + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Rooming preferences */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bed className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Rooming souhaité</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={addRoom}>
                        <Plus className="h-3 w-3 mr-1" />
                        Ajouter
                      </Button>
                    </div>
                    {rooming.map((room, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Select value={room.type} onValueChange={(v) => updateRoom(index, 'type', v)}>
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROOM_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label} ({type.abbr})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min={1}
                          className="w-16"
                          value={room.count}
                          onChange={(e) => updateRoom(index, 'count', parseInt(e.target.value) || 1)}
                        />
                        {rooming.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRoom(index)}>
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingTravelers(false)}>
                      <X className="h-3 w-3 mr-1" />
                      Annuler
                    </Button>
                    <Button size="sm" onClick={handleSaveTravelers} disabled={saving}>
                      <Check className="h-3 w-3 mr-1" />
                      Enregistrer
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <p className="font-semibold">{totalPax} pax</p>
          <div className="flex flex-wrap gap-1 mt-1">
            <span className="text-xs text-muted-foreground">{paxAdults} ad.</span>
            {paxTeens > 0 && <span className="text-xs text-muted-foreground">+ {paxTeens} ado.</span>}
            {paxChildren > 0 && <span className="text-xs text-muted-foreground">+ {paxChildren} enf.</span>}
            {paxInfants > 0 && <span className="text-xs text-muted-foreground">+ {paxInfants} bb.</span>}
          </div>
          {roomingPreferences.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {roomingPreferences.map((room, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {room.count}x {room.type}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Card */}
      <Card className="relative group">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="h-4 w-4" />
              <span className="text-xs font-medium">Budget</span>
            </div>
            <Popover open={editingBudget} onOpenChange={setEditingBudget}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="start">
                <div className="space-y-4">
                  <h4 className="font-medium">Modifier le budget</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Budget min</Label>
                      <Input
                        type="number"
                        value={minBudget}
                        onChange={(e) => setMinBudget(e.target.value)}
                        placeholder="Ex: 3000"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Budget max</Label>
                      <Input
                        type="number"
                        value={maxBudget}
                        onChange={(e) => setMaxBudget(e.target.value)}
                        placeholder="Ex: 5000"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingBudget(false)}>
                      <X className="h-3 w-3 mr-1" />
                      Annuler
                    </Button>
                    <Button size="sm" onClick={handleSaveBudget} disabled={saving}>
                      <Check className="h-3 w-3 mr-1" />
                      Enregistrer
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          {budgetMin || budgetMax ? (
            <p className="font-semibold text-sm">
              {budgetMin?.toLocaleString()} - {budgetMax?.toLocaleString()} €
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Non défini</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
