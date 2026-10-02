const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { MiasmaObject, assetPath } = require('../interactive-engine.js');

class FakeEvent {
    constructor(type, options = {}) {
        this.type = type;
        this.key = options.key || '';
        this.target = options.target || null;
        this.defaultPrevented = false;
    }
    preventDefault() { this.defaultPrevented = true; }
    stopPropagation() {}
}

class Element {
    constructor(id = '') {
        this.id = id;
        this.tagName = 'DIV';
        this.children = [];
        this.listeners = {};
        this.attributes = {};
        this.dataset = {};
        this.style = {};
        this.hidden = false;
        this.disabled = false;
        this.open = false;
        this._text = '';
        this.classList = {
            values: new Set(),
            toggle(name, force) { force ? this.values.add(name) : this.values.delete(name); },
            add(name) { this.values.add(name); },
            remove(name) { this.values.delete(name); }
        };
    }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    dispatchEvent(event) {
        event.target ||= this;
        for (const fn of this.listeners[event.type] || []) fn(event);
        return !event.defaultPrevented;
    }
    setAttribute(name, value) { this.attributes[name] = String(value); if (name === 'role') this.role = String(value); }
    getAttribute(name) { return this.attributes[name] ?? null; }
    append(...items) {
        for (const item of items) {
            if (typeof item === 'string') this._text += item;
            else { item.parentNode = this; this.children.push(item); }
        }
    }
    replaceChildren(...items) { this.children = []; this._text = ''; this.append(...items); }
    get textContent() { return this._text + this.children.map(item => item.textContent).join(''); }
    set textContent(value) { this.children = []; this._text = String(value); }
    set innerHTML(value) { this._html = String(value); }
    get innerHTML() { return this._html || ''; }
    querySelectorAll(selector) {
        const found = [];
        const visit = node => node.children.forEach(child => {
            if ((selector === '[role="tab"]' && child.role === 'tab')
                || (selector === '[data-interactive-key]' && child.dataset.interactiveKey !== undefined)) found.push(child);
            visit(child);
        });
        visit(this);
        return found;
    }
    closest(selector) {
        if (selector.includes('[role="tab"]') && this.role === 'tab') return this;
        if (selector.includes('input') && this.tagName === 'INPUT') return this;
        if (selector.includes('select') && this.tagName === 'SELECT') return this;
        if (selector.includes('textarea') && this.tagName === 'TEXTAREA') return this;
        if (selector.includes('[contenteditable="true"]') && this.contentEditable === 'true') return this;
        return null;
    }
    focus() { if (this.ownerDocument) this.ownerDocument.activeElement = this; }
    click() { this.dispatchEvent(new FakeEvent('click')); }
    showModal() { this.open = true; }
    close() { this.open = false; this.dispatchEvent(new FakeEvent('close')); }
}
class Audio extends Element {
    constructor() { super('audio'); this.paused = true; this.ended = false; this.currentTime = 0; }
    pause() { this.paused = true; }
    play() { this.paused = false; return Promise.resolve(); }
}
class Document extends Element {
    constructor() {
        super('document');
        this.elements = new Map();
        this.audio = [new Audio()];
        this.body = new Element('body');
        this.body.ownerDocument = this;
        this.activeElement = this.body;
    }
    getElementById(id) { return this.elements.get(id); }
    createElement(tag) { const e = new Element(); e.tagName = tag.toUpperCase(); e.ownerDocument = this; return e; }
    createElementNS(_ns, tag) { return this.createElement(tag); }
    querySelectorAll(selector) { return selector === '#audio_container audio' ? this.audio : super.querySelectorAll(selector); }
}
function fixture(name) {
    const data = {
        title: name, property_defaults: { view: 'home' }, on_load: "setProperty('view', 'home');",
        ui_actions: {
            info: "setInfoboxMaximised(true); playSound('tone.mp3');",
            reset_view: "setProperty('view', 'home');",
            left: "setProperty('view', 'left');",
            advance: "setProperty('view', 'second');"
        },
        ui: ['info', 'reset_view', 'left', 'advance'].map(name => ({ name })),
        states: [
            { properties: 'view:home', image: name + '-home.jpg', hotspots: [{ polygon: [0, 0, 10, 0, 10, 10], on_click: "setProperty('view', 'hotspot');" }] },
            { properties: 'view:left', image: name + '-left.jpg' },
            { properties: 'view:second', image: name + '-second.jpg' },
            { properties: 'view:hotspot', image: name + '-hotspot.jpg' }
        ]
    };
    return data;
}
function harness(fetch_impl = async url => ({ ok: true, json: async () => fixture(decodeURIComponent(url.split('/')[1])) })) {
    const document = new Document();
    for (const id of ['interactive_panel', 'gallery_panel', 'specimen_tabs', 'interactive_stage', 'interactive_image',
        'interactive_hotspots', 'interactive_controls', 'interactive_status', 'interactive_dialog', 'interactive_dialog_content',
        'interactive_dialog_title', 'interactive_completion', 'interactive_reset', 'show_hotspots', 'interactive_tab', 'gallery_tab']) {
        const element = new Element(id); element.ownerDocument = document; document.elements.set(id, element);
    }
    const stage = document.getElementById('interactive_stage');
    const image = document.getElementById('interactive_image');
    const hotspots = document.getElementById('interactive_hotspots');
    const controls = document.getElementById('interactive_controls');
    const tabs = document.getElementById('specimen_tabs');
    const interactive_tab = document.getElementById('interactive_tab');
    const gallery_tab = document.getElementById('gallery_tab');
    interactive_tab.role = gallery_tab.role = 'tab';
    tabs.append(interactive_tab, gallery_tab);
    stage.append(image, hotspots, controls);
    const window = new Element('window');
    window.miasmaInfoAvailable = [];
    const context = {
        document, window, Event: FakeEvent, Audio, MiasmaObject, miasmaAssetPath: assetPath, fetch: fetch_impl,
        DOMParser: class { parseFromString() { return { getElementById: () => null, querySelector: () => null, body: { textContent: '', innerHTML: '' } }; } },
        console: { error() {} }, Promise, Map, Set, encodeURIComponent
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'interactive.js'), 'utf8'), context);
    return { document, window, image, hotspots, controls, dialog: document.getElementById('interactive_dialog'), interactive_tab, gallery_tab };
}
async function waitFor(predicate) {
    for (let i = 0; i < 30; i++) {
        if (predicate()) return;
        await new Promise(resolve => setImmediate(resolve));
    }
    assert.fail('The interactive view did not settle');
}
function button(h, name) {
    const found = h.controls.querySelectorAll('[data-interactive-key]').find(item => item.dataset.interactiveKey === name);
    assert.ok(found, 'Missing interactive control: ' + name);
    return found;
}

