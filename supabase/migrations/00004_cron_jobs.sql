-- ============================================================
-- CRON JOBS avec pg_cron
-- ============================================================

-- Activer l'extension pg_cron (doit être fait par un superuser)
-- Note: Sur Supabase, pg_cron est disponible sur les plans Pro+
-- Pour le plan Free, utilisez une Edge Function ou un service externe

-- Vérifier si pg_cron est disponible
DO $$
BEGIN
  -- Tenter d'activer pg_cron
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'pg_cron extension requires superuser privileges. Use Edge Functions or external CRON instead.';
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron extension not available: %', SQLERRM;
END $$;

-- Si pg_cron est disponible, créer les jobs
DO $$
BEGIN
  -- Vérifier si pg_cron est installé
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN

    -- Job 1: Vérifier les dossiers à relancer tous les jours à 8h00 (UTC)
    -- Note: Supabase utilise UTC, donc 8h00 UTC = 9h00 Paris (hiver) ou 10h00 Paris (été)
    PERFORM cron.schedule(
      'check-follow-up-reminders',           -- nom du job
      '0 8 * * *',                           -- tous les jours à 8h00 UTC
      $$SELECT check_follow_up_reminders()$$ -- commande SQL
    );

    -- Job 2: Vérifier les voyages qui commencent bientôt (dans 7 jours)
    PERFORM cron.schedule(
      'check-trips-starting-soon',
      '0 7 * * *',                           -- tous les jours à 7h00 UTC
      $$SELECT check_trips_starting_soon()$$
    );

    -- Job 3: Nettoyer les vieilles notifications (> 60 jours, lues)
    PERFORM cron.schedule(
      'cleanup-old-notifications',
      '0 3 * * 0',                           -- tous les dimanches à 3h00 UTC
      $$DELETE FROM notifications WHERE is_read = TRUE AND created_at < NOW() - INTERVAL '60 days'$$
    );

    -- Job 4: Nettoyer la queue d'emails envoyés (> 30 jours)
    PERFORM cron.schedule(
      'cleanup-email-queue',
      '0 3 * * 0',                           -- tous les dimanches à 3h00 UTC
      $$DELETE FROM email_queue WHERE status = 'sent' AND sent_at < NOW() - INTERVAL '30 days'$$
    );

    RAISE NOTICE 'CRON jobs created successfully with pg_cron';

  ELSE
    RAISE NOTICE 'pg_cron not available. Please use Edge Functions or external CRON service.';
  END IF;
END $$;

-- ============================================================
-- FONCTION: Vérifier les voyages qui commencent bientôt
-- ============================================================

CREATE OR REPLACE FUNCTION check_trips_starting_soon()
RETURNS INTEGER AS $$
DECLARE
  v_dossier RECORD;
  v_participant_name VARCHAR(255);
  v_count INTEGER := 0;
  v_days_until_trip INTEGER;
BEGIN
  -- Trouver les dossiers confirmés dont le voyage commence dans 7 jours
  FOR v_dossier IN
    SELECT d.id, d.reference, d.title, d.advisor_id, d.departure_date_from
    FROM dossiers d
    WHERE d.status IN ('confirmed', 'deposit_paid', 'fully_paid')
      AND d.departure_date_from IS NOT NULL
      AND d.departure_date_from::date = (CURRENT_DATE + INTERVAL '7 days')::date
      AND d.advisor_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.dossier_id = d.id
          AND n.type = 'trip_starting_soon'
          AND n.created_at > NOW() - INTERVAL '7 days'
      )
  LOOP
    v_days_until_trip := (v_dossier.departure_date_from::date - CURRENT_DATE);

    -- Récupérer le nom du participant principal
    SELECT CONCAT(p.first_name, ' ', p.last_name) INTO v_participant_name
    FROM dossier_participants dp
    JOIN participants p ON dp.participant_id = p.id
    WHERE dp.dossier_id = v_dossier.id AND dp.is_lead = TRUE
    LIMIT 1;

    -- Créer la notification
    PERFORM create_notification(
      v_dossier.advisor_id,
      'trip_starting_soon',
      'Voyage dans 7 jours',
      CONCAT('Dossier ', v_dossier.reference, ' - ', COALESCE(v_participant_name, v_dossier.title), ' part dans 7 jours'),
      v_dossier.id,
      v_dossier.reference,
      v_participant_name,
      jsonb_build_object('days_until_trip', v_days_until_trip)
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Pour voir les jobs programmés (si pg_cron est actif)
-- ============================================================
-- SELECT * FROM cron.job;

-- Pour désactiver un job
-- SELECT cron.unschedule('check-follow-up-reminders');

-- Pour voir l'historique d'exécution
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
