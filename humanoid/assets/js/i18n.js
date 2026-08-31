/* =========================================================================
   PCMS-HRG — language switching
   English lives in the HTML; other languages load a dictionary keyed by a
   hash of the English source. Dictionaries are .js (not .json) so the site
   still switches when opened straight from disk, where fetch() is blocked.
   ========================================================================= */
(function () {
    'use strict';

    var LANGS = [
        { code: 'en',      label: 'English',  html: 'en' },
        { code: 'zh-Hant', label: '繁體中文',  html: 'zh-Hant' },
        { code: 'de',      label: 'Deutsch',  html: 'de' },
        { code: 'it',      label: 'Italiano', html: 'it' }
    ];
    var STORE = 'pcms-hrg-lang';
    var base = document.documentElement.getAttribute('data-i18n-base') || '../assets/i18n/';

    window.__I18N__ = window.__I18N__ || {};

    function stored() {
        try { return localStorage.getItem(STORE); } catch (e) { return null; }
    }
    function remember(code) {
        try { localStorage.setItem(STORE, code); } catch (e) { /* private mode */ }
    }
    function known(code) {
        for (var i = 0; i < LANGS.length; i++) { if (LANGS[i].code === code) return LANGS[i]; }
        return null;
    }

    /* ---- capture the English source so switching back is lossless ---- */
    var source = null;
    function captureSource() {
        if (source) return;
        source = { text: {}, attr: {} };
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            source.text[el.getAttribute('data-i18n')] = el.innerHTML;
        });
        ATTRS.forEach(function (name) {
            document.querySelectorAll('[data-i18n-' + name + ']').forEach(function (el) {
                var k = el.getAttribute('data-i18n-' + name);
                source.attr[k] = source.attr[k] || el.getAttribute(name);
            });
        });
    }

    var ATTRS = ['alt', 'title', 'aria-label', 'data-caption', 'data-phrases', 'content'];

    function apply(code) {
        captureSource();
        var dict = code === 'en' ? null : (window.__I18N__[code] || null);

        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            var k = el.getAttribute('data-i18n');
            var v = dict ? dict[k] : source.text[k];
            if (v == null) v = source.text[k];
            if (v == null) return;
            // Record the intended content even when an effect is mid-way
            // through rewriting the element, so it can pick the new text up.
            el.__i18nText = v;
            if (el.innerHTML !== v) el.innerHTML = v;
        });

        ATTRS.forEach(function (name) {
            document.querySelectorAll('[data-i18n-' + name + ']').forEach(function (el) {
                var k = el.getAttribute('data-i18n-' + name);
                var v = dict ? dict[k] : source.attr[k];
                if (v == null) v = source.attr[k];
                if (v != null) el.setAttribute(name, v);
            });
        });

        var meta = known(code);
        document.documentElement.setAttribute('lang', meta ? meta.html : 'en');
        document.documentElement.setAttribute('data-lang', code);
        document.querySelectorAll('.lang-option').forEach(function (b) {
            b.setAttribute('aria-checked', b.getAttribute('data-lang') === code ? 'true' : 'false');
        });
        var current = document.querySelector('.lang-current');
        if (current && meta) current.textContent = meta.code === 'en' ? 'EN' : (meta.code === 'zh-Hant' ? '繁中' : meta.code.toUpperCase());
        document.documentElement.classList.remove('i18n-pending');
        document.dispatchEvent(new CustomEvent('i18n:applied', { detail: { lang: code } }));
    }

    /* ---- load a dictionary on demand, then apply ---- */
    var loading = {};
    function setLang(code) {
        if (!known(code)) code = 'en';
        remember(code);
        if (code === 'en' || window.__I18N__[code]) { apply(code); return; }
        if (loading[code]) return;
        loading[code] = true;
        var s = document.createElement('script');
        s.src = base + code + '.js';
        s.onload = function () { loading[code] = false; apply(code); };
        s.onerror = function () {
            loading[code] = false;
            document.documentElement.classList.remove('i18n-pending');
            console.warn('[i18n] dictionary not available:', code);
        };
        document.head.appendChild(s);
    }

    /* ---- switcher UI ---- */
    function buildSwitcher() {
        var host = document.querySelector('.lang-switch');
        if (!host) return;
        var menu = host.querySelector('.lang-menu');
        LANGS.forEach(function (l) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'lang-option';
            b.setAttribute('data-lang', l.code);
            b.setAttribute('role', 'menuitemradio');
            b.setAttribute('aria-checked', 'false');
            b.textContent = l.label;
            b.addEventListener('click', function () {
                setLang(l.code);
                close();
            });
            menu.appendChild(b);
        });

        var toggle = host.querySelector('.lang-toggle');
        function open() {
            host.classList.add('is-open');
            toggle.setAttribute('aria-expanded', 'true');
        }
        function close() {
            host.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
        }
        toggle.addEventListener('click', function (e) {
            e.stopPropagation();
            host.classList.contains('is-open') ? close() : open();
        });
        document.addEventListener('click', function (e) {
            if (!host.contains(e.target)) close();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') close();
        });
    }

    function init() {
        buildSwitcher();
        var pick = stored();
        if (!pick) {
            // First visit: follow the browser, but only into a language we have.
            var nav = (navigator.languages || [navigator.language || 'en']).join(',').toLowerCase();
            if (/zh-(hant|tw|hk|mo)|zh_hant/.test(nav)) pick = 'zh-Hant';
            else if (/\bde\b/.test(nav)) pick = 'de';
            else if (/\bit\b/.test(nav)) pick = 'it';
            else pick = 'en';
        }
        setLang(pick);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
