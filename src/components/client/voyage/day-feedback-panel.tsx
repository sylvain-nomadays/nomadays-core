'use client'

import { useState, useCallback } from 'react'
import {
  Heart,
  PencilSimple,
  ChatCircle,
  PaperPlaneTilt,
  SpinnerGap,
  Check,
  Timer,
} from '@phosphor-icons/react'
import {
  toggleDayReaction,
  submitDayComment,
  setDayPace,
  type ReactionType,
  type PaceType,
} from '@/lib/actions/day-feedback'
import type { ContinentTheme } from '../continent-theme'

// ─── Types ───────────────────────────────────────────────────────────────────

interface DayFeedbackPanelProps {
  tripDayId: number
  dayNumber: number
  dayTitle: string | null
  dossierId: string
  participantId: string
  participantEmail: string
  participantName: string
  advisorEmail: string
  advisorName: string
  initialReaction: ReactionType | null
  initialPace: PaceType
  continentTheme: ContinentTheme
}

// ─── Pace config ─────────────────────────────────────────────────────────────

const PACE_OPTIONS: { value: PaceType; label: string; icon: string }[] = [
  { value: 'slower', label: '- Rythmé', icon: '🐢' },
  { value: 'normal', label: 'Normal', icon: '🚶' },
  { value: 'faster', label: '+ Rythmé', icon: '🏃' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function DayFeedbackPanel({
  tripDayId,
  dayNumber,
  dayTitle,
  dossierId,
  participantId,
  participantEmail,
  participantName,
  advisorEmail,
  advisorName,
  initialReaction,
  initialPace,
  continentTheme,
}: DayFeedbackPanelProps) {
  const [reaction, setReaction] = useState<ReactionType | null>(initialReaction)
  const [pace, setPace] = useState<PaceType>(initialPace)
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  // ── Reaction handler ──

  const handleReaction = useCallback(
    async (type: ReactionType) => {
      const prevReaction = reaction
      // Optimistic update
      setReaction(reaction === type ? null : type)

      // Auto-open comment if "modify"
      if (type === 'modify' && reaction !== 'modify') {
        setShowComment(true)
      }

      try {
        const result = await toggleDayReaction({
          tripDayId,
          dossierId,
          participantId,
          reaction: type,
        })
        setReaction(result.reaction)
      } catch {
        // Revert on error
        setReaction(prevReaction)
      }
    },
    [reaction, tripDayId, dossierId, participantId],
  )

  // ── Comment handler ──

  const handleSubmitComment = useCallback(async () => {
    if (!comment.trim() || sending) return

    setSending(true)
    try {
      await submitDayComment({
        dossierId,
        tripDayId,
        dayNumber,
        dayTitle,
        participantId,
        participantEmail,
        participantName,
        advisorEmail,
        advisorName,
        bodyText: comment.trim(),
      })
      setComment('')
      setSent(true)
      setTimeout(() => setSent(false), 3000)
    } catch (err) {
      console.error('Failed to send comment:', err)
    } finally {
      setSending(false)
    }
  }, [
    comment,
    sending,
    dossierId,
    tripDayId,
    dayNumber,
    dayTitle,
    participantId,
    participantEmail,
    participantName,
    advisorEmail,
    advisorName,
  ])

  // ── Pace handler ──

  const handlePaceChange = useCallback(
    async (newPace: PaceType) => {
      if (newPace === pace) return
      const prevPace = pace
      setPace(newPace) // Optimistic

      try {
        await setDayPace({
          tripDayId,
          dossierId,
          participantId,
          pace: newPace,
        })
      } catch {
        setPace(prevPace) // Revert
      }
    },
    [pace, tripDayId, dossierId, participantId],
  )

  return (
    <div className="print:hidden pt-3 border-t border-gray-100 mt-4 space-y-3">
      {/* ── Row: Reactions + Comment toggle + Pace adapter ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Reaction: J'adore */}
        <button
          onClick={() => handleReaction('love')}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all"
          style={
            reaction === 'love'
              ? { backgroundColor: continentTheme.primary, color: '#fff' }
              : { backgroundColor: '#F3F4F6', color: '#4B5563' }
          }
        >
          <Heart
            size={14}
            weight={reaction === 'love' ? 'fill' : 'duotone'}
          />
          J&apos;adore
        </button>

        {/* Reaction: À modifier */}
        <button
          onClick={() => handleReaction('modify')}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all"
          style={
            reaction === 'modify'
              ? { backgroundColor: '#FDF2F0', color: '#C97A56', border: '1px solid #E8AB91' }
              : { backgroundColor: '#F3F4F6', color: '#4B5563', border: '1px solid transparent' }
          }
        >
          <PencilSimple size={14} weight="duotone" />
          À modifier
        </button>

        {/* Comment toggle */}
        <button
          onClick={() => setShowComment(!showComment)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChatCircle size={14} weight="duotone" />
          Commenter
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Pace adapter — compact 3-segment toggle */}
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-full p-0.5">
          <Timer size={13} weight="duotone" className="text-gray-400 ml-1.5 mr-0.5" />
          {PACE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handlePaceChange(option.value)}
              className="px-2.5 py-1 rounded-full text-[10px] font-medium transition-all whitespace-nowrap"
              style={
                pace === option.value
                  ? { backgroundColor: continentTheme.primary, color: '#fff' }
                  : { color: '#6B7280' }
              }
            >
              <span className="mr-0.5">{option.icon}</span> {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Comment panel (collapsible) ── */}
      {showComment && (
        <div className="animate-in slide-in-from-top-2 duration-200">
          <div className="relative">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                reaction === 'modify'
                  ? 'Décrivez les modifications souhaitées...'
                  : 'Votre commentaire sur cette journée...'
              }
              rows={3}
              className="w-full text-sm resize-none border border-gray-200 rounded-xl p-3 pr-12 focus:outline-none focus:ring-2 transition-shadow"
              style={{ '--tw-ring-color': continentTheme.primary } as React.CSSProperties}
            />
            <button
              onClick={handleSubmitComment}
              disabled={!comment.trim() || sending}
              className="absolute bottom-3 right-3 h-8 w-8 rounded-lg flex items-center justify-center text-white disabled:opacity-40 transition-opacity"
              style={{ backgroundColor: continentTheme.primary }}
              title="Envoyer"
            >
              {sending ? (
                <SpinnerGap size={16} className="animate-spin" />
              ) : (
                <PaperPlaneTilt size={16} weight="fill" />
              )}
            </button>
          </div>
          {sent && (
            <p
              className="text-xs mt-1.5 flex items-center gap-1 font-medium"
              style={{ color: continentTheme.primary }}
            >
              <Check size={12} weight="bold" /> Message envoyé dans le Salon de Thé
            </p>
          )}
        </div>
      )}
    </div>
  )
}
