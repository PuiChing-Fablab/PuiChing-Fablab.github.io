(function () {
    'use strict';

    function buildInterface() {
        if (document.querySelector('.robot-atmosphere')) return;

        var atmosphere = document.createElement('div');
        atmosphere.className = 'robot-atmosphere';
        atmosphere.setAttribute('aria-hidden', 'true');
        atmosphere.innerHTML =
            '<span class="robot-atmosphere__grid"></span>' +
            '<span class="robot-atmosphere__aurora robot-atmosphere__aurora--cyan"></span>' +
            '<span class="robot-atmosphere__aurora robot-atmosphere__aurora--violet"></span>' +
            '<span class="robot-atmosphere__orbit"></span>' +
            '<span class="robot-atmosphere__scan"></span>';

        var edgeField = document.createElement('div');
        edgeField.className = 'edge-field';
        edgeField.setAttribute('aria-hidden', 'true');
        edgeField.innerHTML =
            '<span class="edge-field__side edge-field__side--left"><i></i><b></b></span>' +
            '<span class="edge-field__side edge-field__side--right"><i></i><b></b></span>' +
            '<span class="edge-field__side edge-field__side--top"><i></i><b></b></span>' +
            '<span class="edge-field__side edge-field__side--bottom"><i></i><b></b></span>' +
            '<span class="edge-field__corner edge-field__corner--tl"></span>' +
            '<span class="edge-field__corner edge-field__corner--tr"></span>' +
            '<span class="edge-field__corner edge-field__corner--bl"></span>' +
            '<span class="edge-field__corner edge-field__corner--br"></span>';

        document.body.insertBefore(atmosphere, document.body.firstChild);
        document.body.appendChild(edgeField);
    }

    function initScrollTelemetry() {
        var root = document.documentElement;
        var ticking = false;

        function update() {
            var scrollRange = Math.max(1, root.scrollHeight - window.innerHeight);
            var progress = Math.min(1, Math.max(0, window.scrollY / scrollRange));
            root.style.setProperty('--page-progress', progress.toFixed(4));
            ticking = false;
        }

        function requestUpdate() {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(update);
        }

        window.addEventListener('scroll', requestUpdate, { passive: true });
        window.addEventListener('resize', requestUpdate, { passive: true });
        window.addEventListener('load', requestUpdate, { once: true });
        requestUpdate();
    }

    function init() {
        buildInterface();
        initScrollTelemetry();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
}());
