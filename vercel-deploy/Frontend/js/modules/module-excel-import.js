/**
 * استيراد Excel — نقطة دخول موحدة لكل الأقسام والتبويبات النشطة
 */
(function (global) {
    'use strict';

    var SKIP_SECTIONS = {
        dashboard: true,
        'ai-assistant': true,
        apptester: true,
        settings: true
    };

    function notify(msg, type) {
        type = type || 'info';
        if (typeof Notification !== 'undefined') {
            if (type === 'warning' && Notification.warning) Notification.warning(msg);
            else if (type === 'error' && Notification.error) Notification.error(msg);
            else if (Notification.info) Notification.info(msg);
            else if (Notification.show) Notification.show(msg);
        } else {
            try {
                alert(msg);
            } catch (e) {}
        }
    }

    function getSectionEl(sectionName) {
        return document.getElementById(String(sectionName) + '-section');
    }

    function getTrainingActiveTab(section) {
        var btn = section && section.querySelector('.tab-btn.active[data-tab]');
        return btn ? btn.getAttribute('data-tab') : null;
    }

    function getClinicActiveTab(section) {
        var btn = section && section.querySelector('.clinic-tab-btn.active[data-tab]');
        return btn ? btn.getAttribute('data-tab') : null;
    }

    function getPtwActiveTab(section) {
        var active = section && section.querySelector('.ptw-tab-btn.text-blue-600.bg-blue-50');
        if (!active) active = section && section.querySelector('.ptw-tab-btn.bg-blue-50');
        if (!active) return null;
        var id = active.id || '';
        if (id.indexOf('registry') !== -1) return 'registry';
        if (id.indexOf('permits') !== -1) return 'permits';
        if (id.indexOf('map') !== -1) return 'map';
        if (id.indexOf('analysis') !== -1) return 'analysis';
        if (id.indexOf('approvals') !== -1) return 'approvals';
        return null;
    }

    function open(sectionName) {
        if (!sectionName) sectionName = (global.AppState && global.AppState.currentSection) || '';
        sectionName = String(sectionName).trim();

        if (SKIP_SECTIONS[sectionName]) {
            notify('استيراد Excel غير متاح في هذا القسم.', 'info');
            return;
        }

        var section = getSectionEl(sectionName);

        try {
            switch (sectionName) {
                case 'users':
                    if (typeof global.Users !== 'undefined' && typeof global.Users.showImportExcel === 'function') {
                        global.Users.showImportExcel();
                        return;
                    }
                    break;
                case 'employees':
                    if (typeof global.Employees !== 'undefined' && typeof global.Employees.showImportExcel === 'function') {
                        global.Employees.showImportExcel();
                        return;
                    }
                    break;
                case 'training': {
                    var tab = getTrainingActiveTab(section);
                    if (tab === 'attendance' && typeof global.Training !== 'undefined' && typeof global.Training.showImportAttendanceExcelModal === 'function') {
                        global.Training.showImportAttendanceExcelModal();
                        return;
                    }
                    notify('استيراد Excel متاح في تبويب «سجل التدريب للموظفين» فقط. انتقل إليه ثم اضغط مرة أخرى.', 'warning');
                    return;
                }
                case 'clinic': {
                    var ct = (global.Clinic && global.Clinic.state && global.Clinic.state.activeTab) || getClinicActiveTab(section);
                    if (ct === 'visits' && typeof global.Clinic !== 'undefined' && typeof global.Clinic.importVisitsFromExcel === 'function') {
                        global.Clinic.importVisitsFromExcel();
                        return;
                    }
                    if (ct === 'medications' && typeof global.Clinic !== 'undefined' && typeof global.Clinic.importMedicationsFromExcel === 'function') {
                        global.Clinic.importMedicationsFromExcel();
                        return;
                    }
                    notify('استيراد Excel متاح من تبويب «سجل التردد» أو «الأدوية» فقط.', 'warning');
                    return;
                }
                case 'ptw': {
                    var pt = (global.PTW && global.PTW.currentTab) || getPtwActiveTab(section);
                    if (pt === 'registry' && typeof global.PTW !== 'undefined' && typeof global.PTW.showImportExcelModal === 'function') {
                        global.PTW.showImportExcelModal();
                        return;
                    }
                    notify('استيراد Excel متاح في تبويب «سجل حصر التصاريح» فقط.', 'warning');
                    return;
                }
                case 'fire-equipment':
                    if (typeof global.FireEquipment !== 'undefined' && typeof global.FireEquipment.showImportExcelModal === 'function') {
                        global.FireEquipment.showImportExcelModal();
                        return;
                    }
                    break;
                case 'daily-observations':
                    if (typeof global.DailyObservations !== 'undefined' && typeof global.DailyObservations.showImportExcelModal === 'function') {
                        global.DailyObservations.showImportExcelModal();
                        return;
                    }
                    break;
                case 'iso':
                    if (typeof global.ISO !== 'undefined' && typeof global.ISO.importCodingCenterFromExcel === 'function') {
                        global.ISO.importCodingCenterFromExcel();
                        return;
                    }
                    break;
                case 'safety-budget':
                    if (typeof global.SafetyBudget !== 'undefined' && typeof global.SafetyBudget.showImportModal === 'function') {
                        global.SafetyBudget.showImportModal();
                        return;
                    }
                    break;
                default:
                    break;
            }
        } catch (err) {
            if (typeof global.Utils !== 'undefined' && global.Utils.safeError) global.Utils.safeError('ModuleExcelImport.open:', err);
            notify((err && err.message) || 'فشل فتح الاستيراد', 'error');
            return;
        }

        notify('لا يوجد استيراد Excel جاهز لهذا العرض حالياً. إن وُجد زر استيراد داخل الصفحة يمكنك استخدامه.', 'info');
    }

    function ensureFallbackHeaderButton(sectionName) {
        if (SKIP_SECTIONS[sectionName]) return;
        var section = getSectionEl(sectionName);
        if (!section || section.querySelector('.module-excel-fallback-btn')) return;
        if (section.querySelector('#import-excel-btn, #import-employees-excel-btn')) return;

        var header = section.querySelector('.section-header');
        if (!header) return;

        var wrap = document.createElement('div');
        wrap.className = 'module-excel-fallback-wrap';
        wrap.style.cssText = 'display:flex;align-items:center;gap:0.5rem;flex-shrink:0;';

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-secondary module-excel-fallback-btn';
        btn.setAttribute('title', 'استيراد من Excel');
        btn.innerHTML = '<i class="fas fa-file-import ml-1"></i> استيراد Excel';
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            open(sectionName);
        });

        wrap.appendChild(btn);

        var flexRow = header.querySelector('.flex.items-center.justify-between') || header.querySelector('.flex');
        if (flexRow && !flexRow.querySelector('.module-excel-fallback-wrap')) {
            flexRow.appendChild(wrap);
            return;
        }
        header.appendChild(wrap);
    }

    function ensureTabBarButton(sectionName) {
        if (SKIP_SECTIONS[sectionName]) return;
        var section = getSectionEl(sectionName);
        if (!section) return;

        var candidates = [];
        var h = section.querySelector('.tabs-header');
        if (h) candidates.push(h);
        var nav = section.querySelector('.tabs-nav');
        if (nav) candidates.push(nav);
        var clinic = section.querySelector('.clinic-tabs');
        if (clinic) candidates.push(clinic);
        var ptwTabs = section.querySelector('.ptw-tabs');
        if (ptwTabs) candidates.push(ptwTabs);

        candidates.forEach(function (el) {
            if (!el || el.querySelector('.module-excel-tabbar-btn')) return;
            try {
                el.style.display = el.style.display || 'flex';
                el.style.flexWrap = 'wrap';
                el.style.alignItems = 'center';
                el.style.gap = el.style.gap || '8px';
            } catch (e) {}
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'btn-secondary module-excel-tabbar-btn';
            b.style.marginInlineStart = 'auto';
            b.setAttribute('title', 'استيراد Excel (حسب التبويب النشط)');
            b.innerHTML = '<i class="fas fa-file-import ml-1"></i> استيراد Excel';
            b.addEventListener('click', function (e) {
                e.preventDefault();
                open(sectionName);
            });
            el.appendChild(b);
        });
    }

    function refreshForCurrentSection() {
        var name = global.AppState && global.AppState.currentSection;
        if (!name) return;
        ensureTabBarButton(name);
        var heavy = { users: true, employees: true };
        if (heavy[name]) ensureFallbackHeaderButton(name);
    }

    function init() {
        document.addEventListener('section-changed', function () {
            setTimeout(refreshForCurrentSection, 400);
        });
        document.addEventListener('click', function (e) {
            var t = e.target && e.target.closest && e.target.closest('.tab-btn, .clinic-tab-btn, .ptw-tab-btn');
            if (t) setTimeout(refreshForCurrentSection, 150);
        }, true);
        setTimeout(refreshForCurrentSection, 600);
    }

    global.ModuleExcelImport = {
        open: open,
        ensureTabBarButton: ensureTabBarButton,
        ensureFallbackHeaderButton: ensureFallbackHeaderButton,
        refreshForCurrentSection: refreshForCurrentSection,
        init: init
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(typeof window !== 'undefined' ? window : this);
