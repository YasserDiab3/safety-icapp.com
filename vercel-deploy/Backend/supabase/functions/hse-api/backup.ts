/**
 * نسخ احتياطي كامل واستعادة — جداول id+jsonb + رموز استعادة كلمة المرور
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SETTINGS_ROW_ID = "default";
const BUCKET = "hse-backups";
const SNAPSHOT_VERSION = 1;

type JsonResponse = (data: unknown, status?: number) => Response;

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

async function getBackupTableNames(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase.rpc("list_hse_backup_tables");
  if (error || !Array.isArray(data)) {
    console.warn("[backup] list_hse_backup_tables failed:", error?.message);
    return [];
  }
  return (data as string[]).filter((t) => typeof t === "string" && t.length > 0);
}

async function exportTableRows(
  supabase: SupabaseClient,
  table: string,
): Promise<Record<string, unknown>[]> {
  if (table === "users") {
    const { data, error } = await supabase
      .from("users")
      .select("id, data, password_hash, permissions, created_at, updated_at");
    if (error) {
      console.warn(`[backup] export users:`, error.message);
      return [];
    }
    return (data || []) as Record<string, unknown>[];
  }
  const { data, error } = await supabase.from(table).select("id, data, created_at, updated_at");
  if (error) {
    console.warn(`[backup] export ${table}:`, error.message);
    return [];
  }
  return (data || []) as Record<string, unknown>[];
}

async function exportPasswordResetTokens(supabase: SupabaseClient): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.from("password_reset_tokens").select("*");
  if (error) {
    console.warn("[backup] password_reset_tokens:", error.message);
    return [];
  }
  return (data || []) as Record<string, unknown>[];
}

function countRecords(snapshot: Record<string, unknown>): number {
  let n = 0;
  const tables = snapshot.tables as Record<string, unknown[]> | undefined;
  if (tables && typeof tables === "object") {
    for (const k of Object.keys(tables)) {
      const arr = tables[k];
      if (Array.isArray(arr)) n += arr.length;
    }
  }
  const prt = snapshot.password_reset_tokens as unknown[] | undefined;
  if (Array.isArray(prt)) n += prt.length;
  return n;
}

async function buildFullSnapshot(supabase: SupabaseClient): Promise<{
  snapshot: Record<string, unknown>;
  tablesCount: number;
  totalRecords: number;
}> {
  const names = await getBackupTableNames(supabase);
  const tables: Record<string, unknown[]> = {};
  for (const t of names) {
    tables[t] = await exportTableRows(supabase, t);
  }
  const password_reset_tokens = await exportPasswordResetTokens(supabase);
  const snapshot: Record<string, unknown> = {
    formatVersion: SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    tables,
    password_reset_tokens,
  };
  const totalRecords = countRecords(snapshot);
  return { snapshot, tablesCount: Object.keys(tables).length, totalRecords };
}

async function getBackupSettingsData(supabase: SupabaseClient): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.from("backup_settings").select("data").eq("id", SETTINGS_ROW_ID).maybeSingle();
  if (error || !data) {
    return {};
  }
  const row = data as { data?: Record<string, unknown> };
  return row.data && typeof row.data === "object" ? row.data : {};
}

async function saveBackupSettingsData(supabase: SupabaseClient, data: Record<string, unknown>) {
  const now = new Date().toISOString();
  await supabase.from("backup_settings").upsert(
    { id: SETTINGS_ROW_ID, data, updated_at: now },
    { onConflict: "id" },
  );
}

async function pruneOldBackups(
  supabase: SupabaseClient,
  settings: Record<string, unknown>,
) {
  const maxFiles = Math.min(100, Math.max(1, Number(settings.maxBackupFiles) || 30));
  const retentionDays = Math.min(365, Math.max(1, Number(settings.retentionDays) || 30));
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  const { data: rows, error } = await supabase.from("backup_log").select("id, data, created_at").order("created_at", { ascending: false });
  if (error || !rows?.length) return;

  const toDelete: { id: string; path?: string }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] as { id: string; data?: Record<string, unknown>; created_at?: string };
    const d = r.data || {};
    const created = r.created_at ? new Date(r.created_at).getTime() : 0;
    const tooOld = created > 0 && created < cutoff;
    const overMax = i >= maxFiles;
    if (tooOld || overMax) {
      const path = typeof d.storagePath === "string" ? d.storagePath : undefined;
      toDelete.push({ id: r.id, path });
    }
  }

  for (const item of toDelete) {
    if (item.path) {
      const segment = item.path.replace(/^hse-backups\//, "").replace(/^\//, "");
      await supabase.storage.from(BUCKET).remove([segment]);
    }
    await supabase.from("backup_log").delete().eq("id", item.id);
  }
}

async function upsertUserRow(
  supabase: SupabaseClient,
  row: Record<string, unknown>,
) {
  const id = String(row.id ?? "");
  if (!id) return;
  const data = (row.data as Record<string, unknown>) || {};
  const ph = row.password_hash ?? data.passwordHash;
  const perms = row.permissions;
  const payload: Record<string, unknown> = {
    id,
    data,
    updated_at: new Date().toISOString(),
  };
  if (ph != null) payload.password_hash = ph;
  if (perms != null && typeof perms === "object") payload.permissions = perms;
  if (row.created_at) payload.created_at = row.created_at;
  await supabase.from("users").upsert(payload, { onConflict: "id" });
}

async function upsertStandardRow(
  supabase: SupabaseClient,
  table: string,
  row: Record<string, unknown>,
) {
  const id = String(row.id ?? "");
  if (!id) return;
  const payload: Record<string, unknown> = {
    id,
    data: (row.data as Record<string, unknown>) || {},
    updated_at: row.updated_at || new Date().toISOString(),
  };
  if (row.created_at) payload.created_at = row.created_at;
  await supabase.from(table).upsert(payload, { onConflict: "id" });
}

async function restoreFromSnapshot(supabase: SupabaseClient, snapshot: Record<string, unknown>) {
  const tables = snapshot.tables as Record<string, unknown[]> | undefined;
  if (!tables || typeof tables !== "object") {
    throw new Error("ملف النسخة غير صالح: لا توجد جداول");
  }

  const names = Object.keys(tables).sort();
  for (const table of names) {
    const rows = tables[table];
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      if (table === "users") {
        await upsertUserRow(supabase, row as Record<string, unknown>);
      } else {
        await upsertStandardRow(supabase, table, row as Record<string, unknown>);
      }
    }
  }

  const prt = snapshot.password_reset_tokens as Record<string, unknown>[] | undefined;
  if (Array.isArray(prt) && prt.length > 0) {
    const { data: existingTok } = await supabase.from("password_reset_tokens").select("id");
    for (const e of existingTok || []) {
      await supabase.from("password_reset_tokens").delete().eq("id", (e as { id: string }).id);
    }
    const chunk = 50;
    for (let i = 0; i < prt.length; i += chunk) {
      const batch = prt.slice(i, i + chunk);
      const { error: insErr } = await supabase.from("password_reset_tokens").insert(batch);
      if (insErr) throw new Error(insErr.message);
    }
  }
}

export async function handleBackupAction(
  action: string,
  payload: unknown,
  supabase: SupabaseClient,
  json: JsonResponse,
): Promise<Response | null> {
  const p = payload as Record<string, unknown>;

  const runCreateBackup = async (backupType: "manual" | "automatic") => {
    const userData = (p.userData as Record<string, unknown>) || {};
    const started = Date.now();
    const backupId = `BKUP-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const { snapshot, tablesCount, totalRecords } = await buildFullSnapshot(supabase);
    const jsonBytes = new TextEncoder().encode(JSON.stringify(snapshot));
    const fileSizeBytes = jsonBytes.byteLength;
    const storagePath = `full/${backupId}.json` as const;

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(storagePath, jsonBytes, {
      contentType: "application/json",
      upsert: false,
    });

    if (upErr) {
      const errMsg = upErr.message || String(upErr);
      await supabase.from("backup_log").insert({
        id: backupId,
        data: {
          backupName: `نسخة فاشلة ${new Date().toISOString()}`,
          backupType,
          status: "failed",
          createdAt: new Date().toISOString(),
          createdBy: String(userData.email || userData.name || "system"),
          createdById: String(userData.id || ""),
          error: errMsg,
          durationMs: Date.now() - started,
        },
        updated_at: new Date().toISOString(),
      });
      return json({ success: false, message: "فشل رفع ملف النسخة: " + errMsg }, 400);
    }

    const meta = {
      backupName: backupType === "manual"
        ? `نسخة يدوية ${new Date().toLocaleString("ar-SA")}`
        : `نسخة تلقائية ${new Date().toLocaleString("ar-SA")}`,
      backupType,
      status: "completed",
      createdAt: new Date().toISOString(),
      createdBy: String(userData.email || userData.name || "system"),
      createdById: String(userData.id || ""),
      storagePath: `${BUCKET}/${storagePath}`,
      fileSizeBytes,
      durationMs: Date.now() - started,
      tablesCount,
      totalRecords,
      formatVersion: SNAPSHOT_VERSION,
    };

    await supabase.from("backup_log").insert({
      id: backupId,
      data: meta,
      updated_at: new Date().toISOString(),
    });

    const settings = await getBackupSettingsData(supabase);
    if (backupType === "automatic") {
      await saveBackupSettingsData(supabase, {
        ...settings,
        lastAutoBackupAt: new Date().toISOString(),
      });
    }

    await pruneOldBackups(supabase, settings);

    return json({
      success: true,
      message: "تم إنشاء النسخة الاحتياطية بنجاح",
      data: { backupId, ...meta },
    });
  };

  if (action === "createManualBackup" || action === "createFullBackup") {
    return await runCreateBackup("manual");
  }

  if (action === "runScheduledBackupCheck" || action === "maybeRunAutoBackup") {
    const settings = await getBackupSettingsData(supabase);
    if (!settings.autoBackupEnabled) {
      return json({ success: true, data: { ran: false, reason: "disabled" } });
    }
    const intervalDays = Math.min(30, Math.max(1, Number(settings.backupIntervalDays) || 1));
    const lastStr = settings.lastAutoBackupAt as string | undefined;
    const last = lastStr ? new Date(lastStr).getTime() : 0;
    const minIntervalMs = intervalDays * 24 * 60 * 60 * 1000;
    if (last && Date.now() - last < minIntervalMs) {
      return json({ success: true, data: { ran: false, reason: "not_due" } });
    }
    return await runCreateBackup("automatic");
  }

  if (action === "getBackupStatistics") {
    const { data: rows, error } = await supabase.from("backup_log").select("id, data, created_at");
    if (error) return json({ success: false, message: error.message }, 400);
    const list = (rows || []) as { id: string; data?: Record<string, unknown> }[];
    let successful = 0;
    let failed = 0;
    let lastOk: string | null = null;
    let totalBytes = 0;
    for (const r of list) {
      const st = r.data?.status;
      if (st === "completed") {
        successful++;
        const ca = r.data?.createdAt as string | undefined;
        if (ca && (!lastOk || ca > lastOk)) lastOk = ca;
        totalBytes += Number(r.data?.fileSizeBytes) || 0;
      } else if (st === "failed") failed++;
    }
    const total = list.length;
    const rate = total > 0 ? Math.round((successful / total) * 100) : 0;
    return json({
      success: true,
      data: {
        totalBackups: total,
        successfulBackups: successful,
        failedBackups: failed,
        successRate: `${rate}%`,
        lastSuccessfulBackup: lastOk ? { date: lastOk } : null,
        totalStorageUsed: formatBytes(totalBytes),
      },
    });
  }

  if (action === "getAllBackups") {
    const { data: rows, error } = await supabase.from("backup_log").select("id, data, created_at").order("created_at", { ascending: false });
    if (error) return json({ success: false, message: error.message }, 400);
    const out = (rows || []).map((r: { id: string; data?: Record<string, unknown>; created_at?: string }) => {
      const d = r.data || {};
      const size = Number(d.fileSizeBytes) || 0;
      const durSec = Math.round((Number(d.durationMs) || 0) / 1000);
      return {
        id: r.id,
        backupName: d.backupName || r.id,
        createdAt: d.createdAt || r.created_at,
        createdBy: d.createdBy || "—",
        status: d.status === "failed" ? "failed" : "completed",
        backupType: d.backupType || "manual",
        fileSizeFormatted: formatBytes(size),
        sheetsCount: d.tablesCount ?? 0,
        totalRecords: d.totalRecords ?? 0,
        duration: durSec,
        fileUrl: d.storagePath ? null : null,
      };
    });
    return json({ success: true, data: out });
  }

  if (action === "getBackupSettings") {
    const data = await getBackupSettingsData(supabase);
    return json({
      success: true,
      data: {
        autoBackupEnabled: !!data.autoBackupEnabled,
        maxBackupFiles: Number(data.maxBackupFiles) || 30,
        retentionDays: Number(data.retentionDays) || 30,
        notifyOnBackup: data.notifyOnBackup !== false,
        notifyOnFailure: data.notifyOnFailure !== false,
        backupIntervalDays: Math.min(30, Math.max(1, Number(data.backupIntervalDays) || 1)),
        backupScheduleHour: Math.min(23, Math.max(0, Number(data.backupScheduleHour) || 2)),
      },
    });
  }

  if (action === "saveBackupSettings") {
    const prev = await getBackupSettingsData(supabase);
    const merged = {
      ...prev,
      autoBackupEnabled: !!p.autoBackupEnabled,
      maxBackupFiles: Math.min(100, Math.max(1, parseInt(String(p.maxBackupFiles), 10) || 30)),
      retentionDays: Math.min(365, Math.max(1, parseInt(String(p.retentionDays), 10) || 30)),
      notifyOnBackup: p.notifyOnBackup !== false,
      notifyOnFailure: p.notifyOnFailure !== false,
      backupIntervalDays: Math.min(30, Math.max(1, parseInt(String(p.backupIntervalDays), 10) || 1)),
      backupScheduleHour: Math.min(23, Math.max(0, parseInt(String(p.backupScheduleHour), 10) || 2)),
      updatedAt: new Date().toISOString(),
    };
    await saveBackupSettingsData(supabase, merged);
    return json({ success: true, message: "تم حفظ الإعدادات" });
  }

  if (action === "downloadBackup") {
    const backupId = String(p.backupId || "").trim();
    if (!backupId) return json({ success: false, message: "backupId مطلوب" }, 400);
    const { data: row, error } = await supabase.from("backup_log").select("data").eq("id", backupId).maybeSingle();
    if (error || !row) return json({ success: false, message: "النسخة غير موجودة" }, 404);
    const sp = (row as { data?: Record<string, unknown> }).data?.storagePath as string | undefined;
    if (!sp) return json({ success: false, message: "لا يوجد ملف مرتبط بهذه النسخة" }, 400);
    const segment = sp.replace(/^hse-backups\//, "").replace(/^\//, "");
    const { data: signed, error: signErr } = await supabase.storage.from(BUCKET).createSignedUrl(segment, 3600);
    if (signErr || !signed?.signedUrl) {
      return json({ success: false, message: signErr?.message || "تعذر إنشاء رابط التحميل" }, 400);
    }
    return json({
      success: true,
      data: {
        downloadUrl: signed.signedUrl,
        fileUrl: signed.signedUrl,
      },
    });
  }

  if (action === "deleteBackup") {
    const backupId = String(p.backupId || "").trim();
    if (!backupId) return json({ success: false, message: "backupId مطلوب" }, 400);
    const { data: row, error } = await supabase.from("backup_log").select("data").eq("id", backupId).maybeSingle();
    if (error) return json({ success: false, message: error.message }, 400);
    const sp = (row as { data?: Record<string, unknown> } | null)?.data?.storagePath as string | undefined;
    if (sp) {
      const segment = sp.replace(/^hse-backups\//, "").replace(/^\//, "");
      await supabase.storage.from(BUCKET).remove([segment]);
    }
    await supabase.from("backup_log").delete().eq("id", backupId);
    return json({ success: true, message: "تم حذف النسخة" });
  }

  if (action === "restoreFullBackup") {
    const backupId = String(p.backupId || "").trim();
    const confirm = String(p.confirmRestore || "").trim();
    if (!backupId) return json({ success: false, message: "backupId مطلوب" }, 400);
    if (confirm !== "RESTORE") {
      return json({ success: false, message: 'يجب إرسال confirmRestore بقيمة "RESTORE" لتأكيد الاستعادة' }, 400);
    }
    const { data: row, error } = await supabase.from("backup_log").select("data").eq("id", backupId).maybeSingle();
    if (error || !row) return json({ success: false, message: "النسخة غير موجودة" }, 404);
    const sp = (row as { data?: Record<string, unknown> }).data?.storagePath as string | undefined;
    if (!sp) return json({ success: false, message: "لا يوجد ملف للنسخة" }, 400);
    const segment = sp.replace(/^hse-backups\//, "").replace(/^\//, "");
    const { data: fileData, error: dlErr } = await supabase.storage.from(BUCKET).download(segment);
    if (dlErr || !fileData) {
      return json({ success: false, message: dlErr?.message || "تعذر قراءة ملف النسخة" }, 400);
    }
    const text = await fileData.text();
    let snapshot: Record<string, unknown>;
    try {
      snapshot = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return json({ success: false, message: "ملف النسخة تالف أو ليس JSON صالحاً" }, 400);
    }
    if (Number(snapshot.formatVersion) !== SNAPSHOT_VERSION) {
      return json({ success: false, message: "إصدار ملف النسخة غير مدعوم" }, 400);
    }
    try {
      await restoreFromSnapshot(supabase, snapshot);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return json({ success: false, message: "فشلت الاستعادة: " + msg }, 500);
    }
    return json({ success: true, message: "تمت استعادة البيانات من النسخة الاحتياطية" });
  }

  return null;
}
