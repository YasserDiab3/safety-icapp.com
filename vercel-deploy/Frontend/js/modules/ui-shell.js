/**
 * واجهة بديلة خفيفة تُحمّل قبل app-ui.js
 * إذا اكتمل تحميل app-ui.js يستبدل window.UI بالكامل.
 * إن فشل app-ui.js: تبقى تسجيل الدخول + القائمة + التنقل بين الأقسام عبر showSection/loadSectionData.
 */
(function () {
    if (typeof window === 'undefined') return;
    if (typeof window.UI !== 'undefined' && typeof window.UI.showLoginScreen === 'function' && !window.UI._hseUiShell) {
        return;
    }

    /** مطابقة أسماء الأقسام (data-section) لأسماء الكائنات على window */
    var SECTION_MODULE_MAP = {
        dashboard: 'Dashboard',
        users: 'Users',
        'user-tasks': 'UserTasks',
        employees: 'Employees',
        incidents: 'Incidents',
        nearmiss: 'NearMiss',
        ptw: 'PTW',
        training: 'Training',
        clinic: 'Clinic',
        'fire-equipment': 'FireEquipment',
        'periodic-inspections': 'PeriodicInspections',
        ppe: 'PPE',
        violations: 'Violations',
        contractors: 'Contractors',
        'behavior-monitoring': 'BehaviorMonitoring',
        'chemical-safety': 'ChemicalSafety',
        'daily-observations': 'DailyObservations',
        iso: 'ISO',
        emergency: 'Emergency',
        'risk-assessment': 'RiskAssessment',
        'sop-jha': 'SOPJHA',
        'legal-documents': 'LegalDocuments',
        sustainability: 'Sustainability',
        'safety-budget': 'SafetyBudget',
        'safety-performance-kpis': 'SafetyPerformanceKPIs',
        'safety-health-management': 'SafetyHealthManagement',
        'action-tracking': 'ActionTrackingRegister',
        'change-management': 'ChangeManagement',
        'ai-assistant': 'AIAssistant',
        apptester: 'AppTester',
        settings: 'Settings',
        hse: 'HSE',
        'risk-matrix': 'RiskMatrix',
        reports: 'Reports',
        'issue-tracking': 'IssueTracking',
        'user-ai-assistant': 'UserAIAssistant'
    };

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

    function tryInjectFullAppUi() {
        try {
            if (!window.UI || !window.UI._hseUiShell) return;
            if (window.__hseAppUiRetryDone) return;
            window.__hseAppUiRetryDone = true;
            var s = document.createElement('script');
            s.src = 'js/modules/app-ui.js?v=retry-' + Date.now();
            s.async = true;
            s.onerror = function () {
                window.__hseAppUiRetryDone = false;
            };
            s.onload = function () {
                try {
                    if (window.UI && !window.UI._hseUiShell && typeof AppState !== 'undefined' && AppState.currentUser &&
                        typeof window.UI._continueMainAppSetup === 'function') {
                        window.UI._continueMainAppSetup();
                    }
                } catch (e) { /* ignore */ }
            };
            document.head.appendChild(s);
        } catch (e) {
            try { window.__hseAppUiRetryDone = false; } catch (e2) { /* ignore */ }
        }
    }

    const shell = {
        _hseUiShell: true,
        sidebarResizeBound: false,
        sidebarKeydownBound: false,
        sidebarNavItemsBound: false,
        userAvatarPhotoBound: true,

        showHeaderActions: function () { /* noop */ },
        bindCompanyHeaderClickEvents: function () { /* noop */ },
        updateCompanyLogoHeader: function () { /* noop في الـ shell */ },
        updateDashboardLogo: function () { /* noop */ },

        toggleSidebar: toggleSidebar,
        toggleSidebarCollapse: toggleSidebarCollapse,
        restoreSidebarCollapseState: restoreSidebarCollapseState,
        updateCompanyLogoHeaderPosition: updateCompanyLogoHeaderPosition,

        loadSectionData: function (sectionName, silent) {
            try {
                if (typeof AppState !== 'undefined' && AppState.isPageRefresh && !silent) {
                    silent = true;
                }
                this.updateCompanyLogoHeader();
                this.updateDashboardLogo();
                var modName = SECTION_MODULE_MAP[sectionName];
                if (!modName) return;
                var M = window[modName];
                if (M && typeof M.load === 'function') {
                    var r = M.load(silent);
                    if (r && typeof r.catch === 'function' && silent) {
                        r.catch(function () {});
                    }
                }
            } catch (e) { /* ignore */ }
        },

        showSection: function (sectionName) {
            var self = this;
            try {
                var suppressMessage = typeof AppState !== 'undefined' && AppState.isNavigatingBack;
                var name = sectionName;
                if (typeof Permissions !== 'undefined' && typeof Permissions.checkBeforeShow === 'function') {
                    if (!Permissions.checkBeforeShow(name, suppressMessage)) {
                        if (name !== 'dashboard' && Permissions.hasAccess && Permissions.hasAccess('dashboard')) {
                            name = 'dashboard';
                        } else if (suppressMessage && Permissions.hasAccess && Permissions.hasAccess('dashboard')) {
                            name = 'dashboard';
                        } else {
                            return;
                        }
                    }
                }

                var mainApp = document.getElementById('main-app');
                if (!mainApp || mainApp.style.display === 'none') return;

                document.querySelectorAll('.section').forEach(function (section) {
                    section.classList.remove('active');
                    section.style.display = 'none';
                });
                document.querySelectorAll('.nav-item').forEach(function (item) {
                    item.classList.remove('active');
                    item.removeAttribute('aria-current');
                });

                var sectionId = name + '-section';
                var section = document.getElementById(sectionId);
                if (!section) {
                    if (typeof Utils !== 'undefined' && Utils.safeWarn) {
                        Utils.safeWarn('⚠️ [shell] قسم غير موجود:', sectionId);
                    }
                    return;
                }
                section.classList.add('active');
                section.style.display = 'block';

                if (name !== 'dashboard') {
                    self.toggleSidebar(false);
                }

                var navItem = document.querySelector('[data-section="' + name + '"]');
                if (navItem) {
                    navItem.classList.add('active');
                    navItem.setAttribute('aria-current', 'page');
                }

                if (typeof AppState !== 'undefined') {
                    var prev = AppState.currentSection;
                    AppState.previousSection = prev;
                    AppState.currentSection = name;
                    try {
                        sessionStorage.setItem('hse_current_section', name);
                    } catch (e) { /* ignore */ }
                    try {
                        document.dispatchEvent(new CustomEvent('section-changed', {
                            detail: { section: name, previousSection: prev }
                        }));
                    } catch (e) { /* ignore */ }
                }

                var isRefresh = typeof AppState !== 'undefined' && AppState.isPageRefresh;
                if (name === 'dashboard') {
                    self.loadSectionData(name, isRefresh);
                } else {
                    setTimeout(function () {
                        self.loadSectionData(name, isRefresh);
                    }, 50);
                }
            } catch (err) {
                if (typeof Utils !== 'undefined' && Utils.safeWarn) {
                    Utils.safeWarn('⚠️ [shell] showSection:', err);
                }
            }
        },

        setupNavigationListeners: function () {
            var self = this;
            document.querySelectorAll('.nav-item').forEach(function (item) {
                var newItem = item.cloneNode(true);
                item.parentNode.replaceChild(newItem, item);
            });
            document.querySelectorAll('.nav-item').forEach(function (item) {
                item.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var section = item.getAttribute('data-section');
                    if (section) self.showSection(section);
                }, { passive: false });
            });
            if (typeof self.setupLogoutButton === 'function') {
                self.setupLogoutButton();
            }
        },

        setupLogoutButton: function () {
            var btn = document.getElementById('logout-btn');
            if (!btn || btn.dataset.logoutHandlerBound === 'true') return;
            var nb = btn.cloneNode(true);
            btn.parentNode.replaceChild(nb, btn);
            nb.dataset.logoutHandlerBound = 'true';
            nb.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (typeof UI !== 'undefined' && UI.toggleSidebar) UI.toggleSidebar(false);
                if (!confirm('هل أنت متأكد من تسجيل الخروج؟')) return;
                if (typeof Auth !== 'undefined' && typeof Auth.logout === 'function') Auth.logout();
            });
        },

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
                if (window.UI && window.UI._hseUiShell && !window.__hseUiShellNoticeOnce) {
                    window.__hseUiShellNoticeOnce = true;
                    try {
                        console.info(
                            '[HSE] وضع واجهة احتياطية (ui-shell). للواجهة الكاملة: Network → app-ui.js (200). أخطاء runtime.lastError من إضافات المتصفح وليست من التطبيق.'
                        );
                    } catch (e) { /* ignore */ }
                }
                setTimeout(function () {
                    try {
                        if (!window.UI || !window.UI._hseUiShell) return;
                        window.UI.bindSidebarEvents();
                        if (typeof Permissions !== 'undefined' && typeof Permissions.updateNavigation === 'function') {
                            try { Permissions.updateNavigation(); } catch (e1) { /* ignore */ }
                        }
                        window.UI.setupNavigationListeners();
                        var sec = 'dashboard';
                        try {
                            var s = sessionStorage.getItem('hse_current_section');
                            if (s) sec = s;
                        } catch (e2) { /* ignore */ }
                        window.UI.showSection(sec);
                    } catch (e3) { /* ignore */ }
                }, 0);
                setTimeout(tryInjectFullAppUi, 400);
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
