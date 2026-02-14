import { NextRequest, NextResponse } from 'next/server'
import { sendAppointmentReminders } from '@/lib/actions/appointments'

/**
 * POST /api/cron/appointment-reminders
 *
 * Sends J-1 reminder emails for confirmed appointments happening tomorrow.
 * Secured by CRON_SECRET header — called daily by APScheduler (backend)
 * or Vercel Cron.
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  const secret = request.headers.get('x-cron-secret')
  const expected = process.env.CRON_SECRET

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await sendAppointmentReminders()

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[cron/appointment-reminders] Unhandled error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also allow GET for Vercel Cron (which sends GET by default)
export async function GET(request: NextRequest) {
  return POST(request)
}
