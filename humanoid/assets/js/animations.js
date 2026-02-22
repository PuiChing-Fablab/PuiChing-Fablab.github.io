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
        // One-shot typewriter for section titles
        document.querySelectorAll('.section-title').forEach(function (el) {
            var text = el.textContent;
            el.textContent = '';
            el.style.visibility = 'visible';
            el.classList.add('typewriter-active');
            var i = 0;
            var obs = new IntersectionObserver(function (entries) {
                if (entries[0].isIntersecting && i === 0) {
                    var iv = setInterval(function () {
                        if (i < text.length) { el.textContent += text.charAt(i); i++; }
                        else { clearInterval(iv); el.classList.remove('typewriter-active'); el.classList.add('typewriter-done'); }
                    }, 50);
                    obs.disconnect();
                }
            }, { threshold: 0.3 });
            obs.observe(el);
        });

        // Infinite cycling typewriter for home intro title
        document.querySelectorAll('.home-intro-title').forEach(function (el) {
            var phrases = [
                el.textContent,
                'Humanoid Intelligence',
                'From Macau to the World Stage'
            ];
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
        var cards = document.querySelectorAll('.coach-card, .member-card, .connect-card, .timeline-card');
        cards.forEach(function (card) {
            card.addEventListener('mousemove', function (e) {
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
                card.style.transform = '';
            });
        });
    }

    // ============================================================
    // 6. PARALLAX SCROLLING
    // ============================================================
    function initParallax() {
        var hero = document.querySelector('.hero-photo');
        if (!hero) return;
        window.addEventListener('scroll', function () {
            var scrollY = window.pageYOffset;
            hero.style.transform = 'translateY(' + (scrollY * 0.3) + 'px) scale(1.05)';
        }, { passive: true });
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
    // 9. AUTO-TAG ANIMATION CLASSES
    // ============================================================
    function autoTag() {
        document.querySelectorAll('.activity-block').forEach(function (el, i) {
            el.classList.add('animate-on-scroll');
            el.classList.add('delay-' + ((i % 3) + 1));
        });
        document.querySelectorAll('.coach-card').forEach(function (el, i) {
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
        document.querySelectorAll('.timeline-item').forEach(function (el, i) {
            el.classList.add('animate-slide-left');
            el.classList.add('delay-' + ((i % 5) + 1));
        });
        document.querySelectorAll('.robot-showcase').forEach(function (el) {
            el.classList.add('animate-scale');
        });
        document.querySelectorAll('.highlight-card').forEach(function (el) {
            el.classList.add('animate-slide-right');
        });
        document.querySelectorAll('.school-link-item').forEach(function (el, i) {
            el.classList.add('animate-on-scroll');
            el.classList.add('delay-' + ((i % 4) + 1));
        });
        document.querySelectorAll('.activity-figure').forEach(function (el, i) {
            el.classList.add('animate-scale');
            el.classList.add('delay-' + ((i % 4) + 1));
        });
    }

    // ============================================================
    // 10. SCANLINE
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
