-- Clinic module: supply requests + medication deletion requests
-- Needed for approvals and supply-request tabs.

CREATE TABLE IF NOT EXISTS public.supply_requests (
  id text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supply_requests_updated ON public.supply_requests(updated_at);

CREATE TABLE IF NOT EXISTS public.medication_deletion_requests (
  id text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medication_deletion_requests_updated ON public.medication_deletion_requests(updated_at);

