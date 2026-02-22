// ===== PCMS-HRG Tab Navigation Logic =====
(function () {
    'use strict';

    /**
     * Activate a tab panel by name.
     * @param {string} tabName - The tab identifier (e.g. 'home', 'about', 'activities', 'connect')
     */
    function activateTab(tabName) {
        var validTabs = ['home', 'about', 'activities', 'connect'];
        if (validTabs.indexOf(tabName) === -1) return;

        // Update tab buttons
        document.querySelectorAll('.tab-btn[data-tab]').forEach(function (btn) {
            var isActive = btn.getAttribute('data-tab') === tabName;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(function (panel) {
            panel.classList.toggle('active', panel.id === 'tab-' + tabName);
        });

        // Scroll to top of page
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Update URL hash without triggering a scroll jump
        if (history.replaceState) {
            history.replaceState(null, '', '#' + tabName);
        }
    }

    // Bind tab button clicks
    document.querySelectorAll('.tab-btn[data-tab]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            activateTab(btn.getAttribute('data-tab'));
        });
    });

    // Bind in-page "Learn About Us" / "See Our Activities" / "Connect" buttons
    document.querySelectorAll('.btn-tab-link[data-tab]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            activateTab(btn.getAttribute('data-tab'));
        });
    });

    // On load: restore tab from URL hash
    var hash = window.location.hash.replace('#', '');
    var validTabs = ['home', 'about', 'activities', 'connect'];
    if (hash && validTabs.indexOf(hash) !== -1) {
        activateTab(hash);
    }
})();
