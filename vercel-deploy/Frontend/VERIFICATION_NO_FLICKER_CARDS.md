# تقرير التحقق: إلغاء الكود المسبب للوميض وتثبيت الكروت

## 1. الكود المُلغى (كان يسبب الوميض)

| العنصر | الحالة | التفاصيل |
|--------|--------|----------|
| **قواعد CSS: إخفاء القيم ثم إظهارها** | ✅ مُلغى بالكامل | لا يوجد في `reports-statistics-card.css` أي `visibility: hidden` أو `visibility: visible` مرتبط بـ `kpis-values-ready` أو بعناصر القيم (#fa-value, #tir-value, #lti-value, #trir-value, #incident-reports-value, ...). |
| **الإطار الثاني requestAnimationFrame** | ✅ مُلغى | كان يُستدعى rAF ثانٍ لإضافة الصنف بعد التحديث. الآن التحديث وإضافة `kpis-values-ready` يتمان داخل **نفس** الإطار (السطور 2104–2162 في dashboard.js). |
| **إزالة الصنف kpis-values-ready** | ✅ غير مستخدم أبداً | لا يوجد في المشروع أي `classList.remove('kpis-values-ready')`. التعليق في السطر 2044 يوضح: «لا نزيل kpis-values-ready أبداً». |

---

## 2. التحقق في ملفات CSS

### reports-statistics-card.css
- **لا وجود لـ:** `:not(.kpis-values-ready)`, `visibility: hidden`, `visibility: visible` لأي عنصر قيم كروت.
- **موجود:** تعطيل الوميض عبر `animation: none !important` و `transition: none !important` على:
  - `.reports-statistics-section .metrics-grid-container` و `.metric-card-frame`
  - `.safety-metrics-section .metrics-grid-container` و `.metric-card-frame`
  - عناصر القيم: `#fa-value`, `#tir-value`, `#lti-value`, `#trir-value` وجميع `#incident-reports-value`, `#nearmiss-reports-value`, ... و `p[id$="-value"]`.
- **موجود:** `contain: layout style` على إطارات الكروت وعناصر القيم لتقليل إعادة الرسم.

### باقي ملفات CSS (dashboard-enhanced, dashboard-layout-final, safety-metrics-card)
- لا توجد قواعد `visibility: hidden` على عناصر الكروت أو قيمها.
- توجد قواعد `visibility: visible` لضمان ظهور المحتوى (لا تسبب وميضاً).

---

## 3. التحقق في dashboard.js

### دالة updateKPIs()
- **استدعاء واحد لـ requestAnimationFrame:** كل التحديثات (العناصر العامة + calculateSafetyMetrics + applyReportsStatisticsUpdates) تتم داخل **نفس** الاستدعاء (السطور 2104–2162).
- **إضافة الصنف في نفس الإطار:** `classList.add('kpis-values-ready')` يُستدعى في نهاية نفس الـ rAF (2156–2157)، وليس داخل rAF ثانٍ.
- **لا إزالة للصنف:** لا يوجد في الملف أي `classList.remove('kpis-values-ready')`.

### تحديث القيم
- **calculateSafetyMetrics:** يحدّث فقط عبر `getElementById` ثم `element.textContent = ...` و `applyEnglishNumberFormat` (2224–2243). لا يستخدم innerHTML ولا يلمس بنية الـ DOM للكروت.
- **applyReportsStatisticsUpdates → updateReportValue / updateConsumptionValue:** تحديث عبر `getElementById` و `element.textContent` و `element.classList.add('english-number')` فقط. لا استبدال لعناصر ولا إخفاء.

### عدم استبدال DOM للكروت
- **أقسام الكروت:** `.safety-metrics-section` و `.reports-statistics-section` معرّفة في **index.html** (حوالي 6047 و 6133) ولا يُعاد إنشاؤها أو استبدالها من الـ JS.
- **استخدام innerHTML في dashboard.js:** يقتصر على حاويات أخرى (مثل `dashboard-reports-widget`, `employee-report-data`, `contractor-report-data`, `recent-activities`, `user-tasks-widget`, إلخ). **لا يُستدعى innerHTML على الحاويات التي تحتوي الكروت (safety-metrics-section / reports-statistics-section).**

---

## 4. مسارات استدعاء updateKPIs

| المصدر | الملف | التأثير على الوميض |
|--------|--------|---------------------|
| Dashboard.load() | dashboard.js:13 | عند فتح لوحة التحكم: تحديث قيم فقط، لا إعادة بناء. |
| refreshIncidents() | dashboard.js:2268 | تحديث قيم فقط. |
| (من داخل Dashboard) | dashboard.js:3112 | تحديث قيم فقط. |
| PTW (عدة مواضع) | ptw.js | استدعاء Dashboard/updateKPIs لتحديث الأرقام فقط. |
| app-ui (بعد المزامنة) | app-ui.js:2454–2456 | عند currentSection === 'dashboard' يتم استدعاء Dashboard.load() → updateKPIs(). نفس السلوك: تحديث قيم، لا إخفاء ولا إعادة بناء. |
| realtime-sync-manager | realtime-sync-manager.js:1270–1271 | يستدعي PTW.updateKPIs وليس Dashboard.updateKPIs. لا يغيّر بنية كروت الـ Dashboard. |

في كل هذه المسارات يتم فقط تحديث القيم (textContent) وإضافة الصنف مرة واحدة دون إزالته، دون إخفاء أو إعادة إنشاء للكروت.

---

## 5. خلاصة التحقق

- **الكود الذي كان يسبب الوميض (إخفاء القيم ثم إظهارها حسب الصنف، والإطار الثاني من rAF) مُلغى ولا يظهر في الكود الحالي.**
- **التحديث الحالي يعمل بتحديث القيم فقط (textContent) في إطار رسم واحد، مع إضافة kpis-values-ready في نفس الإطار وعدم إزالة الصنف أبداً.**
- **لا يُستخدم display:none ولا visibility toggle للكروت أو قيمها، ولا يتم إعادة بناء DOM لأقسام الكروت عند التحميل أو المزامنة أو تسجيل الدخول.**
- **تم تعطيل animation و transition على إطارات الكروت وعناصر القيم في reports-statistics-card.css لتفادي أي وميض أو إعادة رسم غير ضرورية.**

تم التحقق بتاريخ الملف.
