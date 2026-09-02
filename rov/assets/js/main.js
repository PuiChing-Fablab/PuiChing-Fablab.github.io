/* ============================================================
   PCMS ROV — page behaviour
   Three things: the depth you have descended (which drives the
   water's darkness and the gauge), marine snow drifting through
   the column, and the contents strip tracking the open section.
   ============================================================
*/
(function () {
    'use strict';

    var root = document.documentElement;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Depth ---------- */
    /* Scroll position, normalised 0..1, published as --depth and as a
       readout in metres. The whole page darkens off this one number. */
    (function depth() {
        var readout = document.getElementById('gauge-read');
        var maxDepth = 320;               // metres at the foot of the page
        var ticking = false;

        function update() {
            ticking = false;
            var scrollable = document.body.scrollHeight - window.innerHeight;
            var d = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
            root.style.setProperty('--depth', d.toFixed(4));
            if (readout) {
                var m = Math.round(d * maxDepth);
                readout.textContent = (m < 10 ? '00' : m < 100 ? '0' : '') + m;
            }
        }

        function onScroll() {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(update);
        }

        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
    }());

    /* ---------- Marine snow ---------- */
    (function drift() {
        var canvas = document.getElementById('drift');
        if (!canvas || reduceMotion) { if (canvas) canvas.remove(); return; }

        var ctx = canvas.getContext('2d');
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var motes = [];
        var frame = null;

        function resize() {
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            // One mote per ~11000 px² of viewport, capped so a wide desktop
            // window does not turn into a snowstorm.
            var target = Math.min(110, Math.round(window.innerWidth * window.innerHeight / 11000));
            motes = [];
            for (var i = 0; i < target; i++) motes.push(spawn(true));
        }

        function spawn(anywhere) {
            // A tenth of them are bubbles, which rise; the rest is detritus
            // sinking slowly, the way marine snow actually falls.
            var rising = Math.random() < 0.1;
            return {
                x: Math.random() * window.innerWidth,
                y: anywhere ? Math.random() * window.innerHeight
                            : (rising ? window.innerHeight + 10 : -10),
                r: rising ? 1 + Math.random() * 2.6 : 0.5 + Math.random() * 1.5,
                speed: rising ? -(0.28 + Math.random() * 0.6) : 0.09 + Math.random() * 0.26,
                sway: 0.25 + Math.random() * 0.7,
                phase: Math.random() * Math.PI * 2,
                alpha: rising ? 0.18 + Math.random() * 0.3 : 0.1 + Math.random() * 0.3,
                rising: rising
            };
        }

        function draw() {
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            for (var i = 0; i < motes.length; i++) {
                var m = motes[i];
                m.y += m.speed;
                m.phase += 0.008;
                var x = m.x + Math.sin(m.phase) * m.sway * 12;

                ctx.beginPath();
                ctx.arc(x, m.y, m.r, 0, Math.PI * 2);
                if (m.rising) {
                    ctx.strokeStyle = 'rgba(168, 232, 246, ' + m.alpha + ')';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                } else {
                    ctx.fillStyle = 'rgba(203, 228, 240, ' + m.alpha + ')';
                    ctx.fill();
                }

                if (m.rising ? m.y + m.r < -12 : m.y - m.r > window.innerHeight + 12) {
                    motes[i] = spawn(false);
                }
            }
            frame = window.requestAnimationFrame(draw);
        }

        function start() { if (frame === null) frame = window.requestAnimationFrame(draw); }
        function stop() { if (frame !== null) { window.cancelAnimationFrame(frame); frame = null; } }

        resize();
        start();
        window.addEventListener('resize', resize);
        document.addEventListener('visibilitychange', function () {
            document.hidden ? stop() : start();
        });
    }());

    /* ---------- Contents follows the open section ---------- */
    (function contents() {
        var links = Array.prototype.slice.call(document.querySelectorAll('.contents-list a[href^="#"]'));
        if (!links.length || !('IntersectionObserver' in window)) return;

        var sections = links.map(function (a) {
            return document.querySelector(a.getAttribute('href'));
        }).filter(Boolean);
        if (!sections.length) return;

        var visible = Object.create(null);

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
            // With several sections in view, the topmost one wins.
            var current = null;
            for (var i = 0; i < sections.length; i++) {
                if (visible[sections[i].id]) { current = sections[i].id; break; }
            }
            links.forEach(function (a) {
                var on = current && a.getAttribute('href') === '#' + current;
                a.classList.toggle('is-current', !!on);
                if (on) a.setAttribute('aria-current', 'true');
                else a.removeAttribute('aria-current');
            });
        }, { rootMargin: '-20% 0px -60% 0px', threshold: 0 });

        sections.forEach(function (s) { io.observe(s); });
    }());
}());
