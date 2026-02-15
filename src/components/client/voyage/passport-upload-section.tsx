'use client'

import { useState, useRef, useTransition } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  IdentificationBadge,
  ShieldCheck,
  UploadSimple,
  CheckCircle,
  ArrowCounterClockwise,
  X,
  PaperPlaneTilt,
  Eye,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { applyWatermark, applyWatermarkPreview, buildWatermarkText } from '@/lib/utils/watermark'
import { clientUploadPassportCopy } from '@/lib/actions/client-modifications'
import type { ContinentTheme } from '../continent-theme'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParticipantInfo {
  id: string
  first_name: string
  last_name: string
}

interface PassportDoc {
  id: string
  participant_id: string | null
  created_at: string
  download_url: string | null
}

interface PassportUploadSectionProps {
  participants: { is_lead: boolean; participant: ParticipantInfo }[]
  dossierId: string
  currentParticipantId: string
  currentParticipantName: string
  isLead: boolean
  existingPassportDocs: PassportDoc[]
  continentTheme: ContinentTheme
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PassportUploadSection({
  participants,
  dossierId,
  currentParticipantId,
  currentParticipantName,
  isLead,
  existingPassportDocs,
  continentTheme,
}: PassportUploadSectionProps) {
  const [isPending, startTransition] = useTransition()
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [watermarkedBlob, setWatermarkedBlob] = useState<Blob | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadTarget, setUploadTarget] = useState<ParticipantInfo | null>(null)
  const [processingPreview, setProcessingPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Build a map: participant_id → passport doc
  const passportByParticipant = new Map<string, PassportDoc>()
  existingPassportDocs.forEach((doc) => {
    if (doc.participant_id) {
      passportByParticipant.set(doc.participant_id, doc)
    }
  })

  // ─── Handle file selection ──────────────────────────────────────────────────

  const handleFileSelect = async (participant: ParticipantInfo, file: File) => {
    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Seules les images JPEG, PNG et WebP sont acceptées.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Le fichier ne doit pas dépasser 10 Mo.')
      return
    }

    setUploadTarget(participant)
    setSelectedFile(file)
    setProcessingPreview(true)

    try {
      // Apply watermark and generate preview
      const watermarkText = buildWatermarkText()
      const [blob, previewDataUrl] = await Promise.all([
        applyWatermark(file, watermarkText),
        applyWatermarkPreview(file, watermarkText),
      ])
      setWatermarkedBlob(blob)
      setPreviewUrl(previewDataUrl)
      setPreviewDialogOpen(true)
    } catch (err) {
      console.error('Error applying watermark:', err)
      alert('Erreur lors du traitement de l\'image. Veuillez réessayer.')
    } finally {
      setProcessingPreview(false)
    }
  }

