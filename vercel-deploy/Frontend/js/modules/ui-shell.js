/**
 * واجهة بديلة خفيفة تُحمّل قبل app-ui.js
 * إذا اكتمل تحميل app-ui.js يستبدل window.UI بالكامل.
 * إذا تعذّر app-ui.js: يبقى تسجيل الدخول + القائمة الجانبية (فتح/إغلاق) تعمل.
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

    function updateCompanyLogoHeaderPosition(sidebarOpen) {
        const header = document.getElementById('company-logo-header');
        if (!header) return;
        if (window.innerWidth > 1024) {
            if (sidebarOpen) {
                header.style.right = 'var(--sidebar-width)';
                header.style.left = '0';
            } else {
                header.style.right = '0';
                header.style.left = '0';
            }
        } else {
            header.style.right = '0';
            header.style.left = '0';
        }
    }

    function toggleSidebar(open) {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (!sidebar) return;

        const shouldOpen = open !== null && open !== undefined ? open : !sidebar.classList.contains('open');
        const isMobile = window.innerWidth <= 1024;

        if (shouldOpen) {
            sidebar.classList.add('open');
            if (overlay && isMobile) {
                overlay.classList.add('visible');
                overlay.setAttribute('aria-hidden', 'false');
            }
            if (isMobile) {
                const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
                document.body.dataset.scrollY = scrollY.toString();
                document.body.classList.add('sidebar-open');
            }
        } else {
            sidebar.classList.remove('open');
            if (overlay) {
                overlay.classList.remove('visible');
                overlay.setAttribute('aria-hidden', 'true');
            }
            if (isMobile) {
                const scrollY = document.body.dataset.scrollY;
                document.body.classList.remove('sidebar-open');
                delete document.body.dataset.scrollY;
                if (scrollY) {
                    const scrollValue = parseInt(scrollY, 10) || 0;
                    requestAnimationFrame(function () {
                        window.scrollTo({ top: scrollValue, behavior: 'auto' });
                    });
                }
            }
        }

        const toggleBtn = document.getElementById('sidebar-toggle');
        if (toggleBtn) {
            toggleBtn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.className = shouldOpen ? 'fas fa-times' : 'fas fa-bars';
            }
        }
        updateCompanyLogoHeaderPosition(shouldOpen);
    }

    function toggleSidebarCollapse(forceState) {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;
        const shouldCollapse = forceState !== null && forceState !== undefined
            ? forceState
            : !sidebar.classList.contains('collapsed');
        sidebar.classList.toggle('collapsed', shouldCollapse);
        const newWidth = shouldCollapse ? '84px' : '280px';
        try {
            document.documentElement.style.setProperty('--sidebar-width', newWidth);
        } catch (e) { /* ignore */ }
        const collapseToggle = document.getElementById('sidebar-collapse-toggle');
        if (collapseToggle) {
            collapseToggle.setAttribute('aria-pressed', shouldCollapse ? 'true' : 'false');
            const icon = collapseToggle.querySelector('i');
            if (icon) {
                icon.className = shouldCollapse ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
            }
        }
        try {
            localStorage.setItem('sidebarCollapsed', shouldCollapse ? 'true' : 'false');
        } catch (e) { /* ignore */ }
    }

    function restoreSidebarCollapseState() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;
        let stored = null;
        try {
            stored = localStorage.getItem('sidebarCollapsed');
        } catch (e) {
            stored = null;
        }
        const shouldCollapse = stored === 'true';
        sidebar.classList.toggle('collapsed', shouldCollapse);
        const newWidth = shouldCollapse ? '84px' : '280px';
        try {
            document.documentElement.style.setProperty('--sidebar-width', newWidth);
        } catch (e) { /* ignore */ }
        const collapseToggle = document.getElementById('sidebar-collapse-toggle');
        if (collapseToggle) {
            collapseToggle.setAttribute('aria-pressed', shouldCollapse ? 'true' : 'false');
            const icon = collapseToggle.querySelector('i');
            if (icon) {
                icon.className = shouldCollapse ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
            }
        }
    }

    const shell = {
        _hseUiShell: true,
        sidebarResizeBound: false,
        sidebarKeydownBound: false,
        sidebarNavItemsBound: false,
        userAvatarPhotoBound: true,

        showHeaderActions: function () { /* noop في الـ shell */ },
        bindCompanyHeaderClickEvents: function () { /* noop في الـ shell */ },

        toggleSidebar: toggleSidebar,
        toggleSidebarCollapse: toggleSidebarCollapse,
        restoreSidebarCollapseState: restoreSidebarCollapseState,
        updateCompanyLogoHeaderPosition: updateCompanyLogoHeaderPosition,

        bindSidebarEvents: function () {
            const self = this;
            const toggleBtn = document.getElementById('sidebar-toggle');
            const overlay = document.getElementById('sidebar-overlay');
            const collapseToggle = document.getElementById('sidebar-collapse-toggle');

            if (toggleBtn && !toggleBtn.dataset.bound) {
                toggleBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    self.toggleSidebar();
                });
                toggleBtn.dataset.bound = 'true';
            }
            if (overlay && !overlay.dataset.bound) {
                overlay.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    self.toggleSidebar(false);
                });
                overlay.dataset.bound = 'true';
                overlay.setAttribute('aria-hidden', 'true');
            }
            if (collapseToggle && !collapseToggle.dataset.bound) {
                collapseToggle.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    self.toggleSidebarCollapse();
                });
                collapseToggle.dataset.bound = 'true';
            }
            self.restoreSidebarCollapseState();
            self.bindCompanyHeaderClickEvents();

            if (!self.sidebarResizeBound) {
                window.addEventListener('resize', function () {
                    if (window.innerWidth > 1024) {
                        self.toggleSidebar(false);
                    }
                    self.showHeaderActions();
                });
                self.sidebarResizeBound = true;
            }
            if (!self.sidebarKeydownBound) {
                document.addEventListener('keydown', function (event) {
                    if (event.key === 'Escape' && window.innerWidth <= 1024) {
                        const sb = document.querySelector('.sidebar');
                        if (sb && sb.classList.contains('open')) {
                            self.toggleSidebar(false);
                        }
                    }
                });
                self.sidebarKeydownBound = true;
            }
        },

        showLoginScreen: showLoginScreen,

        showMainApp: function () {
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
                    document.body.classList.add('app-active');
                } catch (e) { /* ignore */ }
                if (window.UI && window.UI._hseUiShell) {
                    console.warn(
                        '[HSE] واجهة احتياطية (ui-shell): تأكد من تحميل app-ui.js من Network إن كانت القائمة أو الأقسام ناقصة.'
                    );
                }
                setTimeout(function () {
                    try {
                        if (window.UI && window.UI._hseUiShell && typeof window.UI.bindSidebarEvents === 'function') {
                            window.UI.bindSidebarEvents();
                        }
                    } catch (e2) { /* ignore */ }
                }, 0);
            });
        },

        showForgotPasswordModal: function () {
            alert('ميزة استعادة كلمة المرور قيد التطوير.\n\nيرجى التواصل مع:\nYasser.diab@icapp.com.eg');
        },
        showHelpModal: function () {
            alert('📋 مساعدة تسجيل الدخول\n\n📞 للدعم:\nYasser.diab@icapp.com.eg');
        },
        updateLoginLogo: function () { /* noop */ }
    };

    window.UI = shell;
})();
