/* =========================================================================
   PCMS-HRG — site interactions
   Gallery lightbox · activity filters · activity reel · back-to-top
   ========================================================================= */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------------------------------------------------------------------
       Lightbox — driven by any [data-lightbox] gallery on the page.
       Each trigger is a <button class="gallery-item" data-full="..." data-caption="...">
       --------------------------------------------------------------------- */
    function initLightbox() {
        var triggers = Array.prototype.slice.call(document.querySelectorAll('[data-full]'));
        if (!triggers.length) return;

        var box = document.createElement('div');
        box.className = 'lightbox';
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-modal', 'true');
        box.setAttribute('aria-label', 'Photo viewer');
        box.innerHTML =
            '<button class="lightbox-btn lightbox-close" type="button" aria-label="Close viewer"><i class="bi bi-x-lg"></i></button>' +
            '<button class="lightbox-btn lightbox-prev" type="button" aria-label="Previous photo"><i class="bi bi-chevron-left"></i></button>' +
            '<button class="lightbox-btn lightbox-next" type="button" aria-label="Next photo"><i class="bi bi-chevron-right"></i></button>' +
            '<figure class="lightbox-figure">' +
            '<img class="lightbox-img" alt="">' +
            '<figcaption class="lightbox-caption"></figcaption>' +
            '<span class="lightbox-counter"></span>' +
            '</figure>';
        document.body.appendChild(box);

        var img = box.querySelector('.lightbox-img');
        var cap = box.querySelector('.lightbox-caption');
        var counter = box.querySelector('.lightbox-counter');
        var group = [];
        var index = 0;
        var lastFocused = null;

        function show(i) {
            if (!group.length) return;
            index = (i + group.length) % group.length;
            var el = group[index];
            img.src = el.getAttribute('data-full');
            img.alt = el.getAttribute('data-caption') || '';
            cap.textContent = el.getAttribute('data-caption') || '';
            counter.textContent = (index + 1) + ' / ' + group.length;
        }

        function open(el) {
            var name = el.getAttribute('data-gallery') || '__all';
            group = triggers.filter(function (t) {
                return (t.getAttribute('data-gallery') || '__all') === name;
            });
            lastFocused = document.activeElement;
            show(group.indexOf(el));
            box.classList.add('is-open');
            document.body.style.overflow = 'hidden';
            box.querySelector('.lightbox-close').focus();
        }

        function close() {
            box.classList.remove('is-open');
            document.body.style.overflow = '';
            img.src = '';
            if (lastFocused) lastFocused.focus();
        }

        triggers.forEach(function (t) {
            t.addEventListener('click', function (e) {
                e.preventDefault();
                open(t);
            });
        });

        box.querySelector('.lightbox-close').addEventListener('click', close);
        box.querySelector('.lightbox-prev').addEventListener('click', function () { show(index - 1); });
        box.querySelector('.lightbox-next').addEventListener('click', function () { show(index + 1); });
        box.addEventListener('click', function (e) { if (e.target === box) close(); });

        document.addEventListener('keydown', function (e) {
            if (!box.classList.contains('is-open')) return;
            if (e.key === 'Escape') close();
            else if (e.key === 'ArrowLeft') show(index - 1);
            else if (e.key === 'ArrowRight') show(index + 1);
            else if (e.key === 'Tab') {
                // Keep focus inside the dialog.
                var focusables = box.querySelectorAll('button');
                var first = focusables[0];
                var last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        });
    }

    /* ---------------------------------------------------------------------
       Activity filters — chips carry data-filter, blocks carry data-category.
       --------------------------------------------------------------------- */
    function initFilters() {
        var chips = Array.prototype.slice.call(document.querySelectorAll('.filter-chip'));
        if (!chips.length) return;
        var blocks = Array.prototype.slice.call(document.querySelectorAll('[data-category]'));
        var empty = document.querySelector('.filter-empty');

        function apply(value) {
            var shown = 0;
            blocks.forEach(function (b) {
                var cats = (b.getAttribute('data-category') || '').split(/\s+/);
                var match = value === 'all' || cats.indexOf(value) !== -1;
                b.hidden = !match;
                if (match) shown++;
            });
            if (empty) empty.classList.toggle('is-visible', shown === 0);
            chips.forEach(function (c) {
                c.setAttribute('aria-pressed', c.getAttribute('data-filter') === value ? 'true' : 'false');
            });
            if (history.replaceState) {
                history.replaceState(null, '', value === 'all' ? location.pathname : '?filter=' + value);
            }
        }

        chips.forEach(function (c) {
            c.addEventListener('click', function () { apply(c.getAttribute('data-filter')); });
        });

        var preset = new URLSearchParams(location.search).get('filter');
        if (preset && chips.some(function (c) { return c.getAttribute('data-filter') === preset; })) {
            apply(preset);
        }
    }

    /* ---------------------------------------------------------------------
       Home activity reel — clone one complete set for a mathematically exact
       seamless loop. The clone is inert, so assistive technology and keyboard
       users encounter each activity only once.
       --------------------------------------------------------------------- */
    function initActivityLoop() {
        var loop = document.querySelector('.activity-loop');
        if (!loop) return;

        var track = loop.querySelector('.activity-loop__track');
        var group = track && track.querySelector('.activity-loop__group');
        var viewport = loop.querySelector('.activity-loop__viewport');
        var toggle = loop.querySelector('.activity-loop__toggle');
        if (!track || !group || !viewport) return;

        if (!track.querySelector('.activity-loop__group--clone')) {
            var clone = group.cloneNode(true);
            clone.classList.add('activity-loop__group--clone');
            clone.removeAttribute('role');
            clone.setAttribute('aria-hidden', 'true');
            clone.setAttribute('inert', '');
            Array.prototype.forEach.call(clone.querySelectorAll('[id]'), function (el) {
                el.removeAttribute('id');
            });
            Array.prototype.forEach.call(clone.querySelectorAll('a, button'), function (el) {
                el.setAttribute('tabindex', '-1');
            });
            track.appendChild(clone);
        }

        // Only the result plates near the horizontal viewport need their
        // chromatic sweep running. Pausing the off-screen copies avoids two
        // dozen simultaneous paint animations while preserving the visible
        // reel exactly as designed.
        var sweepSlides = Array.prototype.slice.call(track.querySelectorAll('.activity-slide'));
        var sweepTimer = 0;

        if (!reduceMotion) {

            function refreshVisibleSweeps() {
                sweepTimer = 0;
                var viewportRect = viewport.getBoundingClientRect();
                if (viewportRect.bottom <= 0 || viewportRect.top >= window.innerHeight) {
                    sweepSlides.forEach(function (slide) { slide.classList.remove('is-sweep-visible'); });
                    sweepTimer = window.setTimeout(refreshVisibleSweeps, 600);
                    return;
                }
                var preload = Math.min(240, viewportRect.width * 0.18);
                var visibleStates = sweepSlides.map(function (slide) {
                    var rect = slide.getBoundingClientRect();
                    return rect.right > viewportRect.left - preload && rect.left < viewportRect.right + preload;
                });
                sweepSlides.forEach(function (slide, index) {
                    slide.classList.toggle('is-sweep-visible', visibleStates[index]);
                });
                sweepTimer = window.setTimeout(refreshVisibleSweeps, 400);
            }

            function startVisibleSweeps() {
                if (!sweepTimer) refreshVisibleSweeps();
            }

            function stopVisibleSweeps() {
                window.clearTimeout(sweepTimer);
                sweepTimer = 0;
                sweepSlides.forEach(function (slide) { slide.classList.remove('is-sweep-visible'); });
            }

            document.addEventListener('visibilitychange', function () {
                if (document.hidden) stopVisibleSweeps();
                else startVisibleSweeps();
            });
            startVisibleSweeps();
        }

        var paused = reduceMotion;

        function setPaused(value) {
            paused = value;
            loop.classList.toggle('is-paused', paused);
            if (!toggle) return;
            toggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
            toggle.setAttribute('aria-label', paused ? 'Resume automatic activity movement' : 'Pause automatic activity movement');
            toggle.setAttribute('title', paused ? 'Resume automatic activity movement' : 'Pause automatic activity movement');
            var icon = toggle.querySelector('.bi');
            if (icon) icon.className = paused ? 'bi bi-play-fill' : 'bi bi-pause-fill';
        }

        setPaused(paused);
        if (toggle) {
            if (reduceMotion) {
                toggle.hidden = true;
            } else {
                toggle.addEventListener('click', function () { setPaused(!paused); });
            }
        }

        if (!reduceMotion) {
            var releaseTimer = 0;
            viewport.addEventListener('pointerdown', function () {
                window.clearTimeout(releaseTimer);
                loop.classList.add('is-dragging');
            }, { passive: true });

            function releaseDrag() {
                window.clearTimeout(releaseTimer);
                releaseTimer = window.setTimeout(function () {
                    loop.classList.remove('is-dragging');
                }, 900);
            }

            window.addEventListener('pointerup', releaseDrag, { passive: true });
            window.addEventListener('pointercancel', releaseDrag, { passive: true });
        }
    }

    /* ---------------------------------------------------------------------
       Stat counters — count up once the strip scrolls into view.
       --------------------------------------------------------------------- */
    function initCounters() {
        var values = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
        if (!values.length) return;

        if (reduceMotion || !('IntersectionObserver' in window)) {
            values.forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
            return;
        }

        var obs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var el = entry.target;
                obs.unobserve(el);
                var target = parseInt(el.getAttribute('data-count'), 10);
                if (isNaN(target)) { el.textContent = el.getAttribute('data-count'); return; }
                var start = performance.now();
                var duration = 1100;
                (function step(now) {
                    var p = Math.min((now - start) / duration, 1);
                    // easeOutCubic
                    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
                    if (p < 1) requestAnimationFrame(step);
                })(start);
            });
        }, { threshold: 0.4 });

        values.forEach(function (el) { obs.observe(el); });
    }

    /* ---------------------------------------------------------------------
       Back-to-top button.
       --------------------------------------------------------------------- */
    function initToTop() {
        var btn = document.createElement('button');
        btn.className = 'to-top';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Back to top');
        btn.innerHTML = '<i class="bi bi-arrow-up"></i>';
        document.body.appendChild(btn);

        btn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        });

        var ticking = false;
        window.addEventListener('scroll', function () {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(function () {
                btn.classList.toggle('is-visible', window.scrollY > 600);
                ticking = false;
            });
        }, { passive: true });
    }

    /* ---------------------------------------------------------------------
       Deep links into a filtered/collapsed activity still need to land
       below the sticky navigation.
       --------------------------------------------------------------------- */
    function initHashOffset() {
        if (!location.hash) return;
        var target = document.querySelector(location.hash);
        if (!target) return;
        requestAnimationFrame(function () {
            target.scrollIntoView({ behavior: 'auto', block: 'start' });
        });
    }

    /* ---------------------------------------------------------------------
       Coach addresses copy to the clipboard when clicked. The chip answers
       with a tick rather than a word, so the feedback needs no translation.
       --------------------------------------------------------------------- */
    function initCopyEmail() {
        var links = document.querySelectorAll('.coach-email');
        if (!links.length) return;

        function flash(link) {
            var icon = link.querySelector('.bi');
            var was = icon ? icon.className : null;
            link.classList.add('is-copied');
            if (icon) icon.className = was.replace('bi-envelope-fill', 'bi-check-lg');
            window.setTimeout(function () {
                link.classList.remove('is-copied');
                if (icon) icon.className = was;
            }, 1600);
        }

        // The async clipboard is unavailable on file:// and plain http, where
        // the site is often opened straight from disk — hence the fallback.
        function copy(text) {
            if (navigator.clipboard && window.isSecureContext) {
                return navigator.clipboard.writeText(text);
            }
            return new Promise(function (resolve, reject) {
                var ta = document.createElement('textarea');
                ta.value = text;
                ta.setAttribute('readonly', '');
                ta.style.position = 'fixed';
                ta.style.top = '-1000px';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                var ok = false;
                try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
                document.body.removeChild(ta);
                if (ok) { resolve(); } else { reject(); }
            });
        }

        links.forEach(function (link) {
            link.addEventListener('click', function (e) {
                var href = link.getAttribute('href') || '';
                var address = href.replace(/^mailto:/, '');
                if (!address) return;
                e.preventDefault();
                copy(address).then(function () {
                    flash(link);
                }, function () {
                    // Nothing was copied — hand the click back to the mail
                    // client the href already points at.
                    window.location.href = href;
                });
            });
        });
    }

    function init() {
        initLightbox();
        initFilters();
        initActivityLoop();
        initCounters();
        initToTop();
        initHashOffset();
        initCopyEmail();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
