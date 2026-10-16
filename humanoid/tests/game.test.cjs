const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// A controlled clock reproduces input/Enter and timeout races without waiting
// for a real round or exposing the game's private state in production.
function game({ storageThrows = false } = {}) {
    let now = 0, nextId = 0, language = 'en';
    const jobs = new Map(), elements = new Map(), documentEvents = {};
    function element(id) {
        if (!elements.has(id)) {
            const classes = new Set(), events = {};
            elements.set(id, {
                textContent: '', value: '', disabled: false, style: {}, attributes: {},
                classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c) },
                setAttribute(k, v) { this.attributes[k] = v; },
                addEventListener(k, fn) { events[k] = fn; },
                fire(k, event = {}) { events[k]?.(event); },
                focus() {}, appendChild() {}
            });
        }
        return elements.get(id);
    }
    function schedule(fn, delay, interval) {
        const id = ++nextId;
        jobs.set(id, { fn, at: now + delay, interval });
        return id;
    }
    const context = {
        document: {
            getElementById: element, querySelector: element, createElement: element,
            addEventListener(k, fn) { documentEvents[k] = fn; }
        },
        window: {
            matchMedia: () => ({ matches: true }),
            PCMSI18n: { text: (s, values = {}) => (language === 'zh' ? '中：' : '') + s.replace(/\{(\w+)\}/g, (_, k) => values[k]) }
        },
        localStorage: {
            getItem() { if (storageThrows) throw Error('unavailable'); return '0'; },
            setItem() { if (storageThrows) throw Error('unavailable'); }
        },
        performance: { now: () => now },
        Math: Object.assign(Object.create(Math), { random: () => 0 }),
        setTimeout: (fn, delay) => schedule(fn, delay, 0),
        setInterval: (fn, delay) => schedule(fn, delay, delay),
        clearTimeout: id => jobs.delete(id), clearInterval: id => jobs.delete(id)
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/game.js'), 'utf8'), context);
    return {
        element,
        start: () => element('startBtn').fire('click'),
        answer() { element('gameInput').value = 'ROBOT'; element('gameInput').fire('input'); },
        advance(ms) {
            const target = now + ms;
            while (true) {
                const next = [...jobs].filter(([, j]) => j.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
                if (!next) break;
                const [id, job] = next;
                now = job.at;
                if (job.interval) job.at += job.interval; else jobs.delete(id);
                job.fn();
            }
            now = target;
        },
        elapseWithoutCallbacks(ms) { now += ms; },
        translate() { language = 'zh'; documentEvents['i18n:applied'](); }
    };
}

test('input plus repeated Enter credits one answer only', () => {
    const g = game(); g.start(); g.answer();
    const score = g.element('scoreDisplay').textContent;
    for (let i = 0; i < 5; i++) g.element('gameInput').fire('keydown', { key: 'Enter' });
    assert.equal(g.element('scoreDisplay').textContent, score);
    assert.equal(g.element('comboDisplay').textContent, '1x');
    g.advance(400); g.answer();
    assert.equal(g.element('comboDisplay').textContent, '2x');
});

test('correct answer just before timeout survives the feedback delay', () => {
    const g = game(); g.start(); g.advance(7999); g.answer(); g.advance(401);
    assert.equal(g.element('gameOver').classList.contains('show'), false);
    assert.equal(g.element('gameInput').disabled, false);
    assert.equal(g.element('comboDisplay').textContent, '1x');
});

test('expired answer cannot score before the next timer callback', () => {
    const g = game(); g.start(); g.elapseWithoutCallbacks(8001); g.answer();
    assert.equal(g.element('scoreDisplay').textContent, 0);
    assert.equal(g.element('gameInput').disabled, true);
    g.advance(600);
    assert.equal(g.element('gameOver').classList.contains('show'), true);
    assert.equal(g.element('gameOver').inert, false);
});

test('restart cancels the previous game-over callback and round timers', () => {
    const g = game(); g.start(); g.advance(8000); g.start(); g.advance(601);
    assert.equal(g.element('gameOver').classList.contains('show'), false);
    assert.equal(g.element('gameOver').inert, true);
    assert.equal(g.element('gameInput').disabled, false);
    g.advance(7399);
    assert.equal(g.element('gameInput').disabled, true);
});

test('language changes preserve the live answer and score', () => {
    const g = game(); g.start(); g.advance(60); g.answer();
    const score = g.element('scoreDisplay').textContent;
    g.translate();
    assert.match(g.element('levelBadge').textContent, /^中：/);
    assert.equal(g.element('scrambleDisplay').textContent, 'ROBOT');
    assert.equal(g.element('scoreDisplay').textContent, score);
});

test('unavailable storage still allows play and a completed game', () => {
    const g = game({ storageThrows: true }); g.start(); g.answer(); g.advance(9000);
    assert.equal(g.element('gameOver').classList.contains('show'), true);
    assert.ok(g.element('finalScore').textContent > 0);
});
