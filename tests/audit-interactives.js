// Explore actual UI actions, rather than merely checking the initial image.
// Navigation stacks are bounded to three entries; transitions at the bound are
// still validated. Progress above every comparison in the archive is equivalent.
const fs = require('node:fs');
const path = require('node:path');
const { MiasmaObject, assetPath } = require('../interactive-engine.js');
const root = path.join(__dirname, '..');

function audit(folder) {
    const base = path.join(root, 'object_data', folder);
    const data = JSON.parse(fs.readFileSync(path.join(base, 'data.json'), 'utf8'));
    const info = fs.existsSync(path.join(base, 'info.html')) ? fs.readFileSync(path.join(base, 'info.html'), 'utf8') : '';
    const sections = new Set([...info.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]));
    // The Diplomat's main notes use plain HTML rather than named sections.
    if (info.trim() && !/class=["'][^"']*\bsection\b/.test(info)) sections.add('section-main');
    const failures = new Map();
    const visited = new Set();
    const reached = new Set();
    const definitions = new Set();
    const queue = [];
    let transitions = 0;
    let stackBound = 0;
    let completions = 0;
    const initial = new MiasmaObject(data);
    const runners = initial.runners;
    const declaredControls = new Set((data.ui || []).map(ui => ui.name));
    const directoryEntries = new Map();
    function assetExists(name, kind = 'image') {
        const file = path.join(root, decodeURIComponent(assetPath(folder, name, kind)));
        const directory = path.dirname(file);
        if (!directoryEntries.has(directory)) directoryEntries.set(directory, new Set(fs.readdirSync(directory)));
        // Exact case matters on Linux even when this test is run on Windows.
        return directoryEntries.get(directory).has(path.basename(file));
    }
    function validateDefinition(value, key = '', location = 'data') {
        const invalid = message => failures.set(`${location}: ${message}`, { message, location });
        if (key === 'polygon') {
            if (!Array.isArray(value) || value.length < 6 || value.length % 2 || value.some(n => !Number.isFinite(n))) {
                invalid('Invalid hotspot polygon');
            } else {
                let area = 0;
                for (let i = 0; i < value.length; i += 2) {
                    const next = (i + 2) % value.length;
                    area += value[i] * value[next + 1] - value[next] * value[i + 1];
                }
                if (!area) invalid('Hotspot polygon has no area');
            }
        }
        if (key === 'ui_actions') {
            for (const name of Object.keys(value)) {
                if (name !== 'infobox-close' && !declaredControls.has(name)) invalid(`Action has no visible control: ${name}`);
            }
        }
        if (typeof value === 'string') {
            if (key === 'image' && !value.startsWith('icon-') && !assetExists(value)) invalid(`Missing or incorrectly cased image: ${value}`);
            for (const match of value.matchAll(/(?:play|pause|stop)Sound\(['"]([^'"]+)/g)) {
                if (!assetExists(match[1], 'sound')) invalid(`Missing or incorrectly cased sound: ${match[1]}`);
            }
            for (const match of value.matchAll(/setInfoboxSection\(['"]([^'"]+)/g)) {
                if (!sections.has(match[1])) invalid(`Missing narrative section: ${match[1]}`);
            }
        } else if (value && typeof value === 'object') {
            for (const [childKey, child] of Object.entries(value)) validateDefinition(child, childKey, `${location}.${childKey}`);
        }
    }
    validateDefinition(data);
    function collect(states, prefix = 'root') {
        (states || []).forEach((state, index) => {
            const key = `${prefix}.${index}`;
            definitions.add(key);
            collect(state.states, key);
        });
    }
    collect(data.states);
    function snapshot(engine) {
        return {
            properties: { ...engine.properties }, stack: engine.stack.map(item => [...item]),
            progress: Math.min(engine.progress, 9), rip1: engine.rip1, rip2: engine.rip2,
            section: engine.section, infoboxOpen: engine.infoboxOpen,
            complete: engine.complete, zoom: engine.zoom, entered: [...engine.entered]
        };
    }
    function restore(state) {
        const engine = new MiasmaObject(data, {
            playSound: name => {
                if (!fs.existsSync(path.join(root, decodeURIComponent(assetPath(folder, name, 'sound'))))) throw new Error(`Missing sound: ${name}`);
            }
        });
        Object.assign(engine, state, { properties: { ...state.properties }, stack: state.stack.map(item => [...item]), entered: new Set(state.entered), runners });
        return engine;
    }
    function failure(message, engine, route) {
        const key = `${message}|${JSON.stringify(engine.properties)}`;
        if (!failures.has(key)) failures.set(key, { message, properties: { ...engine.properties }, route });
    }
    function enqueue(engine, route) {
        const resolved = engine.resolve();
        resolved.branch.forEach(entry => reached.add(entry.key));
        if (!resolved.image) { failure('No image for reachable view', engine, route); return; }
        if (!fs.existsSync(path.join(root, decodeURIComponent(assetPath(folder, resolved.image))))) failure(`Missing image: ${resolved.image}`, engine, route);
        if (engine.infoboxOpen && !sections.has(engine.section)) failure(`Missing narrative section: ${engine.section}`, engine, route);
        if (engine.complete) completions++;
        if (engine.stack.length > 3) { stackBound++; return; }
        const state = snapshot(engine);
        const key = JSON.stringify(state);
        if (visited.has(key)) return;
        visited.add(key);
        queue.push({ state, route });
    }
    initial.act(data.on_load);
    enqueue(initial, []);
    for (let index = 0; index < queue.length; index++) {
        if (queue.length > 100000) throw new Error(`${folder}: audit state limit exceeded`);
        const { state, route } = queue[index];
        const resolved = restore(state).resolve();
        const actions = state.infoboxOpen
            ? [{ label: 'close narrative', action: data.ui_actions?.['infobox-close'], close: true }]
            : [
                ...(data.ui || []).filter(ui => resolved.actions[ui.name]).map(ui => ({ label: ui.name, action: resolved.actions[ui.name] })),
                ...resolved.hotspots.map((hotspot, i) => ({ label: `hotspot ${i + 1}`, action: hotspot.on_click }))
            ];
        for (const { label, action, close } of actions) {
            const engine = restore(state);
            const nextRoute = [...route, label];
            transitions++;
            try {
                if (close) engine.infoboxOpen = false;
                engine.act(action);
                enqueue(engine, nextRoute);
            } catch (error) { failure(error.message, engine, nextRoute); }
        }
    }
    return {
        folder, states: visited.size, transitions, stackBound,
        completionReached: completions > 0,
        unreachedBranches: [...definitions].filter(key => !reached.has(key)),
        failures: [...failures.values()]
    };
}

if (require.main === module) {
    const folders = process.argv.slice(2);
    const selected = folders.length ? folders : fs.readdirSync(path.join(root, 'object_data')).filter(folder => fs.existsSync(path.join(root, 'object_data', folder, 'data.json')));
    for (const folder of selected) console.log(JSON.stringify(audit(folder)));
}
module.exports = { audit };
