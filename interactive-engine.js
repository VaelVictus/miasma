/* The original, repository-owned data.json files contain executable action snippets.
 * Only load those trusted definitions here; this is not an interpreter for user input.
 * Rendering is batched after an action, so intermediate property changes cannot
 * re-enter on_show or overwrite puzzle progress halfway through a sequence. */
(function (root) {
    'use strict';

    class MiasmaObject {
        constructor(data, effects = {}) {
            this.data = data;
            this.effects = effects;
            this.properties = { ...data.state_defaults, ...data.property, ...data.property_defaults };
            this.stack = [];
            this.progress = 0;
            // Bindlestiff tracks its two tears across separate hotspot actions.
            // Keep these archived script variables local to this specimen, like progress.
            this.rip1 = 0;
            this.rip2 = 0;
            this.entered = new Set();
            this.section = 'section-main';
            this.infoboxOpen = false;
            this.complete = false;
            this.zoom = false;
            this.runners = new Map();
            this.history = [];
            this.lastScript = null;
        }

        resolve() {
            const branch = [];
            const descend = (states, parent) => {
                const index = (states || []).findIndex(state => (state.properties || '').split(',').every(rule => {
                    if (!rule.trim()) return true;
                    const colon = rule.indexOf(':');
                    return String(this.properties[rule.slice(0, colon).trim()]) === rule.slice(colon + 1).trim();
                }));
                if (index < 0) return;
                const state = states[index];
                const key = `${parent}.${index}`;
                branch.push({ key, state });
                descend(state.states, key);
            };
            descend(this.data.states, 'root');
            const resolved = { branch, image: null, hotspots: [], actions: { ...this.data.ui_actions } };
            for (const { state } of branch) {
                if (state.image) resolved.image = state.image;
                resolved.hotspots.push(...(state.hotspots || []));
                Object.assign(resolved.actions, state.ui_actions);
            }
            return resolved;
        }

        run(source) {
            if (!source) return;
            this.lastScript = source;
            const api = {
                setProperty: (key, value) => { this.properties[key] = value; },
                getProperty: key => this.properties[key],
                pushProperty: (key, value) => {
                    this.stack.push([key, this.properties[key]]);
                    this.properties[key] = value;
                },
                popProperty: () => {
                    const previous = this.stack.pop();
                    if (previous) this.properties[previous[0]] = previous[1];
                },
                playSound: name => this.effects.playSound?.(name),
                pauseSound: name => this.effects.pauseSound?.(name),
                stopSound: name => this.effects.stopSound?.(name),
                completed: () => { this.complete = true; this.effects.completed?.(); },
                setInfoboxSection: section => { this.section = section; },
                setInfoboxMaximised: open => { this.infoboxOpen = Boolean(open); },
                toggleZoomMode: () => { this.zoom = !this.zoom; },
                trace: () => {}
            };
            if (!this.runners.has(source)) {
                this.runners.set(source, new Function(...Object.keys(api), 'progress', 'rip1', 'rip2',
                    `"use strict"; ${source}; return { progress, rip1, rip2 };`));
            }
            const variables = this.runners.get(source)(...Object.values(api), this.progress, this.rip1, this.rip2);
            Object.assign(this, variables);
        }

        act(source) {
            this.history.push({ action: source || null, propertiesBefore: { ...this.properties } });
            if (this.history.length > 20) this.history.shift();
            this.run(source);
            // on_show may itself change the active branch. Settle it before painting.
            for (let pass = 0; pass < 30; pass++) {
                const resolved = this.resolve();
                const arriving = resolved.branch.filter(entry => !this.entered.has(entry.key));
                this.entered = new Set(resolved.branch.map(entry => entry.key));
                if (!arriving.length) return resolved;
                for (const { state } of arriving) this.run(state.on_show);
            }
            throw new Error('Object state did not settle.');
        }

        diagnostics() {
            const resolved = this.resolve();
            // Snapshot values now: DevTools otherwise shows objects after later mutations.
            return JSON.parse(JSON.stringify({
                object: this.data.name,
                title: this.data.title,
                properties: this.properties,
                propertyStack: this.stack,
                variables: { progress: this.progress, rip1: this.rip1, rip2: this.rip2 },
                lastScript: this.lastScript,
                image: resolved.image,
                matchedStates: resolved.branch.map(({ key, state }) => ({ key, properties: state.properties, image: state.image })),
                availableActions: resolved.actions,
                recentActions: this.history
            }));
        }
    }

    // The gallery's optimized replacements retain the original page ordering.
    function assetPath(folder, name, kind = 'image') {
        let file = name;
        let directory = kind === 'image' ? 'images' : 'sfx';
        if (kind === 'sound' && folder === 'player' && name === 'Black Crown Audio 1.mp3') file = 'player1.mp3';
        if (kind === 'image') {
            if (folder === 'bestiary') file = name.replace(/^3([a-d])\.jpg$/, '3$1$1.jpeg');
            if (folder === 'gates') file = name.replace(/\.jpg$/, '.jpeg');
            if (folder === 'pilot') {
                file = name.replace(/^pilot_(\d)\.jpg$/, 'pilot$1.jpeg');
                if (name === 'pilot_page1_fragment1.jpg') file = 'pilots_page1_fragment.jpg';
            }
            if (folder === 'pilot2') file = name.replace(/^pilot_page2_frag(\d)\.jpg$/, 'Pilots page2 Frag$1.jpeg');
            if (folder === 'tightwalk') file = name.replace(/^tightwalk_page(\d)\.jpg$/, 'The Tight Walk page$1.jpeg');
            if (folder === 'vaseandcup') file = 'vase_and_the_cup.jpeg';
            if (/^weevilhunt[123]$/.test(folder)) file = name.replace(/^weevilhunt_shard(\d)_page(\d)\.jpg$/, 'Weevil Hunt Shard $1_page$2.jpeg');
            if (folder === 'yourgreatwork' && name === 'front-spine.jpg') directory = '';
        }
        return ['object_data', folder, directory, file].filter(Boolean).map(encodeURIComponent).join('/');
    }

    if (typeof module !== 'undefined' && module.exports) module.exports = { MiasmaObject, assetPath };
    else Object.assign(root, { MiasmaObject, miasmaAssetPath: assetPath });
})(globalThis);
