-- =============================================================================
-- Bootstrap login system for new Supabase project
-- Project ref: nrnshxbwikpeboalsoal
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Core tables required by frontend login/auth flow
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  password_hash text,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- لو كان users موجوداً مسبقاً (من ترحيلات أقدم) فقد لا يحتوي الأعمدة المطلوبة.
-- لذلك نضيفها بأمان قبل أي INSERT/UPDATE.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.company_settings (
  id text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_settings_db (
  id text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_sites (
  id text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_places (
  id text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_tasks (
  id text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Indexes for login and reset-password flow
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_email_data ON public.users ((lower(coalesce(data->>'email', id))));
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON public.users(updated_at);
CREATE INDEX IF NOT EXISTS idx_users_password_hash_not_null ON public.users(id) WHERE password_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);

-- -----------------------------------------------------------------------------
-- Data normalization for existing rows
-- -----------------------------------------------------------------------------
UPDATE public.users
SET permissions = COALESCE(data->'permissions', '{}'::jsonb)
WHERE permissions IS NULL OR permissions = '{}'::jsonb;

UPDATE public.users
SET password_hash = data->>'passwordHash'
WHERE (password_hash IS NULL OR password_hash = '')
  AND COALESCE(data->>'passwordHash', '') <> '';

-- -----------------------------------------------------------------------------
-- Seed/Upsert admin user (aligned with current frontend)
-- Email: yasser.diab@icapp.com.eg
-- Password: 123@654
-- -----------------------------------------------------------------------------
INSERT INTO public.users (id, data, password_hash, permissions, updated_at)
VALUES (
  'yasser.diab@icapp.com.eg',
  jsonb_build_object(
    'name', 'Yasser Diab',
    'email', 'yasser.diab@icapp.com.eg',
    'role', 'admin',
    'active', true,
    'department', 'إدارة النظام',
    'passwordChanged', true,
    'forcePasswordChange', false
  ),
  encode(digest('123@654', 'sha256'), 'hex'),
  '{}'::jsonb,
  now()
)
ON CONFLICT (id) DO UPDATE
SET
  data = public.users.data || excluded.data || jsonb_build_object('role', 'admin', 'active', true),
  password_hash = excluded.password_hash,
  updated_at = now();

COMMENT ON TABLE public.users IS 'Core auth users table used by frontend login and permissions';
COMMENT ON TABLE public.password_reset_tokens IS 'Password reset tokens for forgot-password flow';
