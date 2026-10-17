/* Chromatic titles, hero slideshow, circuit pulses and scroll charging. */
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
        var circuits = [];
        var backdrop = document.createElement('canvas');
        var trace = backdrop.getContext('2d');
        function hash(n) { var value = Math.sin(n * 127.1 + 311.7) * 43758.5453; return (value - Math.floor(value)) * 2 - 1; }
        function noise(index, time, seed) {
            var step = Math.floor(time), blend = time - step;
            blend = blend * blend * (3 - 2 * blend);
            return hash(index + step * 97 + seed) * (1 - blend) + hash(index + (step + 1) * 97 + seed) * blend;
        }
        function route(points) {
            var segments = [], stops = [0], length = 0;
            for (var i = 1; i < points.length; i++) {
                var a = points[i - 1], b = points[i];
                var distance = Math.hypot(b[0] - a[0], b[1] - a[1]);
                segments.push({ a: a, dx: b[0] - a[0], dy: b[1] - a[1], start: length, length: distance });
                length += distance; stops.push(length);
            }
            return { points: points, segments: segments, stops: stops, length: length, branches: [] };
        }
        function position(path, distance) {
            var segment = path.segments.find(function (part) { return distance <= part.start + part.length; }) || path.segments[path.segments.length - 1];
            var along = Math.max(0, Math.min(segment.length, distance - segment.start));
            var fraction = along / segment.length;
            return { x: segment.a[0] + segment.dx * fraction, y: segment.a[1] + segment.dy * fraction,
                nx: -segment.dy / segment.length, ny: segment.dx / segment.length,
                corner: Math.min(along, segment.length - along) };
        }
        function drawTrace(path, branch) {
            trace.strokeStyle = branch ? 'rgba(111,146,199,.14)' : 'rgba(100,169,204,.21)';
            trace.lineWidth = .75;
            trace.beginPath();
            path.points.forEach(function (p, i) { if (i) trace.lineTo(p[0], p[1]); else trace.moveTo(p[0], p[1]); });
            trace.stroke();
            if (branch) {
                var end = path.points[path.points.length - 1];
                trace.strokeRect(end[0] - 3, end[1] - 3, 6, 6);
            } else {
                path.branches.forEach(function (spur) {
                    var start = spur.points[0];
                    trace.strokeRect(start[0] - 2.5, start[1] - 2.5, 5, 5);
                    drawTrace(spur, true);
                });
            }
        }
        function buildCircuits() {
            var w = width, h = height, bevel = Math.min(36, w * .04, h * .055);
            // The visible copper traces and the pulses share these exact paths.
            // Horizontal buses, 45-degree bends and return legs replace falling bolts.
            circuits = [
                route([[-24, h * .84], [w * .08, h * .84], [w * .08 + bevel, h * .84 - bevel],
                    [w * .08 + bevel, h * .55 + bevel], [w * .08 + bevel * 2, h * .55],
                    [w * .30, h * .55], [w * .30 + bevel, h * .55 - bevel],
                    [w * .30 + bevel, h * .30 + bevel], [w * .30 + bevel * 2, h * .30],
                    [w * .84, h * .30], [w * .84 + bevel, h * .30 - bevel],
                    [w * .84 + bevel, h * .16], [w + 24, h * .16]]),
                route([[w + 24, h * .43], [w * .78, h * .43], [w * .78 - bevel, h * .43 + bevel],
                    [w * .78 - bevel, h * .72 - bevel], [w * .78 - bevel * 2, h * .72],
                    [w * .45, h * .72], [w * .45 - bevel, h * .72 + bevel],
                    [w * .45 - bevel, h * .86 - bevel], [w * .45 - bevel * 2, h * .86],
                    [w * .17, h * .86], [w * .17 - bevel, h * .86 - bevel],
                    [w * .17 - bevel, h * .65 + bevel], [w * .17 - bevel * 2, h * .65], [-24, h * .65]])
            ];
            circuits.forEach(function (path, index) {
                [4, 8].forEach(function (joint, branchIndex) {
                    var p = path.points[joint], direction = index ? -1 : 1;
                    var reach = Math.min(100, w * .13) * (branchIndex ? -1 : 1);
                    var spur = route([p, [p[0], p[1] - direction * bevel],
                        [p[0] + direction * bevel, p[1] - direction * bevel * 2],
                        [p[0] + direction * bevel + reach, p[1] - direction * bevel * 2]]);
                    spur.junction = path.stops[joint];
                    path.branches.push(spur);
                });
                drawTrace(path, false);
            });
        }
        function filament(path, head, tail, seed, time, strength, branch) {
            var start = Math.max(0, head - tail), end = Math.min(path.length, head);
            if (end - start < 2) return;
            var samples = [start, end];
            for (var d = Math.ceil(start / 5) * 5; d < end; d += 5) samples.push(d);
            // Include every corner so a bolt cannot cut diagonally across a bend.
            path.stops.forEach(function (stop) { if (stop > start && stop < end) samples.push(stop); });
            samples.sort(function (a, b) { return a - b; });
            var points = samples.map(function (distance) {
                var p = position(path, distance);
                var envelope = Math.sin((distance - start) / (end - start) * Math.PI);
                var spread = Math.min(1, p.corner / 14) * envelope * (branch ? .6 : 1);
                // Fine irregular filaments hug the conductor, including at corners.
                var jitter = (noise(Math.floor(distance / 23), time * 11, seed) * 6
                    + noise(Math.floor(distance / 5), time * 19, seed + 53) * 3) * spread;
                return { x: p.x + p.nx * jitter, y: p.y + p.ny * jitter };
            });
            var a = points[0], b = points[points.length - 1];
            var gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            gradient.addColorStop(0, 'rgba(68,130,255,0)'); gradient.addColorStop(.22, '#577fff');
            gradient.addColorStop(.48, '#c471ff'); gradient.addColorStop(.72, '#ff8bda');
            gradient.addColorStop(1, '#8bfff1');
            ctx.beginPath(); points.forEach(function (p, i) { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
            ctx.lineJoin = 'round'; ctx.lineCap = 'round';
            ctx.strokeStyle = gradient; ctx.shadowColor = '#777dff'; ctx.shadowBlur = branch ? 6 : 13;
            ctx.globalAlpha = strength * .35; ctx.lineWidth = branch ? 2 : 4; ctx.stroke();
            ctx.shadowBlur = branch ? 3 : 7; ctx.globalAlpha = strength; ctx.lineWidth = branch ? .7 : 1.3; ctx.stroke();
            ctx.shadowBlur = 0; ctx.strokeStyle = '#e4faff'; ctx.globalAlpha = strength * .65; ctx.lineWidth = .4; ctx.stroke();
            if (head <= path.length) {
                ctx.fillStyle = '#cefff6'; ctx.shadowColor = '#65f8ff'; ctx.shadowBlur = 9;
                ctx.globalAlpha = strength; ctx.beginPath(); ctx.arc(b.x, b.y, branch ? 1 : 1.6, 0, Math.PI * 2); ctx.fill();
            }
        }
        function render() {
            ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.shadowBlur = 0;
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(backdrop, 0, 0, width, height);
            ctx.globalCompositeOperation = 'lighter';
            var time = elapsed / 1000, speed = width < 768 ? 460 : 760;
            var tail = Math.min(260, width * .28);
            circuits.forEach(function (path, index) {
                var head = (time * speed + path.length * (index ? .63 : .12)) % (path.length + tail);
                filament(path, head, tail, 13 + index * 71, time, .85, false);
                path.branches.forEach(function (spur, branchIndex) {
                    // A junction discharges only after the main pulse reaches it.
                    filament(spur, head - spur.junction, tail * .45, 91 + index * 19 + branchIndex * 31, time, .55, true);
                });
            });
            ctx.globalAlpha = 1; ctx.shadowBlur = 0;
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
            width = document.documentElement.clientWidth; height = innerHeight;
            var ratio = Math.min(devicePixelRatio || 1, 1.5);
            canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
            backdrop.width = canvas.width; backdrop.height = canvas.height;
            trace.setTransform(ratio, 0, 0, ratio, 0, 0); buildCircuits();
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0); render();
        }
        window.addEventListener('resize', resize);
        document.addEventListener('visibilitychange', sync);
        window.addEventListener('pagehide', function () { suspended = true; sync(); });
        window.addEventListener('pageshow', function () { suspended = false; sync(); });
        motionListeners.push(sync); resize(); sync();
    }

    function initScrollCharge() {
        // The browser owns the only scrollbar. This edge light never handles input.
        var edge = document.createElement('div');
        edge.className = 'scroll-charge'; edge.setAttribute('aria-hidden', 'true');
        var flow = document.createElement('span'); flow.className = 'scroll-charge__flow'; edge.appendChild(flow);
        document.body.appendChild(edge);
        var frame = 0, timer = 0, lastY = scrollY;
        function settle() {
            clearTimeout(timer);
            edge.classList.remove('is-charging');
            edge.style.setProperty('--scroll-energy', '0');
        }
        function update() {
            frame = 0;
            var delta = scrollY - lastY;
            lastY = scrollY;
            edge.hidden = !motionEnabled() || document.documentElement.scrollHeight <= innerHeight;
            if (edge.hidden || document.hidden) { settle(); return; }
            if (Math.abs(delta) < .5) return;
            var energy = Math.min(1, .18 + Math.abs(delta) / 80);
            edge.style.setProperty('--scroll-energy', energy.toFixed(2));
            edge.style.setProperty('--charge-speed', (1.2 - energy * .55).toFixed(2) + 's');
            edge.classList.toggle('is-reversing', delta < 0);
            edge.classList.add('is-charging');
            clearTimeout(timer); timer = setTimeout(settle, 560);
        }
        function schedule() { if (!frame) frame = requestAnimationFrame(update); }
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
        window.addEventListener('pagehide', function () { cancelAnimationFrame(frame); frame = 0; settle(); });
        document.addEventListener('i18n:applied', schedule);
        if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.body);
        motionListeners.push(schedule); update();
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
        initScrollCharge();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
