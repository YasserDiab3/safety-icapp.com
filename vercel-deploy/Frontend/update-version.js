const fs = require('fs');
const path = require('path');

/**
 * نسخة مطابقة تقريباً من سكربت Frontend/update-version.js
 * للاستخدام في سياقات النشر داخل vercel-deploy عند الحاجة.
 *
 * ملاحظة: يتم حساب جذر المشروع هنا بالرجوع مستويين لأعلى
 * لأن الملف يقع داخل vercel-deploy/frontend/.
 */

function updateJsonVersion(filePath, newVersion) {
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
        console.warn(`⚠️ الملف غير موجود (تخطي): ${absPath}`);
        return;
    }
    const raw = fs.readFileSync(absPath, 'utf8');
    let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        console.error(`❌ تعذر قراءة JSON من: ${absPath}`, e);
        process.exitCode = 1;
        return;
    }
    if (!data || typeof data !== 'object') {
        console.error(`❌ محتوى غير متوقع في: ${absPath}`);
        process.exitCode = 1;
        return;
    }
    data.version = newVersion;
    fs.writeFileSync(absPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`✅ تم تحديث version في ${filePath} إلى ${newVersion}`);
}

function updateAppStateVersion(filePath, newVersion) {
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
        console.warn(`⚠️ الملف غير موجود (تخطي): ${absPath}`);
        return;
    }
    const raw = fs.readFileSync(absPath, 'utf8');
    const regex = /(appVersion\s*:\s*')[^']*(')/;
    if (!regex.test(raw)) {
        console.warn(`⚠️ لم يتم العثور على appVersion في: ${filePath} (تخطي)`);
        return;
    }
    const updated = raw.replace(regex, `$1${newVersion}$2`);
    fs.writeFileSync(absPath, updated, 'utf8');
    console.log(`✅ تم تحديث AppState.appVersion في ${filePath} إلى ${newVersion}`);
}

function updateVersionInfoTxt(filePath, newVersion) {
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
        console.warn(`⚠️ الملف غير موجود (تخطي): ${absPath}`);
        return;
    }
    const raw = fs.readFileSync(absPath, 'utf8');
    const regex = /(الإصدار:\s*)[0-9.]+/;
    if (!regex.test(raw)) {
        console.warn(`⚠️ لم يتم العثور على سطر "الإصدار:" في: ${filePath} (تخطي)`);
        return;
    }
    const updated = raw.replace(regex, `$1${newVersion}`);
    fs.writeFileSync(absPath, updated, 'utf8');
    console.log(`✅ تم تحديث سطر الإصدار في ${filePath} إلى ${newVersion}`);
}

function resolveVersion(root) {
    const arg = process.argv[2];

    // نمط يدوي صريح X.Y.Z
    if (arg && /^\d+\.\d+\.\d+$/.test(arg)) {
        return arg;
    }

    // نمط تلقائي: auto أو بدون معاملات → قراءة Frontend/version.json وزيادة رقم الـ patch
    const versionJsonPath = path.join(root, 'Frontend', 'version.json');
    if (!fs.existsSync(versionJsonPath)) {
        console.error('❌ لم يتم العثور على Frontend/version.json لتوليد الإصدار التلقائي.');
        process.exit(1);
    }
    const raw = fs.readFileSync(versionJsonPath, 'utf8');
    let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        console.error('❌ تعذر قراءة JSON من Frontend/version.json', e);
        process.exit(1);
    }
    const current = (data && data.version && typeof data.version === 'string') ? data.version.trim() : '1.0.0';
    const match = current.match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (!match) {
        console.error(`❌ تنسيق الإصدار الحالي غير مدعوم: "${current}" (المطلوب: X.Y.Z)`);
        process.exit(1);
    }
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    const patch = parseInt(match[3], 10) + 1;
    const autoVersion = `${major}.${minor}.${patch}`;
    console.log(`ℹ️ وضع التحديث التلقائي: زيادة patch من ${current} إلى ${autoVersion}`);
    return autoVersion;
}

function main() {
    // هذا الملف موجود داخل vercel-deploy/frontend/ → نحتاج الرجوع مستويين إلى جذر المشروع
    const root = path.resolve(__dirname, '..', '..');
    const newVersion = resolveVersion(root);

    console.log(`🚀 بدء تحديث رقم الإصدار إلى: ${newVersion}`);

    // Frontend JSON
    updateJsonVersion(path.join(root, 'Frontend', 'package.json'), newVersion);
    updateJsonVersion(path.join(root, 'Frontend', 'version.json'), newVersion);

    // vercel-deploy JSON
    updateJsonVersion(path.join(root, 'vercel-deploy', 'frontend', 'version.json'), newVersion);

    // AppState.appVersion (Frontend + vercel-deploy)
    updateAppStateVersion(path.join(root, 'Frontend', 'js', 'modules', 'app-utils.js'), newVersion);
    updateAppStateVersion(path.join(root, 'vercel-deploy', 'frontend', 'js', 'modules', 'app-utils.js'), newVersion);

    // VERSION_INFO.txt (Backend + vercel-deploy/backend)
    updateVersionInfoTxt(path.join(root, 'Backend', 'VERSION_INFO.txt'), newVersion);
    updateVersionInfoTxt(path.join(root, 'vercel-deploy', 'backend', 'VERSION_INFO.txt'), newVersion);

    console.log('✅ اكتمل تحديث رقم الإصدار في جميع الملفات المستهدفة.');
}

main();

