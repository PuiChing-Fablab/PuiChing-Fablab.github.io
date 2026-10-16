/* Chromatic titles, hero slideshow, circuit pulses and scroll control. */
(function () {
    'use strict';

    var preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    var motionListeners = [];

    function motionEnabled() { return !preference.matches; }
    function syncMotion() {
        document.documentElement.classList.toggle('effects-paused', !motionEnabled());
        motionListeners.forEach(function (listener) { listener(); });
    }
    preference.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', syncMotion);
    window.addEventListener('pageshow', syncMotion);

    function initBrandName() {
        document.querySelectorAll('.brand-name').forEach(function (el) {
            var probe = document.createElement('div');

            function intended() {
                probe.innerHTML = el.__i18nText != null ? el.__i18nText : el.innerHTML;
                return probe.textContent.replace(/\s+/g, ' ').trim();
            }

            // The place name rides with the school name, so the break goes
            // after the bracket rather than before it. German and Italian
            // close on the bracket — those stay one run and wrap on their own.
            function split(text) {
                var cut = text.indexOf(')');
                if (cut > 0 && cut < text.length - 1) {
                    return [text.slice(0, cut + 1), text.slice(cut + 1).trim()];
                }
                return [text];
            }

            function render() {
                var text = intended();
                el.textContent = '';
                split(text).forEach(function (text, index) {
                    if (index) el.appendChild(document.createTextNode(' '));
                    var line = document.createElement('span');
                    line.className = 'brand-line';
                    line.textContent = text;
                    el.appendChild(line);
                });
            }

            render();
            // A language switch rewrites the element with plain text, so the
            // lines have to be laid out again.
            document.addEventListener('i18n:applied', render);
        });
    }

    function initTitleTyping() {
        document.querySelectorAll('#page-main h1').forEach(function (title) {
            var original = title.innerHTML;
            var characters = [];
            var timer = 0;
            var visible = false;
            var cursor = null;
            var position = 0;
            var segmenter = typeof Intl.Segmenter === 'function'
                ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

            function stop() {
                clearTimeout(timer);
                timer = 0;
                title.classList.remove('is-title-running', 'is-title-resetting');
                if (cursor) cursor.classList.remove('is-cursor');
                cursor = null;
            }

            function typeNext() {
                if (cursor) cursor.classList.remove('is-cursor');
                cursor = characters[position++];
                cursor.classList.add('is-revealed', 'is-cursor');
                if (position < characters.length) {
                    timer = setTimeout(typeNext, Math.min(180, Math.max(38, 1800 / characters.length)));
                } else {
                    timer = setTimeout(function () {
                        title.classList.add('is-title-resetting');
                        timer = setTimeout(start, 240);
                    }, 4200);
                }
            }

            function start() {
                stop();
                if (!visible || !motionEnabled() || document.hidden || !characters.length) return;
                characters.forEach(function (character) { character.classList.remove('is-revealed'); });
                position = 0;
                title.classList.add('is-title-running');
                typeNext();
            }

            function sync() {
                if (visible && motionEnabled() && !document.hidden) {
                    if (!timer) start();
                } else {
                    stop();
                }
            }

            function render() {
                stop();
                characters = [];
                var visual = document.createElement('span');
                visual.className = 'title-type__visual';
                visual.setAttribute('aria-hidden', 'true');
                visual.innerHTML = title.__i18nText != null ? title.__i18nText : original;
                var label = visual.cloneNode(true);
                label.querySelectorAll('br').forEach(function (br) { br.replaceWith(' '); });
                // Assistive technology receives one complete, stable heading.
                title.setAttribute('aria-label', label.textContent.replace(/\s+/g, ' ').trim());
                var walker = document.createTreeWalker(visual, NodeFilter.SHOW_TEXT);
                var nodes = [];
                while (walker.nextNode()) nodes.push(walker.currentNode);
                nodes.forEach(function (node) {
                    var fragment = document.createDocumentFragment();
                    var letters = segmenter ? Array.from(segmenter.segment(node.textContent), function (part) { return part.segment; }) : Array.from(node.textContent);
                    letters.forEach(function (letter) {
                        if (/^\s+$/.test(letter)) {
                            fragment.appendChild(document.createTextNode(letter));
                            return;
                        }
                        var character = document.createElement('span');
                        character.className = 'title-character';
                        character.textContent = letter;
                        characters.push(character);
                        fragment.appendChild(character);
                    });
                    node.replaceWith(fragment);
                });
                characters.forEach(function (character, index) {
                    character.style.setProperty('--ink-delay', (-index / characters.length * 4).toFixed(3) + 's');
                });
                // Inline characters keep normal word wrapping and reserve the
                // entire title's space, including while only a few are visible.
                title.replaceChildren(visual);
                title.classList.add('title-type');
                sync();
            }

            render();
            if ('IntersectionObserver' in window) {
                new IntersectionObserver(function (entries) {
                    visible = entries[0].isIntersecting;
                    sync();
                }, { threshold: 0.1 }).observe(title);
            } else {
                visible = true;
                sync();
            }
            motionListeners.push(sync);
            window.addEventListener('pagehide', stop);
            document.addEventListener('i18n:applied', render);
        });
    }

    function initMotion() {
        if (!('IntersectionObserver' in window) || !Element.prototype.animate) return;
        var running = new Set();
        var revealed = new WeakSet();

        function play(el, frames, options) {
            if (!motionEnabled()) return;
            var animation = el.animate(frames, options);
            running.add(animation);
            animation.finished.then(function () { running.delete(animation); }, function () { running.delete(animation); });
        }

        // Content is visible in the document even if motion is unavailable.
        // Nothing depends on a hidden-until-JavaScript class or a page loader.
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry, index) {
                if (!entry.isIntersecting) return;
                var el = entry.target;
                observer.unobserve(el);
                if (revealed.has(el) || !motionEnabled()) return;
                revealed.add(el);
                play(el, [
                    { opacity: 0, transform: 'translateY(18px)' },
                    { opacity: 1, transform: 'translateY(0)' }
                ], { duration: 560, delay: (index % 4) * 55, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
                if (el.matches('.team-console')) {
                    var scan = document.createElement('span');
                    scan.className = 'team-scan';
                    scan.setAttribute('aria-hidden', 'true');
                    var beam = document.createElement('span');
                    beam.className = 'team-scan__beam';
                    scan.appendChild(beam);
                    el.appendChild(scan);
                    play(beam, [
                        { transform: 'translateY(-64px)', opacity: 0 },
                        { opacity: 1, offset: 0.12 },
                        { opacity: 1, offset: 0.85 },
                        { transform: 'translateY(' + el.clientHeight + 'px)', opacity: 0 }
                    ], { duration: 2000, delay: 180, easing: 'linear' });
                    el.querySelectorAll('.team-portrait').forEach(function (portrait, i) {
                        play(portrait, [
                            { opacity: 0.25, transform: 'translateY(10px) scale(.94)' },
                            { opacity: 1, transform: 'translateY(0) scale(1)' }
                        ], { duration: 480, delay: 180 + i * 38, easing: 'ease-out', fill: 'backwards' });
                    });
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' });

        document.querySelectorAll('.hero-kicker, .hero-title, .hero-sub, .hero-actions, .section-title, .home-intro-title, .team-console, .line-card, .tech-card, .member-card, .coach-card, .activity-header, .honour-card, .connect-card, .gallery-item').forEach(function (el) {
            if (el.tagName !== 'H1') observer.observe(el);
        });
        var hero = document.querySelector('.hero-bg');
        if (hero) play(hero, [{ transform: 'scale(1.045)' }, { transform: 'scale(1)' }], { duration: 1800, easing: 'ease-out' });

        motionListeners.push(function () {
            if (motionEnabled()) return;
            running.forEach(function (animation) { animation.cancel(); });
            running.clear();
        });
    }

    function initPointerDepth() {
        document.querySelectorAll('.team-console, .robot-showcase, .honour-card').forEach(function (el) {
            var frame = 0;
            var point;
            function reset() {
                cancelAnimationFrame(frame);
                frame = 0;
                el.classList.remove('has-pointer-motion');
                el.style.removeProperty('--pointer-x');
                el.style.removeProperty('--pointer-y');
            }
            el.addEventListener('pointermove', function (event) {
                if (!motionEnabled() || !finePointer.matches || event.pointerType === 'touch') return;
                point = { x: event.clientX, y: event.clientY };
                if (frame) return;
                frame = requestAnimationFrame(function () {
                    frame = 0;
                    var box = el.getBoundingClientRect();
                    if (!box.width || !box.height) return;
                    var x = Math.max(-1, Math.min(1, (point.x - box.left) / box.width * 2 - 1));
                    var y = Math.max(-1, Math.min(1, (point.y - box.top) / box.height * 2 - 1));
                    el.style.setProperty('--pointer-x', x.toFixed(3));
                    el.style.setProperty('--pointer-y', y.toFixed(3));
                    el.classList.add('has-pointer-motion');
                });
            }, { passive: true });
            el.addEventListener('pointerleave', reset);
            el.addEventListener('pointercancel', reset);
            window.addEventListener('scroll', reset, { passive: true });
            window.addEventListener('pagehide', reset);
            document.addEventListener('visibilitychange', function () { if (document.hidden) reset(); });
            finePointer.addEventListener('change', reset);
            motionListeners.push(reset);
        });
    }

    function initHeroNetwork() {
        var hero = document.querySelector('.hero');
        if (!hero || !('IntersectionObserver' in window) || !('ResizeObserver' in window)) return;
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        if (!context) return;
        canvas.className = 'hero-network';
        canvas.setAttribute('aria-hidden', 'true');
        hero.appendChild(canvas);

        var width = 0, height = 0, frame = 0, previous = 0, elapsed = 0;
        var visible = false, suspended = false, pointer = null;
        var nodes = [];

        function render() {
            context.clearRect(0, 0, width, height);
            var time = elapsed / 1000;
            // Asymmetric angular paths carry light across the lower image.
            var paths = [
                [[0.3, 0.96], [0.55, 0.96], [0.72, 0.65], [1.08, 0.65]],
                [[0.62, 1.04], [0.78, 0.76], [0.94, 0.76], [1.08, 0.48]],
                [[0.48, 0.91], [0.68, 0.91], [0.84, 0.60], [1.04, 0.60]]
            ];
            paths.forEach(function (path, i) {
                var points = path.map(function (p) { return { x: p[0] * width, y: p[1] * height }; });
                var color = i === 1 ? '185,120,255' : '92,233,255';
                context.beginPath();
                points.forEach(function (p, j) { if (j) context.lineTo(p.x, p.y); else context.moveTo(p.x, p.y); });
                context.lineWidth = 0.8;
                context.strokeStyle = 'rgba(' + color + ',.17)';
                context.stroke();
                var progress = (time * 0.16 + i * 0.92) % (points.length - 1);
                var segment = Math.floor(progress), amount = progress - segment;
                var from = points[segment], to = points[segment + 1];
                var x = from.x + (to.x - from.x) * amount;
                var y = from.y + (to.y - from.y) * amount;
                context.save();
                context.strokeStyle = 'rgba(' + color + ',.9)';
                context.shadowColor = context.strokeStyle;
                context.shadowBlur = 12;
                context.lineWidth = 2;
                context.beginPath();
                context.moveTo(x - (to.x - from.x) * 0.1, y - (to.y - from.y) * 0.1);
                context.lineTo(x, y);
                context.stroke();
                context.fillStyle = '#e1faff';
                context.fillRect(x - 1.5, y - 1.5, 3, 3);
                context.restore();
            });
            nodes.forEach(function (node, i) {
                var x = node.x * width + Math.sin(time * 0.35 + node.phase) * 20;
                var y = (0.45 + node.y * 0.5) * height + Math.cos(time * 0.28 + node.phase) * 14;
                var near = pointer && Math.hypot(x - pointer.x, y - pointer.y) < 150;
                context.fillStyle = near ? '#e2b2ff' : 'rgba(136,224,255,.55)';
                context.beginPath();
                context.arc(x, y, near ? 2.8 : 1.2, 0, Math.PI * 2);
                context.fill();
            });
        }

        function canRun() { return visible && !suspended && !document.hidden && motionEnabled(); }
        function tick(now) {
            frame = 0;
            if (!canRun()) return;
            if (!previous || now - previous >= 32) {
                elapsed += previous ? Math.min(now - previous, 80) : 0;
                previous = now;
                render();
            }
            frame = requestAnimationFrame(tick);
        }
        function sync() {
            canvas.hidden = !motionEnabled();
            if (canRun()) {
                if (!frame) { previous = 0; frame = requestAnimationFrame(tick); }
            } else {
                cancelAnimationFrame(frame);
                frame = 0;
                previous = 0;
                pointer = null;
            }
        }
        function resize() {
            width = hero.clientWidth;
            height = hero.clientHeight;
            var ratio = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(width * ratio);
            canvas.height = Math.round(height * ratio);
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            nodes = [];
            for (var i = 0; i < (width < 600 ? 8 : 16); i++) {
                nodes.push({ x: (i * 0.618 + 0.05) % 1, y: (i * 0.317 + 0.12) % 1, phase: i * 2.399 });
            }
            render();
        }
        hero.addEventListener('pointermove', function (event) {
            if (!canRun() || !finePointer.matches || event.pointerType === 'touch') return;
            var box = hero.getBoundingClientRect();
            pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
        }, { passive: true });
        hero.addEventListener('pointerleave', function () { pointer = null; });
        hero.addEventListener('pointercancel', function () { pointer = null; });
        new ResizeObserver(resize).observe(hero);
        new IntersectionObserver(function (entries) {
            visible = entries[0].isIntersecting;
            sync();
        }).observe(hero);
        document.addEventListener('visibilitychange', sync);
        document.addEventListener('i18n:applied', sync);
        window.addEventListener('pagehide', function () { suspended = true; sync(); });
        window.addEventListener('pageshow', function () { suspended = false; sync(); });
        motionListeners.push(sync);
        resize();
        sync();
    }

    function initVisibleEffects() {
        function visibility() { document.documentElement.classList.toggle('motion-suspended', document.hidden); }
        document.addEventListener('visibilitychange', visibility);
        visibility();
        var elements = document.querySelectorAll('.honour-card, .activity-loop');
        if (!('IntersectionObserver' in window)) return;
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) { entry.target.classList.toggle('is-sweep-visible', entry.isIntersecting); });
        }, { threshold: 0.05 });
        elements.forEach(function (element) { observer.observe(element); });
    }

    function initHeroCarousel() {
        var media = document.querySelector('[data-hero-carousel]');
        if (!media) return;
        var slides = Array.from(media.querySelectorAll('.hero-slide'));
        var hero = media.closest('.hero');
        var nav = hero.querySelector('.hero-slideshow-nav');
        var counter = nav.querySelector('.hero-slide-count');
        var current = 0, timer = 0, visible = true, suspended = false;
        function preload(index) {
            var img = slides[index].querySelector('img');
            img.loading = 'eager';
        }
        function eligible() {
            return visible && !suspended && !document.hidden && motionEnabled() && !nav.contains(document.activeElement);
        }
        function schedule() {
            clearTimeout(timer);
            timer = 0;
            if (eligible()) timer = setTimeout(function () { show(current + 1); }, 5000);
        }
        function show(index) {
            current = (index + slides.length) % slides.length;
            preload(current);
            slides.forEach(function (slide, i) {
                slide.classList.toggle('is-active', i === current);
                slide.setAttribute('aria-hidden', String(i !== current));
            });
            counter.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
            preload((current + 1) % slides.length);
            schedule();
        }
        nav.querySelector('.hero-slide-prev').addEventListener('click', function () { show(current - 1); });
        nav.querySelector('.hero-slide-next').addEventListener('click', function () { show(current + 1); });
        nav.addEventListener('focusin', schedule);
        nav.addEventListener('focusout', function () { setTimeout(schedule, 0); });
        document.addEventListener('visibilitychange', schedule);
        window.addEventListener('pagehide', function () { suspended = true; schedule(); });
        window.addEventListener('pageshow', function () { suspended = false; schedule(); });
        if ('IntersectionObserver' in window) new IntersectionObserver(function (entries) {
            visible = entries[0].isIntersecting;
            schedule();
        }).observe(hero);
        motionListeners.push(schedule);
        preload(1);
        schedule();
    }

    function initLightning() {
        var canvas = document.createElement('canvas');
        canvas.className = 'science-lightning';
        canvas.setAttribute('aria-hidden', 'true');
        var ctx = canvas.getContext('2d');
        if (!ctx) return;
        document.body.prepend(canvas);
        var width = 0, height = 0, frame = 0, previous = 0, elapsed = 0, suspended = false;
        function hash(n) { var value = Math.sin(n * 127.1 + 311.7) * 43758.5453; return (value - Math.floor(value)) * 2 - 1; }
        function noise(index, time, seed) {
            var step = Math.floor(time), blend = time - step;
            blend = blend * blend * (3 - 2 * blend);
            return hash(index + step * 97 + seed) * (1 - blend) + hash(index + (step + 1) * 97 + seed) * blend;
        }
        function filament(x1, y1, x2, y2, seed, time, strength, branch) {
            var dx = x2 - x1, dy = y2 - y1, length = Math.hypot(dx, dy);
            var count = Math.max(18, Math.round(length / 7));
            var points = [];
            for (var i = 0; i <= count; i++) {
                var t = i / count, envelope = Math.sin(t * Math.PI);
                // Multiple spatial scales create fine, irregular electrical branches.
                var coarse = noise(Math.floor(i / 11), time * 1.3, seed) * (branch ? 9 : 31);
                var medium = noise(Math.floor(i / 3), time * 2.1, seed + 53) * (branch ? 5 : 13);
                var fine = noise(i, time * 3.2, seed + 107) * (branch ? 3 : 7);
                var offset = (coarse + medium + fine) * envelope;
                points.push({ x: x1 + dx * t - dy / length * offset, y: y1 + dy * t + dx / length * offset });
            }
            var gradient = ctx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, '#61f4ff'); gradient.addColorStop(.32, '#639bff');
            gradient.addColorStop(.68, '#b66aff'); gradient.addColorStop(1, '#ff83d4');
            ctx.beginPath(); points.forEach(function (p, j) { if (j) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
            ctx.lineJoin = 'round'; ctx.lineCap = 'round';
            ctx.strokeStyle = gradient; ctx.shadowColor = '#777dff'; ctx.shadowBlur = branch ? 7 : 17;
            ctx.globalAlpha = strength * .4; ctx.lineWidth = branch ? 2 : 4; ctx.stroke();
            ctx.shadowBlur = branch ? 4 : 9; ctx.globalAlpha = strength; ctx.lineWidth = branch ? .65 : 1.15; ctx.stroke();
            ctx.shadowBlur = 0; ctx.strokeStyle = '#e0f5ff'; ctx.globalAlpha = strength * .8; ctx.lineWidth = branch ? .25 : .45; ctx.stroke();
            if (!branch) {
                for (var b = 1; b <= 3; b++) {
                    var index = Math.floor(count * b / 5), p = points[index];
                    var side = hash(seed + b * 7) > 0 ? 1 : -1;
                    filament(p.x, p.y, p.x + side * (35 + Math.abs(hash(b + seed)) * 90), p.y + 40 + hash(b * 4 + seed) * 65, seed + b * 31, time, strength * .65, true);
                }
            }
        }
        function render() {
            ctx.clearRect(0, 0, width, height);
            var time = elapsed / 1000;
            var edge = width < 768 ? 11 : Math.max(24, (width - 1180) / 4);
            var routes = [
                [[edge, -35], [edge, height * .17], [edge + 34, height * .17 + 34], [edge + 34, height * .49], [edge + 8, height * .49 + 26], [edge + 8, height * .82], [edge + 52, height * .82 + 44], [edge + 52, height + 35]],
                [[width - edge, -40], [width - edge, height * .3], [width - edge - 42, height * .3 + 42], [width - edge - 42, height * .68], [width - edge - 14, height * .68 + 28], [width - edge - 14, height + 40]]
            ];
            ctx.globalCompositeOperation = 'lighter';
            routes.forEach(function (route, side) {
                ctx.globalAlpha = 1; ctx.shadowBlur = 0;
                ctx.strokeStyle = 'rgba(92,154,202,.22)'; ctx.lineWidth = .8;
                ctx.beginPath(); route.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke();
                route.slice(1, -1).forEach(function (p) { ctx.strokeRect(p[0] - 2, p[1] - 2, 4, 4); });
                var lengths = [], total = 0;
                for (var i = 1; i < route.length; i++) { var length = Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]); lengths.push(length); total += length; }
                var head = ((time * .55 + side * .47) % 1) * total;
                var tail = Math.min(190, total * .24);
                [head, head + total].forEach(function (end) {
                    var start = end - tail, distance = 0;
                    lengths.forEach(function (length, i) {
                        var from = Math.max(distance, start), to = Math.min(distance + length, end);
                        if (to > from) {
                            var a = route[i], b = route[i + 1];
                            var t0 = (from - distance) / length, t1 = (to - distance) / length;
                            filament(a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0, a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1, 13 + side * 71 + i * 9, time * 1.8, .85, false);
                        }
                        distance += length;
                    });
                });
            });
            ctx.globalAlpha = 1;
        }
        function canRun() { return motionEnabled() && !document.hidden && !suspended; }
        function tick(now) {
            frame = 0;
            if (!canRun()) return;
            if (!previous || now - previous >= 48) {
                elapsed += previous ? Math.min(now - previous, 100) : 0;
                previous = now; render();
            }
            frame = requestAnimationFrame(tick);
        }
        function sync() {
            canvas.hidden = !motionEnabled();
            if (canRun()) { if (!frame) { previous = 0; frame = requestAnimationFrame(tick); } }
            else { cancelAnimationFrame(frame); frame = 0; previous = 0; }
        }
        function resize() {
            width = innerWidth; height = innerHeight;
            var ratio = Math.min(devicePixelRatio || 1, 1.5);
            canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0); render();
        }
        window.addEventListener('resize', resize);
        document.addEventListener('visibilitychange', sync);
        window.addEventListener('pagehide', function () { suspended = true; sync(); });
        window.addEventListener('pageshow', function () { suspended = false; sync(); });
        motionListeners.push(sync); resize(); sync();
    }

    function initChargeScrollbar() {
        var eligible = window.matchMedia('(min-width: 992px) and (pointer: fine)');
        var rail = document.createElement('div');
        rail.className = 'charge-scrollbar'; rail.tabIndex = 0;
        rail.setAttribute('role', 'scrollbar'); rail.setAttribute('aria-controls', 'page-main');
        rail.setAttribute('aria-orientation', 'vertical'); rail.setAttribute('aria-valuemin', '0'); rail.setAttribute('aria-valuemax', '100');
        var thumb = document.createElement('span'); thumb.className = 'charge-scrollbar__thumb'; rail.appendChild(thumb);
        document.body.appendChild(rail);
        var frame = 0, drag = null, travel = 0, maximum = 0;
        function label() { rail.setAttribute('aria-label', window.PCMSI18n ? window.PCMSI18n.text('Page position') : 'Page position'); }
        function update() {
            frame = 0;
            maximum = Math.max(0, document.documentElement.scrollHeight - innerHeight);
            var active = eligible.matches && maximum > 0;
            document.documentElement.classList.toggle('has-charge-scrollbar', active);
            rail.hidden = !active;
            if (!active) return;
            var height = rail.clientHeight;
            var size = Math.min(height, Math.max(64, height * innerHeight / document.documentElement.scrollHeight));
            travel = height - size;
            var ratio = maximum ? Math.max(0, Math.min(1, scrollY / maximum)) : 0;
            thumb.style.height = size + 'px'; thumb.style.transform = 'translateY(' + ratio * travel + 'px)';
            rail.style.setProperty('--charge', ratio * 100 + '%');
            rail.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
        }
        function schedule() { if (!frame) frame = requestAnimationFrame(update); }
        rail.addEventListener('pointerdown', function (event) {
            if (event.button !== 0) return;
            event.preventDefault(); rail.focus({ preventScroll: true });
            if (event.target !== thumb) {
                var y = event.clientY - rail.getBoundingClientRect().top - thumb.clientHeight / 2;
                window.scrollTo({ top: Math.max(0, Math.min(1, y / travel)) * maximum, behavior: 'instant' });
            }
            drag = { y: event.clientY, scroll: scrollY };
            rail.classList.add('is-charging'); rail.setPointerCapture(event.pointerId);
        });
        rail.addEventListener('pointermove', function (event) {
            if (!drag || !travel) return;
            window.scrollTo({ top: drag.scroll + (event.clientY - drag.y) / travel * maximum, behavior: 'instant' });
        });
        function end() { drag = null; rail.classList.remove('is-charging'); }
        rail.addEventListener('pointerup', end); rail.addEventListener('pointercancel', end); rail.addEventListener('lostpointercapture', end);
        rail.addEventListener('keydown', function (event) {
            var next = { ArrowDown: scrollY + 80, ArrowUp: scrollY - 80, PageDown: scrollY + innerHeight * .85, PageUp: scrollY - innerHeight * .85, Home: 0, End: maximum }[event.key];
            if (next == null) return;
            event.preventDefault(); window.scrollTo({ top: next, behavior: 'instant' });
        });
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule); eligible.addEventListener('change', schedule);
        document.addEventListener('i18n:applied', function () { label(); schedule(); });
        if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.body);
        label(); update();
    }

    function init() {
        initBrandName();
        document.querySelectorAll('.animate-on-scroll, .animate-slide-left, .animate-slide-right, .animate-scale, .animate-flip').forEach(function (el) {
            el.classList.add('animate-visible');
        });
        syncMotion();
        initTitleTyping();
        initMotion();
        initPointerDepth();
        initHeroNetwork();
        initHeroCarousel();
        initVisibleEffects();
        initLightning();
        initChargeScrollbar();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
