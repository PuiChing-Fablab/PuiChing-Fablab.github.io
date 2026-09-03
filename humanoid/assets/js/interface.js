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
            '<span class="robot-atmosphere__scan"></span>' +
            '<span class="robot-ghost" aria-hidden="true">' +
                '<i class="robot-ghost__halo"></i>' +
                '<i class="robot-ghost__core"></i>' +
                '<i class="robot-ghost__spectre robot-ghost__spectre--cyan"></i>' +
                '<i class="robot-ghost__spectre robot-ghost__spectre--magenta"></i>' +
                '<i class="robot-ghost__scan"></i>' +
            '</span>';

        var edgeField = document.createElement('div');
        edgeField.className = 'edge-field';
        edgeField.setAttribute('aria-hidden', 'true');
        edgeField.innerHTML =
            '<span class="edge-field__side edge-field__side--left"><i></i><b></b></span>' +
            '<span class="edge-field__side edge-field__side--right"><i></i><b></b></span>' +
            '<span class="edge-field__side edge-field__side--top"><i></i><b></b></span>' +
            '<span class="edge-field__side edge-field__side--bottom"><i></i><b></b></span>';

        var robotGhost = atmosphere.querySelector('.robot-ghost');
        document.body.insertBefore(atmosphere, document.body.firstChild);
        if (robotGhost) document.body.insertBefore(robotGhost, atmosphere.nextSibling);
        document.body.appendChild(edgeField);
    }

    function initRobotGhost() {
        var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        var ghost = document.querySelector('.robot-ghost');
        if (!ghost || reduceMotion.matches) return;

        var appearanceTimer = 0;
        var fadeTimer = 0;

        function schedule(delay) {
            window.clearTimeout(appearanceTimer);
            appearanceTimer = window.setTimeout(reveal, delay);
        }

        function reveal() {
            if (document.hidden || reduceMotion.matches) {
                schedule(1800);
                return;
            }

            var zone = Math.random();
            var x = zone < 0.44 ? 10 + Math.random() * 19 :
                (zone < 0.88 ? 71 + Math.random() * 19 : 38 + Math.random() * 24);
            var y = 28 + Math.random() * 50;
            var mobile = window.innerWidth < 768;
            var width = mobile ? 145 + Math.random() * 95 : 170 + Math.random() * 125;
            var duration = 1.85 + Math.random() * 0.75;
            var drift = (Math.random() < 0.5 ? -1 : 1) * (32 + Math.random() * 48);

            ghost.className = 'robot-ghost' + (Math.random() < 0.42 ? ' is-k1' : ' is-t1');
            ghost.style.setProperty('--ghost-x', x.toFixed(2) + 'vw');
            ghost.style.setProperty('--ghost-y', y.toFixed(2) + 'vh');
            ghost.style.setProperty('--ghost-width', Math.round(width) + 'px');
            ghost.style.setProperty('--ghost-duration', duration.toFixed(2) + 's');
            ghost.style.setProperty('--ghost-direction', Math.random() < 0.5 ? '-1' : '1');
            ghost.style.setProperty('--ghost-tilt', (-3 + Math.random() * 6).toFixed(2) + 'deg');
            ghost.style.setProperty('--ghost-start-x', (-drift * 0.55).toFixed(1) + 'px');
            ghost.style.setProperty('--ghost-end-x', drift.toFixed(1) + 'px');
            ghost.style.setProperty('--ghost-start-y', (12 + Math.random() * 16).toFixed(1) + 'px');
            ghost.style.setProperty('--ghost-end-y', (-12 - Math.random() * 20).toFixed(1) + 'px');
            void ghost.offsetWidth;
            ghost.classList.add('is-active');

            window.clearTimeout(fadeTimer);
            fadeTimer = window.setTimeout(function () {
                ghost.classList.remove('is-active');
                schedule(6200 + Math.random() * 7200);
            }, duration * 1000 + 120);
        }

        schedule(2400 + Math.random() * 3000);
    }

    function initScrollTelemetry() {
        var root = document.documentElement;
        var edgeField = document.querySelector('.edge-field');
        var telemetryTarget = edgeField || root;
        var ticking = false;
        var lastY = window.scrollY;
        var chargeTimer = 0;

        function update() {
            var scrollRange = Math.max(1, root.scrollHeight - window.innerHeight);
            var progress = Math.min(1, Math.max(0, window.scrollY / scrollRange));
            var delta = window.scrollY - lastY;
            var distance = Math.abs(delta);
            var energy = Math.min(1, 0.16 + distance / 78);
            telemetryTarget.style.setProperty('--page-progress', progress.toFixed(4));

            if (edgeField && distance > 1) {
                telemetryTarget.style.setProperty('--scroll-energy', energy.toFixed(3));
                telemetryTarget.style.setProperty('--charge-speed', (0.82 - energy * 0.46).toFixed(3) + 's');
                edgeField.classList.add('is-charging');
                edgeField.classList.toggle('is-reversing', delta < 0);
                window.clearTimeout(chargeTimer);
                chargeTimer = window.setTimeout(function () {
                    edgeField.classList.remove('is-charging');
                    telemetryTarget.style.setProperty('--scroll-energy', '0');
                    telemetryTarget.style.setProperty('--charge-speed', '0.82s');
                }, 520);
            }

            lastY = window.scrollY;
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
        initRobotGhost();
        initScrollTelemetry();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
}());