test('Gallery pauses specimen audio and closes an open dialog', async () => {
    const h = harness();
    h.window.miasmaInteractive.select('specimen');
    await waitFor(() => h.image.hidden === false);
    button(h, 'info').click();
    assert.equal(h.dialog.open, true);
    assert.equal(h.document.audio.some(audio => !audio.paused), true);
    h.gallery_tab.click();
    assert.equal(h.dialog.open, false);
    assert.equal(h.document.audio.every(audio => audio.paused), true);
});

test('specimen sessions survive switching and stale loads cannot replace the newer specimen', async () => {
    const pending = new Map();
    const h = harness(url => {
        const name = decodeURIComponent(url.split('/')[1]);
        return name === 'slow' ? new Promise(resolve => pending.set(name, resolve))
            : Promise.resolve({ ok: true, json: async () => fixture(name) });
    });
    h.window.miasmaInteractive.select('first');
    await waitFor(() => h.image.src?.includes('first-home.jpg'));
    button(h, 'advance').click();
    assert.match(h.image.src, /first-second\.jpg$/);
    h.window.miasmaInteractive.select('second');
    await waitFor(() => h.image.src?.includes('second-home.jpg'));
    h.window.miasmaInteractive.select('first');
    await waitFor(() => h.image.src?.includes('first-second.jpg'));
    h.window.miasmaInteractive.select('slow');
    h.window.miasmaInteractive.select('newer');
    await waitFor(() => h.image.src?.includes('newer-home.jpg'));
    pending.get('slow')({ ok: true, json: async () => fixture('slow') });
    await new Promise(resolve => setImmediate(resolve));
    assert.match(h.image.src, /newer-home\.jpg$/);
});

test('Reset discards and reloads the cached specimen session', async () => {
    let fetch_count = 0;
    const h = harness(async url => {
        fetch_count++;
        return { ok: true, json: async () => fixture(decodeURIComponent(url.split('/')[1])) };
    });
    h.window.miasmaInteractive.select('resettable');
    await waitFor(() => h.image.src?.includes('resettable-home.jpg'));
    button(h, 'advance').click();
    assert.match(h.image.src, /resettable-second\.jpg$/);
    h.document.getElementById('interactive_reset').click();
    await waitFor(() => h.image.src?.includes('resettable-home.jpg') && fetch_count === 2);
    assert.equal(fetch_count, 2);
});

test('arrow keys skip inputs, tabs, and editable content and run valid directions elsewhere', async () => {
    const h = harness();
    h.window.miasmaInteractive.select('keyboard');
    await waitFor(() => h.image.src?.includes('keyboard-home.jpg'));
    for (const tag of ['INPUT', 'SELECT', 'TEXTAREA']) {
        const target = h.document.createElement(tag);
        h.document.dispatchEvent(new FakeEvent('keydown', { key: 'ArrowLeft', target }));
        assert.match(h.image.src, /keyboard-home\.jpg$/);
    }
    const editable = h.document.createElement('div');
    editable.contentEditable = 'true';
    h.document.dispatchEvent(new FakeEvent('keydown', { key: 'ArrowLeft', target: editable }));
    assert.match(h.image.src, /keyboard-home\.jpg$/);
    h.gallery_tab.dispatchEvent(new FakeEvent('keydown', { key: 'ArrowLeft' }));
    assert.match(h.image.src, /keyboard-home\.jpg$/);
    h.interactive_tab.click();
    h.document.dispatchEvent(new FakeEvent('keydown', { key: 'ArrowLeft', target: h.document.getElementById('interactive_stage') }));
    assert.match(h.image.src, /keyboard-left\.jpg$/);
});

test('hotspots activate with Enter and Space', async () => {
    const h = harness();
    h.window.miasmaInteractive.select('hotspots');
    await waitFor(() => h.hotspots.children.length === 1);
    h.hotspots.children[0].dispatchEvent(new FakeEvent('keydown', { key: 'Enter' }));
    assert.match(h.image.src, /hotspots-hotspot\.jpg$/);
    h.document.getElementById('interactive_reset').click();
    await waitFor(() => h.hotspots.children.length === 1 && h.image.src?.includes('hotspots-home.jpg'));
    h.hotspots.children[0].dispatchEvent(new FakeEvent('keydown', { key: ' ' }));
    assert.match(h.image.src, /hotspots-hotspot\.jpg$/);
});

