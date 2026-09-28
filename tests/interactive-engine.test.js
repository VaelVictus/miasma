const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { MiasmaObject, assetPath } = require('../interactive-engine.js');
const root = path.join(__dirname, '..');
const data = folder => JSON.parse(fs.readFileSync(path.join(root, 'object_data', folder, 'data.json'), 'utf8'));
const start = (folder, effects) => {
    const engine = new MiasmaObject(data(folder), effects);
    engine.act(engine.data.on_load);
    return engine;
};
const control = (engine, name) => {
    const action = engine.resolve().actions[name];
    assert.ok(action, `Missing control ${name}`);
    return engine.act(action);
};
const touch = (engine, index) => engine.act(engine.resolve().hotspots[index].on_click);

test('Bindlestiff whale close-up exposes only supported interactions and returns safely', () => {
    const engine = start('bindlestiff');
    control(engine, 'zoom');
    assert.equal(engine.resolve().image, 'Bindlestiff_Whale_Zoom.jpg');
    assert.equal(engine.resolve().hotspots.length, 0);
    control(engine, 'back');
    assert.equal(engine.properties.view, 'covered');
    assert.equal(engine.resolve().image, 'Bindlestiff_Seaweed_2.jpg');
});

test('Bindlestiff remembers both tears, plays each rip once, and reaches completion in either order', () => {
    for (const order of [[0, 0, 1], [1, 1, 0]]) {
        const sounds = [];
        const engine = start('bindlestiff', { playSound: name => sounds.push(name) });
        touch(engine, 0);
        touch(engine, 0);
        assert.equal(engine.section, 'lights_off');
        assert.equal(engine.infoboxOpen, true);
        engine.infoboxOpen = false; // Close the narrative before continuing.
        touch(engine, 0);
        assert.equal(engine.properties.view, 'case');
        touch(engine, order[0]);
        touch(engine, order[1]);
        assert.equal(engine.properties.view, 'case', 'Repeating one tear must not open the case');
        assert.equal(engine.complete, false);
        touch(engine, order[2]);
        assert.equal(engine.resolve().image, 'Bindlestiff_Inside_Zoom_Dark.jpg');
        assert.equal(sounds.filter(name => name === 'rip01.mp3').length, 1);
        assert.equal(sounds.filter(name => name === 'rip02.mp3').length, 1);
        touch(engine, 0);
        assert.equal(engine.complete, true);
    }
});

