# إعداد المشروع على Supabase الجديد

هذا الملف يشرح تفعيل المشروع بالكامل على قاعدة Supabase الجديدة:

- **Project URL:** `https://nrnshxbwikpeboalsoal.supabase.co`
- **Project Ref:** `nrnshxbwikpeboalsoal`
- **Anon Key (JWT):** القيمة المحدثة داخل الواجهة
- **Publishable Key:** `sb_publishable_H4fiPhFuFZwx3C8La0np0Q_1rIEkcW7`

## 1) ربط المشروع

```powershell
cd "d:\Apps\2026\safety-icapp.com\vercel-deploy\Backend\supabase"
supabase login
supabase link --project-ref nrnshxbwikpeboalsoal
```

## 2) إنشاء الجداول (Schema + Login System)

```powershell
supabase db push
```

> سيتم تنفيذ جميع ملفات `migrations` بما فيها:
> - `20260326110000_bootstrap_login_system_for_new_project.sql`
>   (تهيئة جداول تسجيل الدخول واسترجاع كلمة المرور + مستخدم مدير افتراضي)

## 3) نشر Edge Function

```powershell
supabase functions deploy hse-api
```

## 4) ضبط أسرار الدالة (Secrets)

```powershell
supabase secrets set HSE_ANON_KEY="ضع_هنا_قيمة_anon_jwt"
supabase secrets set RESEND_API_KEY="ضع_مفتاح_Resend_إن_كنت_تستخدم_استرجاع_كلمة_المرور_بالبريد"
supabase secrets set RESEND_FROM_EMAIL="Password Reset <onboarding@resend.dev>"
```

## 5) بيانات دخول أولية بعد التهيئة

الترحيل يضيف/يحدّث المستخدم:

- **Email:** `yasser.diab@icapp.com.eg`
- **Password:** `123@654`
- **Role:** `admin`

> بعد أول دخول، يفضل تغيير كلمة المرور من داخل النظام.
