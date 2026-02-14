-- ============================================================
-- 00025 — Appointment Booking System
-- ============================================================
-- Tables:
--   1. advisor_availability  — Weekly recurring schedule per advisor
--   2. advisor_blocked_dates — Specific dates when advisor is unavailable
--   3. appointments          — Booked appointment slots
-- ============================================================

-- ── 1. Advisor availability (weekly schedule) ────────────────────────────────

CREATE TABLE IF NOT EXISTS advisor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/Paris',
  slot_duration_minutes INTEGER NOT NULL DEFAULT 60,

  -- Working hours per day (NULL = day off)
  monday_start TIME,    monday_end TIME,
  tuesday_start TIME,   tuesday_end TIME,
  wednesday_start TIME, wednesday_end TIME,
  thursday_start TIME,  thursday_end TIME,
  friday_start TIME,    friday_end TIME,
  saturday_start TIME,  saturday_end TIME,
  sunday_start TIME,    sunday_end TIME,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

CREATE INDEX idx_advisor_availability_tenant ON advisor_availability(tenant_id);
CREATE INDEX idx_advisor_availability_user ON advisor_availability(user_id);

-- Auto-update updated_at
CREATE TRIGGER trg_advisor_availability_updated_at
  BEFORE UPDATE ON advisor_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ── 2. Advisor blocked dates (vacations, sick leave, etc.) ───────────────────

CREATE TABLE IF NOT EXISTS advisor_blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  reason VARCHAR(100),  -- 'vacation', 'sick_leave', 'training', 'other'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_advisor_blocked_dates_user ON advisor_blocked_dates(user_id, date_from, date_to);
CREATE INDEX idx_advisor_blocked_dates_tenant ON advisor_blocked_dates(tenant_id);

-- ── 3. Appointments (booked slots) ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  dossier_id UUID NOT NULL REFERENCES dossiers(id),
  advisor_id UUID NOT NULL REFERENCES users(id),
  participant_id UUID NOT NULL REFERENCES participants(id),

  -- Time slot
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone VARCHAR(50) NOT NULL,

  -- Denormalized info (for emails & display without extra joins)
  participant_name VARCHAR(255),
  participant_email VARCHAR(255),
  advisor_name VARCHAR(255),
  advisor_email VARCHAR(255),
  note TEXT,  -- Optional message from client

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'cancelled_by_client', 'cancelled_by_advisor', 'completed', 'no_show')),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Notification tracking
  confirmation_sent_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appointments_advisor_date ON appointments(advisor_id, appointment_date, status);
CREATE INDEX idx_appointments_dossier ON appointments(dossier_id);
CREATE INDEX idx_appointments_participant ON appointments(participant_id);
CREATE INDEX idx_appointments_tenant ON appointments(tenant_id);

-- Auto-update updated_at
CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE advisor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Service role has full access (server actions use service_role key)
CREATE POLICY "service_role_advisor_availability" ON advisor_availability
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "service_role_advisor_blocked_dates" ON advisor_blocked_dates
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "service_role_appointments" ON appointments
  FOR ALL USING (true) WITH CHECK (true);

-- ── GRANTs for service_role ─────────────────────────────────────────────────

GRANT ALL ON advisor_availability TO service_role;
GRANT ALL ON advisor_blocked_dates TO service_role;
GRANT ALL ON appointments TO service_role;
