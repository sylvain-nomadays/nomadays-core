// Supabase Edge Function pour vérifier les dossiers à relancer
// Déclenché par un CRON externe (Vercel Cron, GitHub Actions, etc.)
//
// Pour déployer: supabase functions deploy check-reminders
// Pour tester: supabase functions invoke check-reminders

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Vérifier l'autorisation (clé secrète ou header spécifique)
    const authHeader = req.headers.get('Authorization')
    const cronSecret = Deno.env.get('CRON_SECRET')

    // Pour les appels CRON, vérifier le secret
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Permettre aussi les appels avec la clé service_role de Supabase
      if (!authHeader?.includes('service_role')) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Créer le client Supabase avec la clé service_role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Appeler les fonctions de vérification
    const results = {
      followUpReminders: 0,
      tripsStartingSoon: 0,
      errors: [] as string[],
    }

    // 1. Vérifier les dossiers à relancer
    const { data: followUpData, error: followUpError } = await supabase
      .rpc('check_follow_up_reminders')

    if (followUpError) {
      results.errors.push(`follow_up: ${followUpError.message}`)
    } else {
      results.followUpReminders = followUpData || 0
    }

    // 2. Vérifier les voyages qui commencent bientôt
    const { data: tripsData, error: tripsError } = await supabase
      .rpc('check_trips_starting_soon')

    if (tripsError) {
      results.errors.push(`trips: ${tripsError.message}`)
    } else {
      results.tripsStartingSoon = tripsData || 0
    }

    // Log pour le monitoring
    console.log('CRON check-reminders completed:', results)

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        ...results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('CRON check-reminders error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