  const handleUploadClick = (participant: ParticipantInfo) => {
    setUploadTarget(participant)
    // Trigger hidden file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && uploadTarget) {
      handleFileSelect(uploadTarget, file)
    }
  }

  // ─── Handle confirmed upload ────────────────────────────────────────────────

  const handleConfirmUpload = () => {
    if (!watermarkedBlob || !uploadTarget) return

    startTransition(async () => {
      try {
        const formData = new FormData()
        const ext = watermarkedBlob.type === 'image/png' ? '.png' : '.jpg'
        formData.append('file', watermarkedBlob, `passeport_${uploadTarget.first_name}_${uploadTarget.last_name}${ext}`)

        await clientUploadPassportCopy({
          dossierId,
          requestingParticipantId: currentParticipantId,
          requestingParticipantName: currentParticipantName,
          targetParticipantId: uploadTarget.id,
          targetParticipantName: `${uploadTarget.first_name} ${uploadTarget.last_name}`.trim(),
          formData,
        })

        // Cleanup
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewDialogOpen(false)
        setPreviewUrl(null)
        setWatermarkedBlob(null)
        setSelectedFile(null)
        setUploadTarget(null)
      } catch (err: any) {
        console.error('Upload error:', err)
        alert(err?.message || 'Erreur lors de l\'envoi. Veuillez réessayer.')
      }
    })
  }

  const handleCancelPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewDialogOpen(false)
    setPreviewUrl(null)
    setWatermarkedBlob(null)
    setSelectedFile(null)
    setUploadTarget(null)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 pb-2">
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${continentTheme.primary}12` }}
          >
            <IdentificationBadge size={18} weight="duotone" style={{ color: continentTheme.primary }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Copies de passeport</h3>
            <p className="text-xs text-gray-500">
              Envoyez la copie de votre passeport pour les réservations (vols, visas, hôtels).
            </p>
          </div>
        </div>

        {/* Participant rows */}
        <div className="px-4 pb-3 space-y-2">
          {participants.map((dp) => {
            const p = dp.participant
            const isSelf = p.id === currentParticipantId
            const canUpload = isSelf || isLead
            const existingDoc = passportByParticipant.get(p.id)
            const isCurrentlyUploading = isPending && uploadTarget?.id === p.id

            return (
              <div
                key={p.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-50/70"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Avatar */}
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ backgroundColor: `${continentTheme.primary}15`, color: continentTheme.primary }}
                  >
                    {p.first_name?.[0]}{p.last_name?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {p.first_name} {p.last_name}
                    </p>
                    {existingDoc && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle size={11} weight="fill" />
                        Envoyé le{' '}
                        {format(new Date(existingDoc.created_at), 'd MMM yyyy', { locale: fr })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {existingDoc?.download_url && (
                    <a
                      href={existingDoc.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      title="Voir le document"
                    >
                      <Eye size={14} weight="duotone" />
                    </a>
                  )}
                  {canUpload && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUploadClick(p)}
                      disabled={isCurrentlyUploading || processingPreview}
                      className="gap-1.5 text-xs h-7 px-2.5"
                    >
                      {existingDoc ? (
                        <>
                          <ArrowCounterClockwise size={12} weight="bold" />
                          Renvoyer
                        </>
                      ) : (
                        <>
                          <UploadSimple size={12} weight="bold" />
                          Uploader
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Security notice */}
        <div className="px-4 pb-4">
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-green-50/70 border border-green-100">
            <ShieldCheck size={16} weight="duotone" className="text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-green-700 leading-relaxed">
              Vos documents sont protégés par un filigrane Nomadays. Ils ne peuvent pas être réutilisés en dehors du cadre de votre voyage.
            </p>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* ─── Preview Dialog ──────────────────────────────────────────────── */}
      <Dialog open={previewDialogOpen} onOpenChange={(open) => { if (!open) handleCancelPreview() }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <ShieldCheck size={20} weight="duotone" className="text-green-600" />
              Vérification du filigrane
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Passeport de {uploadTarget ? `${uploadTarget.first_name} ${uploadTarget.last_name}` : ''}
            </DialogDescription>
          </DialogHeader>

          {/* Watermarked image preview */}
          <div className="my-3">
            {previewUrl ? (
              <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Passeport avec filigrane"
                  className="w-full h-auto max-h-[50vh] object-contain"
                />
              </div>
            ) : (
              <div className="h-48 rounded-lg bg-gray-100 flex items-center justify-center">
                <p className="text-sm text-gray-400">Chargement de l&apos;aperçu...</p>
              </div>
            )}
          </div>

          {/* Reassurance message */}
          <div className="flex items-start gap-2.5 px-3 py-3 rounded-lg bg-green-50 border border-green-100">
            <ShieldCheck size={18} weight="duotone" className="text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-green-700 leading-relaxed space-y-1">
              <p className="font-medium">Un filigrane de protection Nomadays a été ajouté.</p>
              <p>
                Ce document ne pourra pas être utilisé en dehors de l&apos;organisation de votre voyage.
                Seul votre conseiller de voyage y aura accès.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-3 gap-2">
            <Button
              variant="outline"
              onClick={handleCancelPreview}
              disabled={isPending}
            >
              <X size={14} className="mr-1.5" />
              Annuler
            </Button>
            <Button
              onClick={handleConfirmUpload}
              disabled={isPending || !watermarkedBlob}
              style={{ backgroundColor: continentTheme.primary }}
              className="text-white"
            >
              <PaperPlaneTilt size={14} className="mr-1.5" />
              {isPending ? 'Envoi en cours...' : 'Confirmer et envoyer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
