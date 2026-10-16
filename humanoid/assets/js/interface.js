/* Keep the sticky navigation aligned and its current page visible on mobile. */
(function () {
    'use strict';

    function init() {
        var header = document.querySelector('.top-bar');
        var nav = document.querySelector('.tab-nav');
        var list = document.querySelector('.tab-list');
        if (!header || !nav || !list) return;

        function measureHeader() {
            document.documentElement.style.setProperty('--header-height', header.getBoundingClientRect().height + 'px');
        }

        function revealCurrent() {
            measureHeader();
            var active = list.querySelector('[aria-current="page"]');
            if (!active) return;
            var item = active.getBoundingClientRect();
            var viewport = list.getBoundingClientRect();
            if (item.left < viewport.left || item.right > viewport.right) {
                list.scrollLeft += item.left - viewport.left - (viewport.width - item.width) / 2;
            }
        }

        if ('ResizeObserver' in window) new ResizeObserver(measureHeader).observe(header);
        window.addEventListener('resize', revealCurrent);
        window.addEventListener('pageshow', revealCurrent);
        document.addEventListener('i18n:applied', function () { requestAnimationFrame(revealCurrent); });
        if (document.fonts) document.fonts.ready.then(revealCurrent);
        revealCurrent();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
