-- =============================================================================
-- Pro-Attendance — full database schema
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- STEP 1: Create all tables (no RLS policies yet)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  employee_id text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'employee'
    CHECK (role IN ('employee', 'admin')),
  registered_device_id text,
  must_change_password boolean NOT NULL DEFAULT true,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.office_networks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  ssid_name text NOT NULL,
  bssid text NOT NULL,
  added_by uuid REFERENCES public.employees (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT office_networks_bssid_unique UNIQUE (bssid)
);

CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.employees (id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('IN', 'OUT')),
  punched_at timestamptz NOT NULL DEFAULT now(),
  bssid_at_scan text,
  network_label text,
  ip_at_punch text,
  qr_verified boolean NOT NULL DEFAULT false
);

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS ip_at_punch text;

CREATE TABLE IF NOT EXISTS public.office_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL DEFAULT 'Office Network',
  public_ip text NOT NULL,
  added_by uuid REFERENCES public.employees (id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.office_qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_token text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  generated_by uuid REFERENCES public.employees (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.employees (id) ON DELETE CASCADE,
  leave_type text NOT NULL CHECK (leave_type IN ('Sick', 'Casual', 'Paid')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  rejection_reason text,
  status text NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  reviewed_by uuid REFERENCES public.employees (id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leave_requests_dates_check CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.employees (id) ON DELETE CASCADE,
  subscription jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_user_unique UNIQUE (user_id)
);

-- =============================================================================
-- STEP 2: Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS employees_role_idx ON public.employees (role);
CREATE INDEX IF NOT EXISTS attendance_user_punched_idx
  ON public.attendance (user_id, punched_at DESC);
CREATE INDEX IF NOT EXISTS attendance_punched_at_idx
  ON public.attendance (punched_at DESC);
CREATE INDEX IF NOT EXISTS office_qr_codes_active_idx
  ON public.office_qr_codes (is_active)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS leave_requests_user_idx
  ON public.leave_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS leave_requests_status_idx
  ON public.leave_requests (status);

-- =============================================================================
-- STEP 3: Helper function (must run AFTER employees table exists)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

-- =============================================================================
-- STEP 4: Enable RLS + policies
-- =============================================================================

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employees_select_own_or_admin" ON public.employees;
CREATE POLICY "employees_select_own_or_admin"
  ON public.employees FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "employees_update_own_or_admin" ON public.employees;
CREATE POLICY "employees_update_own_or_admin"
  ON public.employees FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "employees_delete_admin" ON public.employees;
CREATE POLICY "employees_delete_admin"
  ON public.employees FOR DELETE
  TO authenticated
  USING (public.is_admin());

ALTER TABLE public.office_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "office_config_admin_all" ON public.office_config;
CREATE POLICY "office_config_admin_all"
  ON public.office_config FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.office_networks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "office_networks_select_authenticated" ON public.office_networks;
CREATE POLICY "office_networks_select_authenticated"
  ON public.office_networks FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "office_networks_insert_admin" ON public.office_networks;
CREATE POLICY "office_networks_insert_admin"
  ON public.office_networks FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "office_networks_delete_admin" ON public.office_networks;
CREATE POLICY "office_networks_delete_admin"
  ON public.office_networks FOR DELETE
  TO authenticated
  USING (public.is_admin());

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_select_own_or_admin" ON public.attendance;
CREATE POLICY "attendance_select_own_or_admin"
  ON public.attendance FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

ALTER TABLE public.office_qr_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "office_qr_codes_select_admin" ON public.office_qr_codes;
CREATE POLICY "office_qr_codes_select_admin"
  ON public.office_qr_codes FOR SELECT
  TO authenticated
  USING (public.is_admin());

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leave_requests_select_own_or_admin" ON public.leave_requests;
CREATE POLICY "leave_requests_select_own_or_admin"
  ON public.leave_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "leave_requests_insert_own" ON public.leave_requests;
CREATE POLICY "leave_requests_insert_own"
  ON public.leave_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions_select_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_select_own"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "push_subscriptions_insert_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_insert_own"
  ON public.push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "push_subscriptions_delete_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_delete_own"
  ON public.push_subscriptions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "push_subscriptions_update_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_update_own"
  ON public.push_subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- STEP 5: Realtime (admin dashboard)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'attendance'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
  END IF;
END $$;

-- =============================================================================
-- Done. Next: npm run seed
-- =============================================================================
