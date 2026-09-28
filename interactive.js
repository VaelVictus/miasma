(function () {
    'use strict';
    const byId = id => document.getElementById(id);
    const panel = byId('interactive_panel');
    const gallery = byId('gallery_panel');
    const tabs = byId('specimen_tabs');
    const stage = byId('interactive_stage');
    const image = byId('interactive_image');
    const hotspots = byId('interactive_hotspots');
    const controls = byId('interactive_controls');
    const status = byId('interactive_status');
    const dialog = byId('interactive_dialog');
    const dialogContent = byId('interactive_dialog_content');
    const sessions = new Map();
    let folder = '';
    let selectedTab = 'interactive';
    let current = null;
    let request = 0;
    let dialogKind = '';
    let dialogOwner = null;
    const labels = {
        left: ['←', 'Turn left'], right: ['→', 'Turn right'],
        up: ['↑', 'Look up'], down: ['↓', 'Look down'], back: ['↩', 'Go back'],
        zoom: ['⌕', 'Zoom'], zoom1: ['⌕', 'Zoom left'], zoom2: ['⌕', 'Zoom right'],
        lightsoff: ['◐', 'Toggle light'], lightson: ['◑', 'Toggle light']
    };

    function pauseAudio(session = current, name, rewind = false) {
        if (!session) return;
        for (const [file, audio] of session.audio) {
            if (name && name !== file) continue;
            audio.pause();
            if (rewind) audio.currentTime = 0;
        }
    }

    function makeSession(data, info, specimen) {
        const session = { audio: new Map(), info, engine: null, pendingCompletion: false };
        session.engine = new MiasmaObject(data, {
            playSound(name) {
                if (selectedTab !== 'interactive' || current !== session) return;
                // Never overlap the gallery's narration with an object sound.
                document.querySelectorAll('#audio_container audio').forEach(audio => audio.pause());
                let audio = session.audio.get(name);
                if (!audio) {
                    audio = new Audio(miasmaAssetPath(specimen, name, 'sound'));
                    session.audio.set(name, audio);
                    audio.addEventListener('error', () => {
                        if (current === session) status.textContent = 'This sound could not be loaded.';
                    });
                }
                if (audio.ended || !audio.paused) audio.currentTime = 0;
                audio.play().catch(() => {
                    if (current === session && selectedTab === 'interactive') status.textContent = 'Sound could not play. Try the object again.';
                });
            },
            pauseSound: name => pauseAudio(session, name),
            stopSound: name => pauseAudio(session, name, true),
            completed: () => { session.pendingCompletion = true; }
        });
        return session;
    }

    function showDialog(kind) {
        if (!current || panel.hidden) return;
        dialogKind = kind;
        dialogOwner = current;
        dialogContent.replaceChildren();
        const engine = current.engine;
        byId('interactive_dialog_title').textContent = kind === 'completion' ? engine.data.title : 'Trottering Notes';
        if (kind === 'completion') {
            const text = document.createElement('p');
            text.textContent = engine.data.completion_text || 'You have unlocked this object.';
            dialogContent.append(text);
            if (engine.data.code) {
                const code = document.createElement('code');
                code.textContent = engine.data.code;
                const line = document.createElement('p');
                line.append('Unlock code: ', code);
                dialogContent.append(line);
            }
            if (/^https?:\/\//i.test(engine.data.link || '')) {
                const link = document.createElement('a');
                link.href = engine.data.link;
                link.textContent = engine.data.completion_link_text || 'Continue';
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                dialogContent.append(link);
            }
        } else {
            const section = current.info.getElementById(engine.section);
            if (section) dialogContent.innerHTML = section.innerHTML;
            else if (engine.section === 'section-main' && !current.info.querySelector('.section') && current.info.body.textContent.trim()) {
                dialogContent.innerHTML = current.info.body.innerHTML;
            }
            else dialogContent.textContent = 'No notes survive for this part of the specimen.';
        }
        if (!dialog.open) dialog.showModal();
    }

    function render(resolved = current?.engine.resolve()) {
        if (!current || !resolved) return;
        const engine = current.engine;
        const [width, height] = engine.data.base_resolution || [800, 600];
        stage.style.aspectRatio = `${width} / ${height}`;
        stage.style.maxWidth = engine.zoom ? '100%' : `${Math.min(width, 960)}px`;
        panel.classList.toggle('zoomed', engine.zoom);
        hotspots.setAttribute('viewBox', `0 0 ${width} ${height}`);
        hotspots.setAttribute('preserveAspectRatio', 'none');
        image.hidden = !resolved.image;
        status.textContent = resolved.image ? '' : 'This view is unavailable. Reset the object to try again.';
        if (!resolved.image) {
            console.error('Miasma view unavailable', { folder, ...engine.diagnostics() });
        }
        if (resolved.image) {
            const path = miasmaAssetPath(folder, resolved.image);
            image.alt = engine.data.title || 'Miasma specimen';
            if (image.getAttribute('src') !== path) image.src = path;
        }
        const focusKey = document.activeElement?.dataset.interactiveKey;
        hotspots.replaceChildren();
        controls.replaceChildren();
        resolved.hotspots.forEach((hotspot, index) => {
            if (!Array.isArray(hotspot.polygon) || !hotspot.on_click) return;
            const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            polygon.setAttribute('points', hotspot.polygon.join(' '));
            polygon.setAttribute('role', 'button');
            polygon.setAttribute('tabindex', '0');
            polygon.setAttribute('aria-label', `Explore object detail ${index + 1}`);
            polygon.dataset.interactiveKey = `hotspot-${index}`;
            polygon.addEventListener('click', () => act(hotspot.on_click));
            polygon.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    act(hotspot.on_click);
                }
            });
            hotspots.append(polygon);
        });
        for (const definition of engine.data.ui || []) {
            const action = resolved.actions[definition.name];
            if (!action) continue;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'object_control ' + (definition.alignment || 'bottom,left').split(',').map(x => x.trim()).join(' ');
            const [symbol, label] = labels[definition.name] || [definition.name, definition.name];
            button.textContent = symbol;
            button.title = label;
            button.setAttribute('aria-label', label);
            button.dataset.interactiveKey = definition.name;
            button.addEventListener('click', () => act(action));
            controls.append(button);
        }
        if (focusKey && !dialog.open) {
            const replacement = [...stage.querySelectorAll('[data-interactive-key]')].find(el => el.dataset.interactiveKey === focusKey);
            (replacement || stage).focus({ preventScroll: true });
        }
        byId('interactive_completion').hidden = !engine.complete;
        if (current.pendingCompletion) {
            current.pendingCompletion = false;
            showDialog('completion');
        } else if (engine.infoboxOpen) showDialog('info');
    }

    function act(action) {
        if (!current) return;
        try { render(current.engine.act(action)); }
        catch (error) {
            console.error('Miasma interaction failed', error, { folder, ...current.engine.diagnostics() });
            status.textContent = 'This interaction could not be completed. Reset the object to try again.';
        }
    }

    async function load(specimen, reset = false) {
        const token = ++request;
        pauseAudio();
        current = null;
        if (dialog.open) dialog.close();
        hotspots.replaceChildren();
        controls.replaceChildren();
        image.hidden = true;
        panel.classList.remove('zoomed');
        byId('interactive_completion').hidden = true;
        byId('interactive_reset').disabled = true;
        if (!specimen) return;
        status.textContent = 'Loading specimen…';
        try {
            if (reset) sessions.delete(specimen);
            if (!sessions.has(specimen)) {
                const base = `object_data/${encodeURIComponent(specimen)}/`;
                const [data, info] = await Promise.all([
                    fetch(base + 'data.json').then(response => {
                        if (!response.ok) throw new Error('Object definition unavailable');
                        return response.json();
                    }),
                    (window.miasmaInfoAvailable || []).includes(specimen)
                        ? fetch(base + 'info.html').then(response => response.ok ? response.text() : '') : ''
                ]);
                if (token !== request) return;
                const session = makeSession(data, new DOMParser().parseFromString(info, 'text/html'), specimen);
                current = session;
                session.engine.act(data.on_load);
                sessions.set(specimen, session);
            }
            if (token !== request) return;
            current = sessions.get(specimen);
            byId('interactive_reset').disabled = false;
            render();
        } catch (error) {
            if (token !== request) return;
            console.error('Could not load interactive specimen', error);
            status.textContent = 'The interactive specimen could not load. Reset to retry, or open Gallery.';
            byId('interactive_reset').disabled = false;
        }
    }

    function setTab(name) {
        selectedTab = name;
        panel.hidden = !folder || name !== 'interactive';
        gallery.hidden = !folder || name !== 'gallery';
        for (const tab of tabs.querySelectorAll('[role="tab"]')) {
            const selected = tab.id === `${name}_tab`;
            tab.setAttribute('aria-selected', String(selected));
            tab.tabIndex = selected ? 0 : -1;
        }
        if (name === 'gallery') {
            pauseAudio();
            if (dialog.open) dialog.close();
            window.dispatchEvent(new Event('resize'));
        } else {
            document.querySelectorAll('#audio_container audio').forEach(audio => audio.pause());
        }
    }

    for (const tab of tabs.querySelectorAll('[role="tab"]')) {
        tab.addEventListener('click', () => setTab(tab.id.replace('_tab', '')));
        tab.addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            event.stopPropagation();
            const next = event.key === 'Home' ? 'interactive' : event.key === 'End' ? 'gallery' : selectedTab === 'interactive' ? 'gallery' : 'interactive';
            setTab(next);
            byId(`${next}_tab`).focus();
        });
    }
    byId('show_hotspots').addEventListener('change', event => stage.classList.toggle('show-hotspots', event.target.checked));
    byId('interactive_reset').addEventListener('click', () => load(folder, true));
    byId('interactive_completion').addEventListener('click', () => showDialog('completion'));
    dialog.addEventListener('close', () => {
        const owner = dialogOwner;
        const kind = dialogKind;
        dialogKind = '';
        dialogOwner = null;
        if (owner && kind === 'info') {
            owner.engine.infoboxOpen = false;
            owner.engine.act(owner.engine.data.ui_actions?.['infobox-close']);
            if (owner === current) render();
        }
        if (!panel.hidden && document.activeElement === document.body) stage.focus({ preventScroll: true });
    });
    image.addEventListener('error', () => {
        status.textContent = 'This specimen image could not be loaded.';
        console.error('Miasma image failed to load', { folder, url: image.src, ...current?.engine.diagnostics() });
    });
    document.addEventListener('keydown', event => {
        if (panel.hidden || !current || dialog.open || event.defaultPrevented
            || event.target.closest('input, select, textarea, [role="tab"], [contenteditable="true"]')) return;
        if (event.key === 'Escape' && current.engine.zoom) {
            act('toggleZoomMode();');
            return;
        }
        const direction = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[event.key];
        const action = current.engine.resolve().actions[direction];
        if (action) { event.preventDefault(); act(action); }
    });
    window.addEventListener('pagehide', () => pauseAudio());
    window.miasmaInteractive = {
        select(specimen) {
            folder = specimen;
            tabs.hidden = !specimen;
            setTab(selectedTab);
            load(specimen);
        }
    };
})();
