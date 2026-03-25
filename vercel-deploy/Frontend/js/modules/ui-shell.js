/**
 * واجهة بديلة خفيفة تُحمّل قبل app-ui.js
 * إذا اكتمل تحميل app-ui.js يستبدل window.UI بالكامل.
 * إذا فشل app-ui.js (حجم/شبكة/خطأ) يبقى تسجيل الدخول يعمل بدون انتظار لانهائي.
 */
(function () {
    if (typeof window === 'undefined') return;
    if (typeof window.UI !== 'undefined' && typeof window.UI.showLoginScreen === 'function' && !window.UI._hseUiShell) {
        return;
    }

    function showLoginScreen() {
        try {
            const loginScreen = document.getElementById('login-screen');
            const mainApp = document.getElementById('main-app');
            if (loginScreen) {
                loginScreen.style.display = 'flex';
                loginScreen.classList.remove('hidden');
            }
            if (mainApp) {
                mainApp.style.display = 'none';
                mainApp.classList.add('hidden');
            }
        } catch (e) { /* ignore */ }
    }

    function showMainApp() {
        return Promise.resolve().then(function () {
            try {
                const loginScreen = document.getElementById('login-screen');
                const mainApp = document.getElementById('main-app');
                if (loginScreen) {
                    loginScreen.style.display = 'none';
                    loginScreen.classList.add('hidden');
                }
                if (mainApp) {
                    mainApp.classList.remove('hidden');
                    mainApp.style.display = 'flex';
                }
            } catch (e) { /* ignore */ }
            if (window.UI && window.UI._hseUiShell) {
                console.warn(
                    '[HSE] تم استخدام واجهة احتياطية (ui-shell). إن استمرت المشاكل: امسح كاش المتصفح وتحقق من تحميل app-ui.js في Network.'
                );
            }
        });
    }

    window.UI = {
        _hseUiShell: true,
        showLoginScreen: showLoginScreen,
        showMainApp: showMainApp,
        showForgotPasswordModal: function () {
            alert(
                'ميزة استعادة كلمة المرور قيد التطوير.\n\nيرجى التواصل مع:\nYasser.diab@icapp.com.eg'
            );
        },
        showHelpModal: function () {
            alert('📋 مساعدة تسجيل الدخول\n\n📞 للدعم:\nYasser.diab@icapp.com.eg');
        },
        updateLoginLogo: function () {
            /* noop — النسخة الكاملة في app-ui.js */
        }
    };
})();
