# مراجعة تطابق أسماء الشركات والأعداد – تقرير شامل (موظف / مقاول)

## الهدف
التأكد من أن أسماء الشركات/المقاولين تطابق الأعداد بشكل صحيح بين:
1. **الاستعلام - تقرير شامل (موظف / مقاول)** في لوحة التحكم (Dashboard)
2. **نموذج العرض (تحليل مفصل)** في موديول المقاولين (زر "عرض")

---

## مصادر المقاول في التقرير الشامل
- **البحث:** كود المقاول أو اسم الشركة (من قائمة المعتمدين `approvedContractors`).
- **المطابقة:** تطابق تام للكود/الاسم، أو احتواء الاسم (المرة الأولى)، ثم احتواء في المرحلة الثانية إن لم يُعثر عليه.

---

## منطق المطابقة الموحد (بعد المراجعة)

### 1. بناء هويات المقاول (idsSet و namesSet)
- **idsSet:** يضم `id`, `contractorId`, `code`, `isoCode` (بعد تطبيع: trim + lowercase).
- **namesSet:** يضم `companyName` / `name` للمقاول (أصلي + lowercase).
- **التطبيع:** `replace(/\s+/g, ' ').trim()` لأسماء السجلات لمعالجة المسافات المتعددة.

### 2. دالة matchesContractor(record)
- مطابقة بالمعرف: `contractorId`, `contractorCode`, `code` مع `idsSet` (بعد تطبيع).
- مطابقة بالاسم: من الحقول  
  `contractorName`, `companyName`, `company`, `contractorCompany`, `name`, **`externalName`**, **`contractorWorkerName`**  
  مع `namesSet` أو بتطابق/احتواء مع اسم المقاول (بدون تمييز حالة).
- **ملاحظة:** إضافة `externalName` و `contractorWorkerName` تضمن مطابقة زيارة العيادة والجهات الخارجية مع نفس المقاول في التقرير ونموذج العرض.

### 3. التصاريح (PTW)
- **مصادر البيانات:** `ptw` + **`ptwRegistry`** (في التقرير الشامل ونموذج العرض).
- **الحقول المعتمدة:** `requestingParty`, `authorizedParty`, **`responsible`** (بعد `replace(/\s+/g, ' ').trim()`).
- **المطابقة:** تطابق تام أو احتواء متبادل لاسم المقاول (بدون تمييز حالة).

### 4. التدريب
- **مصادر:** `training` (برامج بمشاركين) + `contractorTrainings`.
- **participants:** إن كان الحقل نصاً (JSON) يتم `JSON.parse` ثم معالجة المصفوفة (في التقرير ونموذج العرض).
- **سجل تدريب المقاولين:** مطابقة بـ `matchesContractor(ct)` مع **احتياطي اسمي** (تطابق/احتواء لـ `contractorName` / `companyName`) لضمان عد نفس السجلات.

### 5. التقييمات والمخالفات والعيادة والإصابات
- **التقييمات:** فلترة بـ `contractorId` (مع idsSet) أو `matchesContractor(e)`.
- **المخالفات:** فلترة بـ `contractorId` أو `matchesContractor(v)` مع احتياطي اسمي لـ `contractorName`.
- **العيادة:** `clinicVisits` + `clinicContractorVisits`، مع `matchesContractor(c)` (يشمل الآن `externalName` و `contractorWorkerName`).
- **الإصابات:** `personType === 'contractor'` مع `matchesContractor(inj)` أو مطابقة اسمية احتياطية.

---

## التعديلات المطبقة (بدون تغيير بنية المشروع)

### في `dashboard.js` (تقرير شامل للمقاول)
1. **rName في matchesContractor:** إضافة `record.externalName` و `record.contractorWorkerName` وتطبيع المسافات.
2. **التدريب – participants:** تحليل `participants` إذا كانت نصاً (JSON) قبل الاعتماد على المصفوفة.
3. **سجل تدريب المقاولين:** إضافة مطابقة احتياطية بالاسم (تطابق/احتواء) كما في نموذج العرض.
4. **التصاريح:** دمج `ptwRegistry` مع `ptw`، وإضافة مطابقة بحقل `responsible` وتطبيع المسافات في `requestingParty` و `authorizedParty`.

### في `contractors.js` (نموذج العرض)
- المنطق الحالي كان قد ضُمِّن فيه: externalName/contractorWorkerName، ptw+ptwRegistry، تحليل participants، احتياطي اسمي لتدريب المقاولين، ومطابقة التصاريح بـ responsible. لم تُجرَ تغييرات بنيوية إضافية في هذه المراجعة.

---

## النتيجة
- **تطابق أسماء الشركات:** نفس المقاول (بنفس الكود أو الاسم) يُعامل بشكل موحد في التقرير الشامل ونموذج العرض.
- **تطابق الأعداد:** التصاريح، التدريب، العيادة، الإصابات، التقييمات، والمخالفات تُحسب من نفس المصادر ونفس قواعد المطابقة في الموضعين.
- **بدون تغيير في البنية:** التعديلات داخل `dashboard.js` و `contractors.js` فقط، ولا إضافة ملفات أو واجهات جديدة.

---
*تاريخ المراجعة: 2025*
