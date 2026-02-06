'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Star, ChevronLeft, ChevronRight, ArrowUpDown, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toggleDossierHot } from '@/lib/actions/dossiers'
import { getStatusConfig, getLanguageConfig } from '@/lib/constants'
import type { DossierStatus } from '@/lib/supabase/database.types'
import { toast } from 'sonner'

interface DossierWithRelations {
  id: string
  reference: string
  title: string
  status: DossierStatus
  language: string
  is_hot: boolean
  created_at: string
  last_activity_at: string
  advisor?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
    avatar_url: string | null
  } | null
  participants?: Array<{
    participant: { id: string; first_name: string; last_name: string; email: string } | null
    is_lead: boolean
  }>
}

interface DossiersListViewProps {
  dossiers: DossierWithRelations[]
  totalCount: number
}

export function DossiersListView({ dossiers, totalCount }: DossiersListViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loadingHot, setLoadingHot] = useState<string | null>(null)

  const currentPage = parseInt(searchParams.get('page') || '1')
  const pageSize = 50
  const totalPages = Math.ceil(totalCount / pageSize)

  const handleToggleHot = async (e: React.MouseEvent, id: string, currentHot: boolean) => {
    e.preventDefault()
    e.stopPropagation()
    setLoadingHot(id)
    try {
      await toggleDossierHot(id, !currentHot)
      toast.success(currentHot ? 'Retiré des favoris' : 'Ajouté aux favoris')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setLoadingHot(null)
    }
  }

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (page === 1) {
      params.delete('page')
    } else {
      params.set('page', page.toString())
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead className="w-24">Réf.</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Contact principal</TableHead>
              <TableHead className="w-32">Statut</TableHead>
              <TableHead className="w-36">Manager</TableHead>
              <TableHead className="w-36">Créé le</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dossiers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Aucun dossier trouvé
                </TableCell>
              </TableRow>
            ) : (
              dossiers.map((dossier) => {
                const statusConfig = getStatusConfig(dossier.status)!
                const langConfig = getLanguageConfig(dossier.language)!
                const leadParticipant = dossier.participants?.find((p: any) => p.is_lead)?.participant

                return (
                  <TableRow
                    key={dossier.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => router.push(`/admin/dossiers/${dossier.id}`)}
                  >
                    {/* Hot star */}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-7 w-7 ${dossier.is_hot ? 'text-orange-500' : 'text-muted-foreground/50 hover:text-muted-foreground'}`}
                        onClick={(e) => handleToggleHot(e, dossier.id, dossier.is_hot)}
                        disabled={loadingHot === dossier.id}
                      >
                        <Star className={`h-4 w-4 ${dossier.is_hot ? 'fill-current' : ''}`} />
                      </Button>
                    </TableCell>

                    {/* Reference + language */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/admin/dossiers/${dossier.id}`}
                          className="font-mono text-sm text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {dossier.reference}
                        </Link>
                        <span className="text-sm">{langConfig.flag}</span>
                      </div>
                    </TableCell>

                    {/* Title */}
                    <TableCell>
                      <span className="font-medium">{dossier.title}</span>
                    </TableCell>

                    {/* Lead participant */}
                    <TableCell>
                      {leadParticipant ? (
                        <div>
                          <p className="text-sm">
                            {leadParticipant.first_name} {leadParticipant.last_name}
                          </p>
                          {leadParticipant.email && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {leadParticipant.email}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: statusConfig.color,
                          color: statusConfig.color,
                          backgroundColor: `${statusConfig.color}10`
                        }}
                      >
                        {statusConfig.label}
                      </Badge>
                    </TableCell>

                    {/* Advisor */}
                    <TableCell>
                      {dossier.advisor ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={dossier.advisor.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {dossier.advisor.first_name?.[0]}{dossier.advisor.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {dossier.advisor.first_name} {dossier.advisor.last_name?.[0]}.
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    {/* Created */}
                    <TableCell>
                      <div>
                        <p className="text-sm">
                          {format(new Date(dossier.created_at), 'dd/MM/yyyy', { locale: fr })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(dossier.created_at), 'HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {totalCount} dossier{totalCount > 1 ? 's' : ''} au total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} sur {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
