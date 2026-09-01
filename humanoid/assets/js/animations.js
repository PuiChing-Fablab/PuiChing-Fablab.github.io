// ============================================================
// PCMS-HRG — Advanced Dynamic Animations
// ============================================================

(function () {
    'use strict';

    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ============================================================
    // 1. PAGE LOAD OVERLAY + ENERGY BAR
    // ============================================================
    function initPageLoader() {
        var overlay = document.createElement('div');
        overlay.className = 'page-loader';
        overlay.innerHTML = '<div class="loader-bar"></div><div class="loader-text">INITIALIZING</div>';
        document.body.appendChild(overlay);

        window.addEventListener('load', function () {
            setTimeout(function () {
                overlay.classList.add('loaded');
                setTimeout(function () { overlay.remove(); }, 600);
            }, 400);
        });
    }

    // ============================================================
    // 2. TYPEWRITER EFFECT — INFINITE LOOP WITH BACKSPACE
    // ============================================================
    function initTypewriter() {
        // One-shot typewriter for the page heading only. Section sub-headings stay
        // static: on long pages, a heading that never crosses the observer
        // threshold would otherwise be left permanently blank.
        // One-shot typewriter for the page heading. It renders from the text
        // i18n stashed on the element, and re-renders on a language change —
        // otherwise switching mid-type leaves the old and new text concatenated.
        document.querySelectorAll('h1.section-title').forEach(function (el) {
            var iv = null;
            var started = false;

            function intended() {
                return el.__i18nText != null ? el.__i18nText : el.textContent;
            }

            function render(text) {
                if (iv) { clearInterval(iv); iv = null; }
                var i = 0;
                el.textContent = '';
                el.classList.remove('typewriter-done');
                el.classList.add('typewriter-active');
                iv = setInterval(function () {
                    if (i < text.length) { el.textContent += text.charAt(i); i++; }
                    else {
                        clearInterval(iv); iv = null;
                        el.classList.remove('typewriter-active');
                        el.classList.add('typewriter-done');
                    }
                }, 50);
            }

            function start() {
                if (started) return;
                started = true;
                render(intended());
            }

            document.addEventListener('i18n:applied', function () {
                if (started) render(intended());
            });

            if (!('IntersectionObserver' in window)) { start(); return; }
            var obs = new IntersectionObserver(function (entries) {
                if (entries[0].isIntersecting) { obs.disconnect(); start(); }
            }, { threshold: 0.3 });
            obs.observe(el);
            // Safety net: never leave the heading unwritten.
            setTimeout(function () { obs.disconnect(); start(); }, 4000);
        });

        // Infinite cycling typewriter for home intro title
        document.querySelectorAll('.home-intro-title').forEach(function (el) {
            // Alternate phrases live in the markup (data-phrases, pipe
            // separated) so that they are translatable like everything else.
            function phraseList() {
                var base = el.__i18nText != null ? el.__i18nText : el.getAttribute('data-base') || el.textContent;
                var extra = (el.getAttribute('data-phrases') || '').split('|')
                                .map(function (t) { return t.trim(); })
                                .filter(Boolean);
                return [base].concat(extra);
            }
            if (!el.getAttribute('data-base')) el.setAttribute('data-base', el.textContent.trim());
            var phrases = phraseList();
            el.textContent = '';
            el.style.visibility = 'visible';
            el.classList.add('typewriter-active');

            var phraseIdx = 0;
            var charIdx = 0;
            var isDeleting = false;
            var typeSpeed = 55;      // ms per char typing
            var deleteSpeed = 35;    // ms per char deleting (faster)
            var pauseAfterType = 1800; // pause after full text
            var pauseAfterDelete = 500; // pause after deletion

            function tick() {
                var current = phrases[phraseIdx];
                if (!isDeleting) {
                    // Typing
                    el.textContent = current.substring(0, charIdx + 1);
                    charIdx++;
                    if (charIdx >= current.length) {
                        // Finished typing — pause then start deleting
                        setTimeout(function () {
                            isDeleting = true;
                            tick();
                        }, pauseAfterType);
                        return;
                    }
                    setTimeout(tick, typeSpeed);
                } else {
                    // Deleting
                    el.textContent = current.substring(0, charIdx - 1);
                    charIdx--;
                    if (charIdx <= 0) {
                        // Finished deleting — move to next phrase
                        isDeleting = false;
                        phraseIdx = (phraseIdx + 1) % phrases.length;
                        charIdx = 0;
                        setTimeout(tick, pauseAfterDelete);
                        return;
                    }
                    setTimeout(tick, deleteSpeed);
                }
            }

            document.addEventListener('i18n:applied', function () {
                phrases = phraseList();
                phraseIdx = 0;
                charIdx = 0;
                isDeleting = false;
            });

            var obs = new IntersectionObserver(function (entries) {
                if (entries[0].isIntersecting) {
                    tick();
                    obs.disconnect();
                }
            }, { threshold: 0.3 });
            obs.observe(el);
        });
    }

    // ============================================================
    // 3. SCROLL-TRIGGERED ANIMATIONS (IntersectionObserver)
    // ============================================================
    function initScrollAnimations() {
        var elements = document.querySelectorAll(
            '.animate-on-scroll, .animate-slide-left, .animate-slide-right, .animate-scale, .animate-flip'
        );
        if (!elements.length) return;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-visible');
                }
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

        elements.forEach(function (el) { observer.observe(el); });
    }

    // ============================================================
    // 4. PARTICLE / STARDUST BACKGROUND
    // ============================================================
    function initParticles() {
        var canvas = document.getElementById('particle-canvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var particles = [];
        var count = Math.min(100, Math.floor(window.innerWidth / 10));
        var mouse = { x: null, y: null };

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', function (e) {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });
        window.addEventListener('mouseout', function () {
            mouse.x = null;
            mouse.y = null;
        });

        function Particle() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.8;
            this.vy = (Math.random() - 0.5) * 0.8;
            this.radius = Math.random() * 2.5 + 0.8;
            this.baseOpacity = Math.random() * 0.5 + 0.15;
            this.opacity = this.baseOpacity;
            this.pulseSpeed = Math.random() * 0.02 + 0.005;
            this.pulseOffset = Math.random() * Math.PI * 2;
        }

        for (var i = 0; i < count; i++) particles.push(new Particle());

        var frame = 0;
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            frame++;

            particles.forEach(function (p, i) {
                // Pulse opacity
                p.opacity = p.baseOpacity + Math.sin(frame * p.pulseSpeed + p.pulseOffset) * 0.15;

                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

                // Mouse repulsion
                if (mouse.x !== null) {
                    var dx = p.x - mouse.x;
                    var dy = p.y - mouse.y;
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 150) {
                        var force = (150 - dist) / 150 * 0.8;
                        p.x += (dx / dist) * force;
                        p.y += (dy / dist) * force;
                    }
                }

                // Draw particle with glow
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 240, 255, ' + p.opacity + ')';
                ctx.shadowBlur = 12;
                ctx.shadowColor = 'rgba(0, 240, 255, 0.5)';
                ctx.fill();
                ctx.shadowBlur = 0;

                // Connections
                for (var j = i + 1; j < particles.length; j++) {
                    var p2 = particles[j];
                    var ddx = p.x - p2.x;
                    var ddy = p.y - p2.y;
                    var d = Math.sqrt(ddx * ddx + ddy * ddy);
                    if (d < 130) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = 'rgba(0, 240, 255, ' + (0.08 * (1 - d / 130)) + ')';
                        ctx.lineWidth = 0.6;
                        ctx.stroke();
                    }
                }

                // Mouse connections
                if (mouse.x !== null) {
                    var mdx = p.x - mouse.x;
                    var mdy = p.y - mouse.y;
                    var mdist = Math.sqrt(mdx * mdx + mdy * mdy);
                    if (mdist < 180) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(mouse.x, mouse.y);
                        ctx.strokeStyle = 'rgba(0, 240, 255, ' + (0.2 * (1 - mdist / 180)) + ')';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            });

            requestAnimationFrame(draw);
        }
        draw();
    }

    // ============================================================
    // 5. 3D TILT ON HOVER (cards)
    // ============================================================
    function initTilt() {
        var cards = document.querySelectorAll('.coach-card, .contact-coach-card, .member-card, .connect-card');
        cards.forEach(function (card) {
            card.addEventListener('mousemove', function (e) {
                card.classList.add('is-tilting');
                var rect = card.getBoundingClientRect();
                var x = e.clientX - rect.left;
                var y = e.clientY - rect.top;
                var centerX = rect.width / 2;
                var centerY = rect.height / 2;
                var rotateX = (y - centerY) / centerY * -8;
                var rotateY = (x - centerX) / centerX * 8;
                card.style.transform = 'perspective(600px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-4px)';
            });
            card.addEventListener('mouseleave', function () {
                card.classList.remove('is-tilting');
                card.style.transform = '';
            });
        });
    }

    // ============================================================
    // 6. PARALLAX SCROLLING
    // ============================================================
    function initParallax() {
        var hero = document.querySelector('.hero-bg');
        if (!hero) return;
        // The image fills its container, so the drift has to stay inside the
        // headroom that scale() creates — otherwise an edge is exposed.
        var MAX = 26;
        var ticking = false;
        function update() {
            var offset = Math.min(window.pageYOffset * 0.18, MAX);
            hero.style.transform = 'translateY(' + offset + 'px) scale(1.12)';
            ticking = false;
        }
        window.addEventListener('scroll', function () {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(update);
        }, { passive: true });
        update();
    }

    // ============================================================
    // 7. PAGE TRANSITION (fade out on link click)
    // ============================================================
    function initPageTransitions() {
        document.body.classList.add('page-enter');
        setTimeout(function () {
            document.body.classList.add('page-enter-active');
        }, 10);

        document.querySelectorAll('a[href]').forEach(function (link) {
            if (link.hostname === window.location.hostname && !link.getAttribute('target')) {
                link.addEventListener('click', function (e) {
                    var href = link.getAttribute('href');
                    if (href && href !== '#' && !href.startsWith('#')) {
                        e.preventDefault();
                        document.body.classList.add('page-exit');
                        setTimeout(function () {
                            window.location.href = href;
                        }, 350);
                    }
                });
            }
        });
    }

    // ============================================================
    // 8. NEON RIPPLE ON SOCIAL BUTTONS
    // ============================================================
    function initRipple() {
        document.querySelectorAll('.social-link-named, .btn-tab-link, .connect-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                var ripple = document.createElement('span');
                ripple.className = 'neon-ripple';
                var rect = btn.getBoundingClientRect();
                ripple.style.left = (e.clientX - rect.left) + 'px';
                ripple.style.top = (e.clientY - rect.top) + 'px';
                btn.style.position = 'relative';
                btn.style.overflow = 'hidden';
                btn.appendChild(ripple);
                setTimeout(function () { ripple.remove(); }, 600);
            });
        });
    }

    // ============================================================
    // 9. TEAM PREVIEW — DRIFTING CLUSTER OVER A METEOR SHOWER
    // ============================================================
    function initTeamPreviewDrift() {
        document.querySelectorAll('.team-preview-grid').forEach(function (grid) {
            var items = Array.prototype.slice.call(grid.querySelectorAll('.team-preview-item'));
            if (items.length < 2) return;

            var drifters = [];
            var frame = null;
            var lastTime = 0;
            var resizeTimer = null;
            var isPaused = false;
            var isVisible = true;
            var width = 0;
            var height = 0;

            // The shower is decoration only: aria-hidden spans, appended after
            // the links, so they never reach the tab order or the a11y tree.
            function buildMeteors(count) {
                for (var i = 0; i < count; i++) {
                    var meteor = document.createElement('span');
                    meteor.className = 'team-preview-meteor';
                    meteor.setAttribute('aria-hidden', 'true');
                    meteor.style.setProperty('--meteor-top', (Math.random() * 96).toFixed(1) + '%');
                    meteor.style.setProperty('--meteor-left', (-14 + Math.random() * 46).toFixed(1) + '%');
                    meteor.style.setProperty('--meteor-len', (70 + Math.random() * 95).toFixed(0) + 'px');
                    meteor.style.setProperty('--meteor-dur', (2.6 + Math.random() * 3.6).toFixed(2) + 's');
                    meteor.style.setProperty('--meteor-delay', (Math.random() * 9).toFixed(2));
                    grid.appendChild(meteor);
                }
            }

            function build() {
                drifters = items.map(function (item) {
                    var angle = Math.random() * Math.PI * 2;
                    var speed = 10 + Math.random() * 16;
                    return {
                        el: item,
                        // Size spread gives the cluster depth. The robots sit at
                        // the top of the range so the full-body cut-outs stay
                        // legible, but not so large that they dominate.
                        scale: (item.classList.contains('is-robot') ? 0.94 : 0.76) + Math.random() * 0.3,
                        size: 0,
                        r: 0,
                        x: 0,
                        y: 0,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed
                    };
                });
            }

            function write(d) {
                d.el.style.setProperty('--drift-x', (d.x - d.r) + 'px');
                d.el.style.setProperty('--drift-y', (d.y - d.r) + 'px');
            }

            function measure() {
                width = grid.clientWidth;
                if (width <= 0) return false;
                height = Math.max(230, Math.min(330, Math.round(width * 0.66)));
                grid.style.height = height + 'px';
                return true;
            }

            // Diameters come from a target fill of the panel, not a fixed pixel
            // value: below ~30% coverage the items have room to drift, above it
            // they spend the whole time colliding.
            function place(keepPositions) {
                var base = Math.sqrt((width * height * 0.3 / drifters.length) / Math.PI) * 2;
                base = Math.max(38, Math.min(84, base));

                drifters.forEach(function (d) {
                    d.size = Math.round(base * d.scale);
                    d.r = d.size / 2;
                    d.el.style.setProperty('--drift-size', d.size + 'px');

                    if (keepPositions) {
                        d.x = Math.min(Math.max(d.x, d.r), width - d.r);
                        d.y = Math.min(Math.max(d.y, d.r), height - d.r);
                    } else {
                        d.x = d.r + Math.random() * Math.max(1, width - d.size);
                        d.y = d.r + Math.random() * Math.max(1, height - d.size);
                    }
                    write(d);
                });
            }

            // Equal-mass elastic bounce, resolved exactly. Fifteen items is 105
            // pairs a frame — cheap enough to skip a spatial index, and it keeps
            // the portraits from stacking into an unreadable pile.
            function collide() {
                for (var i = 0; i < drifters.length; i++) {
                    for (var j = i + 1; j < drifters.length; j++) {
                        var a = drifters[i];
                        var b = drifters[j];
                        var dx = b.x - a.x;
                        var dy = b.y - a.y;
                        var min = a.r + b.r;
                        var d2 = dx * dx + dy * dy;
                        if (d2 >= min * min || d2 === 0) continue;

                        var d = Math.sqrt(d2);
                        var nx = dx / d;
                        var ny = dy / d;
                        var push = (min - d) / 2;
                        a.x -= nx * push;
                        a.y -= ny * push;
                        b.x += nx * push;
                        b.y += ny * push;

                        var approach = (b.vx * nx + b.vy * ny) - (a.vx * nx + a.vy * ny);
                        if (approach >= 0) continue;
                        a.vx += nx * approach;
                        a.vy += ny * approach;
                        b.vx -= nx * approach;
                        b.vy -= ny * approach;
                    }
                }
            }

            function step(now) {
                // A backgrounded tab resumes with a huge delta; clamping keeps
                // the cluster from teleporting across the panel on return.
                var dt = Math.min(0.05, (now - lastTime) / 1000);
                lastTime = now;

                drifters.forEach(function (d) {
                    d.x += d.vx * dt;
                    d.y += d.vy * dt;

                    if (d.x < d.r) { d.x = d.r; d.vx = Math.abs(d.vx); }
                    else if (d.x > width - d.r) { d.x = width - d.r; d.vx = -Math.abs(d.vx); }
                    if (d.y < d.r) { d.y = d.r; d.vy = Math.abs(d.vy); }
                    else if (d.y > height - d.r) { d.y = height - d.r; d.vy = -Math.abs(d.vy); }
                });

                collide();
                drifters.forEach(write);
                frame = requestAnimationFrame(step);
            }

            function start() {
                if (frame || isPaused || !isVisible) return;
                lastTime = performance.now();
                frame = requestAnimationFrame(step);
            }

            function stop() {
                if (!frame) return;
                cancelAnimationFrame(frame);
                frame = null;
            }

            grid.classList.add('is-drifting');
            build();
            if (!measure()) return;
            place(false);
            buildMeteors(9);
            start();

            grid.addEventListener('pointerenter', function () { isPaused = true; stop(); });
            grid.addEventListener('pointerleave', function () { isPaused = false; start(); });
            grid.addEventListener('focusin', function () { isPaused = true; stop(); });
            grid.addEventListener('focusout', function () {
                setTimeout(function () {
                    if (!grid.contains(document.activeElement)) { isPaused = false; start(); }
                }, 0);
            });

            if ('IntersectionObserver' in window) {
                var visibilityObserver = new IntersectionObserver(function (entries) {
                    isVisible = entries[0].isIntersecting;
                    if (isVisible) start();
                    else stop();
                }, { threshold: 0.15 });
                visibilityObserver.observe(grid);
            }

            window.addEventListener('resize', function () {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(function () {
                    if (measure()) place(true);
                }, 120);
            }, { passive: true });
        });
    }

    // ============================================================
    // 10. AUTO-TAG ANIMATION CLASSES
    // ============================================================
    function autoTag() {
        document.querySelectorAll('.activity-block').forEach(function (el, i) {
            el.classList.add('animate-on-scroll');
            el.classList.add('delay-' + ((i % 3) + 1));
        });
        document.querySelectorAll('.coach-card, .contact-coach-card').forEach(function (el, i) {
            el.classList.add('animate-scale');
            el.classList.add('delay-' + (i + 1));
        });
        document.querySelectorAll('.member-card').forEach(function (el, i) {
            el.classList.add('animate-on-scroll');
            el.classList.add('delay-' + ((i % 5) + 1));
        });
        document.querySelectorAll('.connect-card').forEach(function (el, i) {
            el.classList.add('animate-scale');
            el.classList.add('delay-' + (i + 1));
        });
        document.querySelectorAll('.journey-item').forEach(function (el, i) {
            el.classList.add('animate-slide-left');
            el.classList.add('delay-' + ((i % 5) + 1));
        });
        document.querySelectorAll('.stat-card').forEach(function (el, i) {
            el.classList.add('animate-on-scroll');
            el.classList.add('delay-' + ((i % 5) + 1));
        });
        document.querySelectorAll('.line-card').forEach(function (el, i) {
            el.classList.add('animate-scale');
            el.classList.add('delay-' + (i + 1));
        });
        document.querySelectorAll('.tech-card').forEach(function (el, i) {
            el.classList.add('animate-on-scroll');
            el.classList.add('delay-' + ((i % 3) + 1));
        });
        document.querySelectorAll('.honour-card').forEach(function (el, i) {
            el.classList.add('animate-on-scroll');
            el.classList.add('delay-' + ((i % 3) + 1));
        });
        document.querySelectorAll('.fleet-unit').forEach(function (el, i) {
            el.classList.add('animate-scale');
            el.classList.add('delay-' + ((i % 4) + 1));
        });
        document.querySelectorAll('.result-table-wrap, .roster').forEach(function (el) {
            el.classList.add('animate-on-scroll');
        });
        document.querySelectorAll('.robot-showcase').forEach(function (el) {
            el.classList.add('animate-scale');
        });
        document.querySelectorAll('.press-link').forEach(function (el, i) {
            el.classList.add('animate-on-scroll');
            el.classList.add('delay-' + ((i % 4) + 1));
        });
    }

    // ============================================================
    // 11. SCANLINE
    // ============================================================
    function initScanline() {
        document.body.classList.add('scanline-overlay');
    }

    // ============================================================
    // INIT
    // ============================================================
    function init() {
        if (reducedMotion) {
            // Skip all animations for users who prefer reduced motion
            document.querySelectorAll('.animate-on-scroll, .animate-slide-left, .animate-slide-right, .animate-scale, .animate-flip').forEach(function (el) {
                el.classList.add('animate-visible');
            });
            return;
        }

        initPageLoader();
        autoTag();
        initScrollAnimations();
        initParticles();
        initTilt();
        initParallax();
        initPageTransitions();
        initRipple();
        initTeamPreviewDrift();
        initScanline();

        // Delay typewriter slightly for page load effect
        setTimeout(initTypewriter, 800);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