test('all 33 specimens initialize and reference existing optimized images and sounds', () => {
    let count = 0;
    for (const folder of fs.readdirSync(path.join(root, 'object_data'))) {
        if (!fs.existsSync(path.join(root, 'object_data', folder, 'data.json'))) continue;
        const engine = start(folder);
        assert.ok(engine.resolve().image, folder);
        count++;
        function visit(value, key) {
            if (typeof value === 'string') {
                if (key === 'image' && !value.startsWith('icon-')) {
                    assert.ok(fs.existsSync(path.join(root, decodeURIComponent(assetPath(folder, value)))), `${folder}: ${value}`);
                }
                for (const match of value.matchAll(/playSound\(['"]([^'"]+)/g)) {
                    assert.ok(fs.existsSync(path.join(root, decodeURIComponent(assetPath(folder, match[1], 'sound')))), `${folder}: ${match[1]}`);
                }
            } else if (value && typeof value === 'object') {
                for (const [childKey, child] of Object.entries(value)) visit(child, childKey);
            }
        }
        visit(engine.data);
    }
    assert.equal(count, 33);
});

test('Diplomat inherits hotspots, toggles its door, and completes only the correct sequence', () => {
    const sounds = [];
    const engine = start('diplomat', { playSound: name => sounds.push(name) });
    control(engine, 'left');
    control(engine, 'left');
    control(engine, 'zoom');
    assert.equal(engine.properties.view, 'buttons');
    assert.equal(engine.resolve().hotspots.length, 4);
    touch(engine, 3);
    assert.equal(engine.properties.door, 'open');
    touch(engine, 1);
    assert.equal(engine.progress, 0);
    for (const index of [0, 1, 2]) touch(engine, index);
    assert.equal(engine.complete, true);
    assert.ok(sounds.includes('noise.mp3'));
    control(engine, 'back');
    assert.equal(engine.properties.view, 's_w');
    assert.equal(engine.properties.door, 'open');
    control(engine, 'zoom');
    assert.equal(engine.progress, 0, 'on_show resets progress when returning to the puzzle');
});

test('Semestress preserves progress across repeated clicks in the same state', () => {
    const engine = start('semestress');
    for (let turn = 0; turn < 4; turn++) control(engine, 'left');
    control(engine, 'zoom1');
    for (const index of [2, 1, 1, 2, 0, 0, 2, 1]) touch(engine, index);
    assert.equal(engine.progress, 8);
    assert.equal(engine.complete, true);
});

test('Your Great Work reads changed selections before evaluating its lock', () => {
    const engine = start('yourgreatwork');
    function chooseAction(fragment) {
        const hotspot = engine.resolve().hotspots.find(item => item.on_click.includes(fragment));
        assert.ok(hotspot, fragment);
        engine.act(hotspot.on_click);
    }
    for (const [panel, value] of [[1, 3], [2, 2], [3, 2], [4, 3]]) {
        chooseAction(`setProperty('doors','${panel}')`);
        control(engine, 'zoom');
        for (let selection = 2; selection <= value; selection++) chooseAction(`setProperty('selection${panel}','${selection}'`);
        if (engine.properties.lock !== 'unlocked') control(engine, 'back');
    }
    assert.equal(engine.properties.lock, 'unlocked');
    assert.equal(engine.properties.doors, '0');
    assert.equal(engine.resolve().image, 'front-unlocked.jpg');
    touch(engine, 0);
    assert.equal(engine.complete, true);
});

test('Your Great Work can switch from the second door to the first', () => {
    const engine = start('yourgreatwork');
    const secondDoor = engine.resolve().hotspots.find(item => item.on_click.includes("setProperty('doors','2')"));
    engine.act(secondDoor.on_click);
    const firstDoor = engine.resolve().hotspots.find(item => item.polygon[0] === 345);
    engine.act(firstDoor.on_click);
    assert.equal(engine.properties.doors, '1');
    assert.equal(engine.resolve().image, 'front-1-1.jpg');
    control(engine, 'zoom');
    assert.equal(engine.resolve().image, 'panel-1-1.jpg');
});

test('Breath player dispatches play, pause, resume, and stop to the same recording', () => {
    const calls = [];
    const effects = Object.fromEntries(['playSound', 'pauseSound', 'stopSound'].map(name => [name, file => calls.push([name, file])]));
    const engine = start('player', effects);
    control(engine, 'zoom');
    for (const index of [0, 1, 0, 2]) touch(engine, index);
    assert.deepEqual(calls.map(call => call[0]), ['playSound', 'pauseSound', 'playSound', 'stopSound']);
    assert.ok(calls.every(call => call[1] === 'Black Crown Audio 1.mp3'));
});

test('nested on_show runs after a complete action rather than re-entering midway', () => {
    const engine = new MiasmaObject({
        property_defaults: { view: 'a' },
        states: [
            { properties: 'view:a', image: 'a.jpg' },
            { properties: 'view:b', image: 'b.jpg', on_show: 'progress = 0;' }
        ]
    });
    engine.act();
    engine.act("progress = 10; setProperty('view', 'b'); progress++;");
    assert.equal(engine.progress, 0);
    engine.act('progress++;');
    assert.equal(engine.progress, 1);
});

test('diagnostics capture a missing view and keep an immutable action history', () => {
    const engine = start('yourgreatwork');
    engine.act("setProperty('doors', 'missing');");
    const dump = engine.diagnostics();
    assert.equal(dump.image, null);
    assert.equal(dump.properties.doors, 'missing');
    assert.equal(dump.lastScript, "setProperty('doors', 'missing');");
    assert.equal(dump.recentActions.at(-1).propertiesBefore.doors, '0');
    assert.equal(dump.matchedStates[0].properties, 'view:s');
    engine.act("setProperty('doors', '0');");
    assert.equal(dump.properties.doors, 'missing');
    assert.equal(dump.recentActions.length, 2);
    for (let i = 0; i < 25; i++) engine.act('progress++;');
    assert.equal(engine.diagnostics().recentActions.length, 20);
});
