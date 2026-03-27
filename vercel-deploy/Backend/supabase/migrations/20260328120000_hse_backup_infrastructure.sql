-- HSE: بنية النسخ الاحتياطي — اكتشاف جداول البيانات + حاوية تخزين للملفات

-- جداول التطبيق: id (text) + data (jsonb) — استثناء backup_log (يُخزَّن فيه سجل النسخ فقط)
CREATE OR REPLACE FUNCTION public.list_hse_backup_tables()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    array_agg(c.relname::text ORDER BY c.relname)
    FILTER (WHERE c.relname IS NOT NULL),
    '{}'::text[]
  )
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname <> 'backup_log'
    AND EXISTS (
      SELECT 1 FROM information_schema.columns col
      WHERE col.table_schema = 'public' AND col.table_name = c.relname AND col.column_name = 'id'
    )
    AND EXISTS (
      SELECT 1 FROM information_schema.columns col
      WHERE col.table_schema = 'public' AND col.table_name = c.relname
        AND col.column_name = 'data' AND col.data_type = 'jsonb'
    );
$$;

COMMENT ON FUNCTION public.list_hse_backup_tables() IS 'قائمة أسماء جداول بيانات التطبيق للنسخ الاحتياطي الكامل';

GRANT EXECUTE ON FUNCTION public.list_hse_backup_tables() TO anon, authenticated, service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hse-backups',
  'hse-backups',
  false,
  524288000,
  ARRAY['application/json', 'application/octet-stream', 'text/plain']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
