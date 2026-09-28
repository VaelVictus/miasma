(() => {
    "use strict";

    const source_base_url = "https://raw.githubusercontent.com/bonfiredog/blackcrownproject/master/assets/objects/object_data";
    const manifest = window.blackcrown_manifest || [];
    const embedded_objects = window.blackcrown_objects || {};

    const object_title = document.getElementById("object_title");
    const object_description = document.getElementById("object_description");
    const object_select = document.getElementById("object_select");
    const object_image = document.getElementById("object_image");
    const hotspot_layer = document.getElementById("hotspot_layer");
    const controls_layer = document.getElementById("controls_layer");
    const stage = document.getElementById("stage");
    const state_status = document.getElementById("state_status");
    const source_status = document.getElementById("source_status");
    const debug_hotspots = document.getElementById("debug_hotspots");
    const reset_button = document.getElementById("reset_button");
    const asset_notice = document.getElementById("asset_notice");
    const infobox = document.getElementById("infobox");
    const infobox_content = document.getElementById("infobox_content");
    const infobox_close = document.getElementById("infobox_close");
    const completion_overlay = document.getElementById("completion_overlay");
    const completion_text = document.getElementById("completion_text");
    const completion_link = document.getElementById("completion_link");
    const completion_close = document.getElementById("completion_close");

    const object_state = {
        object_name: null,
        data: null,
        info_html: "",
        info_document: null,
        properties: {},
        property_stack: [],
        progress: 0,
        current_state_keys: [],
        infobox_section: "section-main",
        infobox_maximised: false,
        current_ui_actions: {},
        completed: false,
        zoom_mode: false,
        load_token: 0,
        source: "",
        audio_players: new Map()
    };

    const control_symbols = {
        left: "←",
        right: "→",
        up: "↑",
        down: "↓",
        back: "↩",
        zoom: "⌕",
        zoom1: "⌕",
        zoom2: "⌕"
    };

    function populateObjectSelect() {
        object_select.replaceChildren();

        for (const item of manifest) {
            const option = document.createElement("option");
            option.value = item.dir;
            option.textContent = item.title;
            object_select.appendChild(option);
        }
    }

    function localArchiveUrl(filename) {
        return `archive/${encodeURIComponent(object_state.object_name)}/${filename}`;
    }

    function remoteArchiveUrl(filename) {
        return `${source_base_url}/${encodeURIComponent(object_state.object_name)}/${filename}`;
    }

    function localAssetUrl(kind, filename) {
        return `assets/${encodeURIComponent(object_state.object_name)}/${kind}/${encodeURIComponent(filename)}`;
    }

    function remoteAssetUrl(kind, filename) {
        return `${source_base_url}/${encodeURIComponent(object_state.object_name)}/${kind}/${encodeURIComponent(filename)}`;
    }

    async function fetchText(url) {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`${response.status} ${response.statusText}`);
        }
        return response.text();
    }

    async function loadArchivePair(object_name) {
        const local_data_url = `archive/${encodeURIComponent(object_name)}/data.json`;
        const local_info_url = `archive/${encodeURIComponent(object_name)}/info.html`;
        const remote_data_url = `${source_base_url}/${encodeURIComponent(object_name)}/data.json`;
        const remote_info_url = `${source_base_url}/${encodeURIComponent(object_name)}/info.html`;

        try {
            const [data_text, info_result] = await Promise.all([
                fetchText(local_data_url),
                fetchText(local_info_url).catch(() => "")
            ]);
            return {
                data: JSON.parse(data_text),
                info_html: info_result,
                source: "local archive"
            };
        } catch (local_error) {
            try {
                const [data_text, info_result] = await Promise.all([
                    fetchText(remote_data_url),
                    fetchText(remote_info_url).catch(() => "")
                ]);
                return {
                    data: JSON.parse(data_text),
                    info_html: info_result,
                    source: "GitHub archive"
                };
            } catch (remote_error) {
                const embedded = embedded_objects[object_name];
                if (embedded) {
                    return {
                        data: embedded.data,
                        info_html: embedded.info_html || "",
                        source: "bundled fallback"
                    };
                }

                throw new Error(`Could not load ${object_name}: ${remote_error.message}`);
            }
        }
    }

    function parseRule(rule_text) {
        const rule = {};
        if (!rule_text) {
            return rule;
        }

        for (const fragment of String(rule_text).split(",")) {
            const separator_index = fragment.indexOf(":");
            if (separator_index === -1) {
                continue;
            }

            const property_name = fragment.slice(0, separator_index).trim();
            const property_value = fragment.slice(separator_index + 1).trim();
            rule[property_name] = property_value;
        }

        return rule;
    }

    function matchesRule(rule_text) {
        const rule = parseRule(rule_text);
        return Object.entries(rule).every(([property_name, property_value]) => {
            return String(object_state.properties[property_name]) === property_value;
        });
    }

    function resolveStateBranch(states, parent_key = "root") {
        if (!Array.isArray(states)) {
            return [];
        }

        const matching_index = states.findIndex(state => matchesRule(state.properties));
        if (matching_index === -1) {
            return [];
        }

        const matching_state = states[matching_index];
        const key = `${parent_key}.${matching_index}`;
        return [
            { key, state: matching_state },
            ...resolveStateBranch(matching_state.states, key)
        ];
    }

    function resolveState() {
        if (!object_state.data) {
            return null;
        }

        const branch = resolveStateBranch(object_state.data.states);
        if (!branch.length) {
            return null;
        }

        let image = null;
        const hotspots = [];
        const ui_actions = { ...(object_state.data.ui_actions || {}) };

        for (const entry of branch) {
            if (entry.state.image) {
                image = entry.state.image;
            }
            if (Array.isArray(entry.state.hotspots)) {
                hotspots.push(...entry.state.hotspots);
            }
            Object.assign(ui_actions, entry.state.ui_actions || {});
        }

        return {
            branch,
            image,
            hotspots,
            ui_actions
        };
    }

    function getProperty(property_name) {
        return object_state.properties[property_name];
    }

    function setProperty(property_name, property_value) {
        object_state.properties[property_name] = property_value;
        renderObject();
    }

    function pushProperty(property_name, property_value) {
        object_state.property_stack.push({
            property_name,
            property_value: object_state.properties[property_name]
        });
        object_state.properties[property_name] = property_value;
        renderObject();
    }

    function popProperty() {
        const previous_property = object_state.property_stack.pop();
        if (!previous_property) {
            return;
        }

        object_state.properties[previous_property.property_name] = previous_property.property_value;
        renderObject();
    }

    function createAudioPlayer(filename) {
        const audio = new Audio(localAssetUrl("audio", filename));
        audio.preload = "auto";
        audio.dataset.fallback_stage = "local";

        audio.addEventListener("error", () => {
            if (audio.dataset.fallback_stage !== "local") {
                return;
            }
            audio.dataset.fallback_stage = "remote";
            audio.src = remoteAssetUrl("audio", filename);
            audio.load();
            audio.play().catch(() => {});
        });

        object_state.audio_players.set(filename, audio);
        return audio;
    }

    function getAudioPlayer(filename) {
        return object_state.audio_players.get(filename) || createAudioPlayer(filename);
    }

    function playSound(filename) {
        if (!filename) {
            return;
        }

        const audio = getAudioPlayer(filename);
        if (audio.ended) {
            audio.currentTime = 0;
        } else if (!audio.paused) {
            audio.currentTime = 0;
        }
        audio.play().catch(() => {});
    }

    function pauseSound(filename) {
        if (filename) {
            const audio = object_state.audio_players.get(filename);
            if (audio) {
                audio.pause();
            }
            return;
        }

        for (const audio of object_state.audio_players.values()) {
            audio.pause();
        }
    }

    function stopSound(filename) {
        const stop_player = audio => {
            audio.pause();
            try {
                audio.currentTime = 0;
            } catch (error) {
                console.debug("Could not reset audio", error);
            }
        };

        if (filename) {
            const audio = object_state.audio_players.get(filename);
            if (audio) {
                stop_player(audio);
            }
            return;
        }

        for (const audio of object_state.audio_players.values()) {
            stop_player(audio);
        }
    }

    function clearAudioPlayers() {
        stopSound();
        object_state.audio_players.clear();
    }

    function collectSoundNames(value, sound_names = new Set()) {
        if (Array.isArray(value)) {
            value.forEach(child => collectSoundNames(child, sound_names));
            return sound_names;
        }

        if (!value || typeof value !== "object") {
            if (typeof value === "string") {
                for (const match of value.matchAll(/playSound\(\s*['"]([^'"]+)['"]/g)) {
                    sound_names.add(match[1]);
                }
            }
            return sound_names;
        }

        Object.values(value).forEach(child => collectSoundNames(child, sound_names));
        return sound_names;
    }

    function preloadObjectAudio() {
        for (const filename of collectSoundNames(object_state.data)) {
            const audio = getAudioPlayer(filename);
            audio.load();
        }
    }

    function completed() {
        object_state.completed = true;
        completion_text.textContent = object_state.data.completion_text || "Object complete.";

        if (object_state.data.link) {
            completion_link.hidden = false;
            completion_link.textContent = object_state.data.completion_link_text || "Continue";
            completion_link.href = object_state.data.link;
        } else {
            completion_link.hidden = true;
            completion_link.removeAttribute("href");
        }

        completion_overlay.hidden = false;
    }

    function setInfoboxMaximised(is_maximised) {
        object_state.infobox_maximised = Boolean(is_maximised);
        infobox.classList.toggle("maximised", object_state.infobox_maximised);
    }

    function toggleZoomMode() {
        object_state.zoom_mode = !object_state.zoom_mode;
        stage.classList.toggle("zoom_mode", object_state.zoom_mode);
        updateStatus();
    }

    function getInfoSection(section_id) {
        if (!object_state.info_html) {
            return "<p>No excavation notes were included for this archive entry.</p>";
        }

        if (!object_state.info_document) {
            const parser = new DOMParser();
            object_state.info_document = parser.parseFromString(object_state.info_html, "text/html");
        }

        const parsed_document = object_state.info_document;
        const sections = parsed_document.querySelectorAll(".section");

        if (!sections.length) {
            return object_state.info_html;
        }

        const section = parsed_document.getElementById(section_id);
        return section ? section.innerHTML : parsed_document.getElementById("section-main")?.innerHTML || object_state.info_html;
    }

    function setInfoboxSection(section_id) {
        object_state.infobox_section = section_id;
        renderInfobox();
    }

    function trace(message) {
        console.log(message);
    }

    function executeAction(action) {
        if (!action) {
            return;
        }

        try {
            const action_runner = new Function(
                "setProperty",
                "getProperty",
                "pushProperty",
                "popProperty",
                "playSound",
                "pauseSound",
                "stopSound",
                "completed",
                "setInfoboxMaximised",
                "setInfoboxSection",
                "toggleZoomMode",
                "trace",
                "progress",
                `"use strict"; ${action}; return progress;`
            );

            const next_progress = action_runner(
                setProperty,
                getProperty,
                pushProperty,
                popProperty,
                playSound,
                pauseSound,
                stopSound,
                completed,
                setInfoboxMaximised,
                setInfoboxSection,
                toggleZoomMode,
                trace,
                object_state.progress
            );

            if (typeof next_progress === "number" && Number.isFinite(next_progress)) {
                object_state.progress = next_progress;
            }
        } catch (error) {
            console.error("Black Crown action failed:", action, error);
        }

        updateStatus();
    }

    function setObjectImage(filename) {
        asset_notice.hidden = true;
        object_image.alt = `${object_state.data.title || object_state.object_name} — ${filename}`;
        object_image.dataset.filename = filename;
        object_image.dataset.fallback_stage = "local";
        object_image.src = localAssetUrl("images", filename);
    }

    function renderHotspots(hotspots) {
        hotspot_layer.replaceChildren();

        hotspots.forEach((hotspot, hotspot_index) => {
            if (!Array.isArray(hotspot.polygon)) {
                return;
            }

            const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            const point_pairs = [];

            for (let point_index = 0; point_index < hotspot.polygon.length; point_index += 2) {
                point_pairs.push(`${hotspot.polygon[point_index]},${hotspot.polygon[point_index + 1]}`);
            }

            polygon.setAttribute("points", point_pairs.join(" "));
            polygon.setAttribute("tabindex", "0");
            polygon.setAttribute("aria-label", `hotspot ${hotspot_index + 1}`);
            polygon.addEventListener("click", () => executeAction(hotspot.on_click));
            polygon.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    executeAction(hotspot.on_click);
                }
            });
            hotspot_layer.appendChild(polygon);
        });
    }

    function renderControls(ui_actions) {
        controls_layer.replaceChildren();
        const ui_definitions = object_state.data.ui || [];

        for (const ui_definition of ui_definitions) {
            const action = ui_actions[ui_definition.name];
            if (!action) {
                continue;
            }

            const button = document.createElement("button");
            const alignment = (ui_definition.alignment || "bottom,left").split(",").map(value => value.trim());
            button.type = "button";
            button.className = `object_control ${alignment.join(" ")}`;
            button.textContent = control_symbols[ui_definition.name] || ui_definition.name;
            button.title = ui_definition.name;
            button.setAttribute("aria-label", ui_definition.name);
            button.addEventListener("click", () => executeAction(action));
            controls_layer.appendChild(button);
        }
    }

    function renderInfobox() {
        infobox_content.innerHTML = getInfoSection(object_state.infobox_section);
        infobox.classList.toggle("maximised", object_state.infobox_maximised);
    }

    function updateStatus() {
        const properties_text = Object.entries(object_state.properties)
            .map(([property_name, property_value]) => `${property_name}:${property_value}`)
            .join(" · ");
        const zoom_text = object_state.zoom_mode ? " · zoom:expanded" : "";
        state_status.textContent = `${properties_text} · progress:${object_state.progress}${zoom_text}`;
    }

    function applyBaseResolution() {
        const [base_width, base_height] = object_state.data.base_resolution || [800, 600];
        stage.style.aspectRatio = `${base_width} / ${base_height}`;
        hotspot_layer.setAttribute("viewBox", `0 0 ${base_width} ${base_height}`);
    }

    function renderObject() {
        const resolved_state = resolveState();
        if (!resolved_state) {
            controls_layer.replaceChildren();
            hotspot_layer.replaceChildren();
            asset_notice.hidden = false;
            asset_notice.textContent = `No matching archived state for ${JSON.stringify(object_state.properties)}.`;
            console.error("No matching state", object_state.properties);
            updateStatus();
            return;
        }

        const previous_keys = new Set(object_state.current_state_keys);
        const next_keys = resolved_state.branch.map(entry => entry.key);
        object_state.current_state_keys = next_keys;

        if (resolved_state.image) {
            setObjectImage(resolved_state.image);
        }

        object_state.current_ui_actions = resolved_state.ui_actions;
        renderHotspots(resolved_state.hotspots);
        renderControls(resolved_state.ui_actions);
        updateStatus();

        for (const entry of resolved_state.branch) {
            if (!previous_keys.has(entry.key) && entry.state.on_show) {
                executeAction(entry.state.on_show);
            }
        }
    }

    function closeInfobox() {
        const close_action = object_state.data.ui_actions?.["infobox-close"];
        if (close_action) {
            executeAction(close_action);
        }
        setInfoboxMaximised(false);
    }

    async function loadObject(object_name) {
        const load_token = ++object_state.load_token;
        object_title.textContent = "Loading…";
        object_description.textContent = object_name;
        source_status.textContent = "loading archive";
        asset_notice.hidden = true;
        controls_layer.replaceChildren();
        hotspot_layer.replaceChildren();
        completion_overlay.hidden = true;
        clearAudioPlayers();

        let stored_object;
        try {
            stored_object = await loadArchivePair(object_name);
        } catch (error) {
            if (load_token !== object_state.load_token) {
                return;
            }
            object_title.textContent = "Archive load failed";
            object_description.textContent = error.message;
            source_status.textContent = "unavailable";
            asset_notice.hidden = false;
            asset_notice.textContent = "This object could not be loaded locally or from the GitHub archive.";
            return;
        }

        if (load_token !== object_state.load_token) {
            return;
        }

        object_state.object_name = object_name;
        object_state.data = stored_object.data;
        object_state.info_html = stored_object.info_html || "";
        object_state.info_document = null;
        object_state.properties = {
            ...(stored_object.data.state_defaults || {}),
            ...(stored_object.data.property || {}),
            ...(stored_object.data.property_defaults || {})
        };
        object_state.property_stack = [];
        object_state.progress = 0;
        object_state.current_state_keys = [];
        object_state.infobox_section = "section-main";
        object_state.infobox_maximised = false;
        object_state.current_ui_actions = {};
        object_state.completed = false;
        object_state.zoom_mode = false;
        object_state.source = stored_object.source;

        stage.classList.remove("zoom_mode");
        object_title.textContent = object_state.data.title || object_name;
        object_description.textContent = object_state.data.description || "";
        object_select.value = object_name;
        source_status.textContent = stored_object.source;
        completion_overlay.hidden = true;
        setInfoboxMaximised(false);
        applyBaseResolution();
        preloadObjectAudio();
        renderInfobox();
        renderObject();
        executeAction(object_state.data.on_load);
    }

    object_image.addEventListener("error", () => {
        if (object_image.dataset.fallback_stage === "local") {
            object_image.dataset.fallback_stage = "remote";
            object_image.src = remoteAssetUrl("images", object_image.dataset.filename);
            return;
        }

        asset_notice.hidden = false;
        asset_notice.textContent = `Original image could not be loaded: ${object_image.dataset.filename}`;
    });

    object_select.addEventListener("change", () => loadObject(object_select.value));
    reset_button.addEventListener("click", () => loadObject(object_state.object_name));
    debug_hotspots.addEventListener("change", () => stage.classList.toggle("debug", debug_hotspots.checked));
    infobox_close.addEventListener("click", closeInfobox);
    completion_close.addEventListener("click", () => {
        completion_overlay.hidden = true;
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && object_state.infobox_maximised) {
            closeInfobox();
            return;
        }

        if (event.key === "Escape" && object_state.zoom_mode) {
            toggleZoomMode();
            return;
        }

        const key_to_action = {
            ArrowLeft: "left",
            ArrowRight: "right",
            ArrowUp: "up",
            ArrowDown: "down"
        };
        const action_name = key_to_action[event.key];
        const action = action_name ? object_state.current_ui_actions[action_name] : null;
        if (action) {
            event.preventDefault();
            executeAction(action);
        }
    });

    populateObjectSelect();
    loadObject(manifest.some(item => item.dir === "diplomat") ? "diplomat" : manifest[0]?.dir);
})();
