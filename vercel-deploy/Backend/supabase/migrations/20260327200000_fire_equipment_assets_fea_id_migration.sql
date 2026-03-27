-- ترحيل لمرة واحدة: تحويل معرفات أجهزة الحريق المخزّنة إلى التنسيق FEA-001، FEA-002، …
-- يُطبّق فقط على الصفوف التي لا تطابق ^FEA-[0-9]+$ (مثل EFA-… العشوائي أو EFA-0001 القديمة).
-- يحدّث data.id و data.qrCodeData عند الحاجة، ويربط fire_equipment_inspections.data.assetId بالمعرف الجديد.
-- نفّذ نسخة احتياطية أو راجع النتائج في بيئة تجريبية قبل الإنتاج.

DO $$
DECLARE
  max_seq int := 0;
  new_seq int;
  new_id text;
  old_data jsonb;
  r RECORD;
BEGIN
  SELECT COALESCE(MAX(
    CASE
      WHEN id ~* '^FEA-([0-9]+)$' THEN (regexp_match(id, '^FEA-([0-9]+)$', 'i'))[1]::int
      WHEN id ~* '^EFA-([0-9]+)$' THEN (regexp_match(id, '^EFA-([0-9]+)$', 'i'))[1]::int
      ELSE NULL
    END
  ), 0)
  INTO max_seq
  FROM public.fire_equipment_assets;

  new_seq := max_seq;

  CREATE TEMP TABLE _fe_assets_to_migrate ON COMMIT DROP AS
  SELECT id, data, created_at
  FROM public.fire_equipment_assets
  WHERE id !~* '^FEA-[0-9]+$'
  ORDER BY created_at NULLS LAST, id;

  FOR r IN SELECT * FROM _fe_assets_to_migrate
  LOOP
    LOOP
      new_seq := new_seq + 1;
      new_id := 'FEA-' || CASE
        WHEN new_seq < 1000 THEN lpad(new_seq::text, 3, '0')
        ELSE new_seq::text
      END;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.fire_equipment_assets WHERE id = new_id);
    END LOOP;

    old_data := COALESCE(r.data, '{}'::jsonb);
    old_data := jsonb_set(old_data, '{id}', to_jsonb(new_id::text), true);
    IF old_data ? 'qrCodeData' THEN
      IF (old_data->>'qrCodeData') = r.id OR old_data->>'qrCodeData' IS NULL OR btrim(old_data->>'qrCodeData') = '' THEN
        old_data := jsonb_set(old_data, '{qrCodeData}', to_jsonb(new_id::text), true);
      END IF;
    ELSE
      old_data := jsonb_set(old_data, '{qrCodeData}', to_jsonb(new_id::text), true);
    END IF;

    INSERT INTO public.fire_equipment_assets (id, data, created_at, updated_at)
    VALUES (new_id, old_data, COALESCE(r.created_at, now()), now());

    UPDATE public.fire_equipment_inspections
    SET
      data = jsonb_set(data, '{assetId}', to_jsonb(new_id::text), true),
      updated_at = now()
    WHERE data->>'assetId' = r.id;

    DELETE FROM public.fire_equipment_assets WHERE id = r.id;
  END LOOP;
END $$;
