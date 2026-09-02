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
            '<span class="edge-field__corner edge-field__corner--br"></span>' +
            '<span class="edge-field__lightning" data-lightning="0"></span>' +
            '<span class="edge-field__lightning" data-lightning="1"></span>' +
            '<span class="edge-field__lightning" data-lightning="2"></span>' +
            '<span class="edge-field__lightning" data-lightning="3"></span>' +
            '<span class="edge-field__lightning" data-lightning="4"></span>';

        document.body.insertBefore(atmosphere, document.body.firstChild);
        document.body.appendChild(edgeField);
    }

    function initEdgeLightning() {
        var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (reduceMotion.matches) return;

        var bolts = Array.prototype.slice.call(document.querySelectorAll('.edge-field__lightning'));
        var sides = ['top', 'right', 'bottom', 'left'];
        var colours = [
            ['#31ffff', 'rgba(0, 211, 255, 0.98)'],
            ['#bd68ff', 'rgba(91, 70, 255, 0.98)'],
            ['#ff55d5', 'rgba(255, 35, 137, 0.96)'],
            ['#ffd45f', 'rgba(255, 113, 48, 0.96)']
        ];

        function strike(bolt, charged) {
            if (reduceMotion.matches || !document.body.contains(bolt)) return;
            var side = sides[Math.floor(Math.random() * sides.length)];
            var colour = colours[Math.floor(Math.random() * colours.length)];
            bolt.className = 'edge-field__lightning edge-field__lightning--' + side;
            bolt.style.setProperty('--lightning-position', (9 + Math.random() * 82).toFixed(2) + '%');
            bolt.style.setProperty('--lightning-length', Math.round((charged ? 135 : 100) + Math.random() * (charged ? 145 : 125)) + 'px');
            bolt.style.setProperty('--lightning-core', colour[0]);
            bolt.style.setProperty('--lightning-glow', colour[1]);
            void bolt.offsetWidth;
            bolt.classList.add('is-active');

            window.clearTimeout(bolt._strikeTimer);
            bolt._strikeTimer = window.setTimeout(function () {
                bolt.classList.remove('is-active');
            }, charged ? 580 : 520);
        }

        function schedule(bolt, delay) {
            window.setTimeout(function flash() {
                if (reduceMotion.matches || !document.body.contains(bolt)) return;
                strike(bolt, false);
                window.setTimeout(function () {
                    schedule(bolt, 520 + Math.random() * 1900);
                }, 520);
            }, delay);
        }

        bolts.forEach(function (bolt, index) {
            schedule(bolt, 280 + index * 360 + Math.random() * 650);
        });

        document.addEventListener('edge-charge', function () {
            var bolt = bolts[Math.floor(Math.random() * bolts.length)];
            strike(bolt, true);
        });
    }

    function initScrollTelemetry() {
        var root = document.documentElement;
        var edgeField = document.querySelector('.edge-field');
        var ticking = false;
        var lastY = window.scrollY;
        var chargeTimer = 0;
        var lastStrike = 0;

        function update() {
            var now = window.performance.now();
            var scrollRange = Math.max(1, root.scrollHeight - window.innerHeight);
            var progress = Math.min(1, Math.max(0, window.scrollY / scrollRange));
            var distance = Math.abs(window.scrollY - lastY);
            var energy = Math.min(1, distance / 42);
            var chargeEnergy = Math.max(0.24, energy);
            root.style.setProperty('--page-progress', progress.toFixed(4));

            if (edgeField && distance > 1) {
                root.style.setProperty('--scroll-energy', chargeEnergy.toFixed(3));
                root.style.setProperty('--scroll-brightness', (1.2 + chargeEnergy * 0.75).toFixed(3));
                edgeField.classList.add('is-charging');
                window.clearTimeout(chargeTimer);
                chargeTimer = window.setTimeout(function () {
                    edgeField.classList.remove('is-charging');
                    root.style.setProperty('--scroll-energy', '0');
                    root.style.setProperty('--scroll-brightness', '1.2');
                }, 240);

                if (now - lastStrike > 145 && energy > 0.12) {
                    document.dispatchEvent(new CustomEvent('edge-charge'));
                    lastStrike = now;
                }
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
        initEdgeLightning();
        initScrollTelemetry();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
}());
