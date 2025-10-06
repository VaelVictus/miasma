(function (window, document) {
    'use strict';

    const state = {
        slider: null,
        dom: null,
        notesController: null,
        currentFolder: '',
        variety: {
            groups: new Map(),
            folderToGroup: new Map()
        }
    };

    function queryRequired(selector, description = selector) {
        const element = document.querySelector(selector);
        if (!element) {
            throw new Error(`Miasma viewer is missing the required element: ${description} (${selector})`);
        }
        return element;
    }

    function getByIdRequired(id, description = `#${id}`) {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`Miasma viewer is missing the required element: ${description}`);
        }
        return element;
    }

    function safeAddListener(element, event, handler) {
        if (!element) {
            console.warn(`Miasma viewer skipped binding for ${event} – element missing.`);
            return;
        }
        element.addEventListener(event, handler);
    }

    async function loadNotes(miasma) {
        const { gameNotes } = state.dom;
        if (!gameNotes) {
            return;
        }

        if (state.notesController) {
            state.notesController.abort();
        }

        const controller = new AbortController();
        state.notesController = controller;

        try {
            const response = await fetch(`trottering_notes.php?miasma=${encodeURIComponent(miasma)}`, {
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }

            const notesMarkup = await response.text();

            if (!controller.signal.aborted) {
                gameNotes.innerHTML = notesMarkup;
            }
        } catch (error) {
            if (controller.signal.aborted) {
                return;
            }
            console.error(`Failed to load notes for "${miasma}":`, error);
            gameNotes.innerHTML = '<p class="notes-error">Notes failed to load. Please try again.</p>';
        } finally {
            if (state.notesController === controller) {
                state.notesController = null;
            }
        }
    }

    function updateButtons(slider) {
        if (!state.dom) {
            return;
        }

        const { controls } = state.dom;
        const mapping = [
            [controls.prevButton, slider.prev_item_index],
            [controls.nextButton, slider.next_item_index],
            [controls.prevSlide, slider.prev_item_index],
            [controls.nextSlide, slider.next_item_index]
        ];

        mapping.forEach(([element, slideIndex]) => {
            if (!element) {
                return;
            }
            const targetSlide = slider.slider_items[slideIndex];
            if (targetSlide) {
                element.innerHTML = targetSlide.innerHTML;
            }
        });

        $('.slider-item:visible .zoom').magnify({ speed: 0, magnify: 1.5 });
    }

    class Slider {
        constructor(sliderElement, options = {}) {
            this.slider = sliderElement;
            this.slider_items = sliderElement.getElementsByClassName('slider-item');
            this.visible_indices = Array.from(this.slider_items).map((_, index) => index);
            this.current_index = 0;
            this.is_sliding = false;
            this.options = Object.assign({
                containers: {},
                controls: {},
                onSlideComplete: null,
                onFolderChange: null
            }, options);

            this.setIndices();
            this.showSlide(this.current_index);
        }

        setIndices() {
            const visibleCount = this.visible_indices.length;
            const currentVisibleIndex = this.visible_indices.indexOf(this.current_index);
            this.prev_item_index = this.visible_indices[(currentVisibleIndex - 1 + visibleCount) % visibleCount];
            this.next_item_index = this.visible_indices[(currentVisibleIndex + 1) % visibleCount];
            this.preloadImages();
        }

        preloadImages() {
            const preload = (index) => {
                const img = this.slider_items[index]?.querySelector('img');
                if (img && img.hasAttribute('loading')) {
                    img.removeAttribute('loading');
                }
            };

            preload(this.prev_item_index);
            preload(this.next_item_index);
        }

        slide(direction) {
            if (this.is_sliding) {
                return;
            }

            const nextIndex = direction === 'NEXT' ? this.next_item_index : this.prev_item_index;
            const actionClasses = direction === 'NEXT' ? ['next-item', 'slide-next'] : ['prev-item', 'slide-prev'];
            const incomingSlide = this.slider_items[nextIndex];
            const activeSlide = this.slider_items[this.current_index];

            if (!incomingSlide || !activeSlide) {
                return;
            }

            this.is_sliding = true;

            const finalize = () => {
                incomingSlide.classList.remove(actionClasses[0]);
                activeSlide.classList.remove(actionClasses[1], 'active');
                this.current_index = nextIndex;
                this.showSlide(this.current_index);
                this.is_sliding = false;
                this.setIndices();
            };

            incomingSlide.classList.add(actionClasses[0], 'active');
            activeSlide.classList.add(actionClasses[1]);

            window.setTimeout(finalize, 16);
        }

        next() {
            if (this.visible_indices.indexOf(this.next_item_index) !== -1) {
                this.slide('NEXT');
            }
        }

        prev() {
            if (this.visible_indices.indexOf(this.prev_item_index) !== -1) {
                this.slide('PREV');
            }
        }

        searchFolder(folderName) {
            const { sliderContainer, mobileView, chooseMiasma, notes } = this.options.containers;

            if (!folderName) {
                if (sliderContainer) sliderContainer.style.display = 'none';
                if (mobileView) mobileView.style.display = 'none';
                if (notes) notes.style.display = 'none';
                if (chooseMiasma) chooseMiasma.style.display = 'block';
                this.visible_indices = Array.from(this.slider_items).map((_, index) => index);
                this.current_index = 0;
                this.showSlide(this.current_index);
                this.setIndices();
                this.options.onFolderChange?.(folderName, this);
                return;
            }

            if (sliderContainer) sliderContainer.style.display = 'flex';
            if (mobileView) mobileView.style.display = 'flex';
            if (notes) notes.style.display = 'block';
            if (chooseMiasma) chooseMiasma.style.display = 'none';

            this.visible_indices = [];

            Array.from(this.slider_items).forEach((slide, index) => {
                if (slide.getAttribute('data-folder') === folderName || folderName === 'all') {
                    this.visible_indices.push(index);
                    slide.style.display = '';
                } else {
                    slide.style.display = 'none';
                }
            });

            if (!this.visible_indices.length) {
                console.error(`No slides found for the folder "${folderName}".`);
                return;
            }

            this.current_index = this.visible_indices[0];
            this.setIndices();
            this.showSlide(this.current_index);
            this.updateNavigationButtons(folderName);
            this.options.onFolderChange?.(folderName, this);
        }

        updateNavigationButtons(folderName) {
            const singleSlideFolders = ['hislatitude', 'incineration', 'frontispiece', 'vaseandcup'];
            const controls = this.options.controls || {};
            const isSingleSlide = singleSlideFolders.includes(folderName);

            const toggleButton = (button, disabled) => {
                if (!button) {
                    return;
                }
                button.classList.toggle('disabled-button', disabled);
                button.style.display = disabled ? 'none' : '';
            };

            toggleButton(controls.prevButton, isSingleSlide);
            toggleButton(controls.nextButton, isSingleSlide);
            toggleButton(controls.prevSlide, isSingleSlide);
            toggleButton(controls.nextSlide, isSingleSlide);
        }

        showSlide(index) {
            Array.from(this.slider_items).forEach(slide => {
                slide.classList.remove('active');
                slide.style.display = 'none';
            });

            const targetSlide = this.slider_items[index];
            if (!targetSlide) {
                console.error('Slide with specified index does not exist:', index);
                return;
            }

            targetSlide.classList.add('active');
            targetSlide.style.display = 'block';
            this.current_index = index;

            this.options.onSlideComplete?.(this);
        }
    }

    function cacheDom() {
        const slider = queryRequired('.slider', 'main slider');
        return {
            slider,
            sliderContainer: getByIdRequired('slider_container'),
            mobileView: getByIdRequired('mobile_view'),
            chooseMiasma: getByIdRequired('choose_miasma'),
            notes: getByIdRequired('notes'),
            gameNotes: getByIdRequired('game_notes'),
            folderSelect: getByIdRequired('folderSelect'),
            varietySwitcher: getByIdRequired('variety_switcher'),
            switchVariety: document.getElementById('switch_variety'),
            controls: {
                prevButton: document.getElementById('prev_button'),
                nextButton: document.getElementById('next_button'),
                prevSlide: document.getElementById('prevSlide'),
                nextSlide: document.getElementById('nextSlide')
            },
            tabs: {
                game: document.getElementById('game_notes_tab'),
                player: document.getElementById('player_notes_tab')
            }
        };
    }

    function buildVarietyGroups() {
        const { slider } = state.dom;
        const sliderItems = slider.querySelectorAll('.slider-item[data-variety-group]');
        const groups = new Map();
        const folderToGroup = new Map();

        sliderItems.forEach((item) => {
            const folder = item.getAttribute('data-folder');
            const groupKey = item.getAttribute('data-variety-group');
            const label = item.getAttribute('data-display-name') || folder;
            const order = Number(item.getAttribute('data-variety-order')) || 0;

            if (!groupKey || !folder) {
                return;
            }

            if (!groups.has(groupKey)) {
                groups.set(groupKey, { entries: [], currentIndex: 0 });
            }

            const group = groups.get(groupKey);
            group.entries.push({ folder, label, order });
            folderToGroup.set(folder, groupKey);
        });

        groups.forEach((group) => {
            group.entries.sort((a, b) => a.order - b.order);
        });

        state.variety.groups = groups;
        state.variety.folderToGroup = folderToGroup;
    }

    function updateVarietyState(folder) {
        const groupKey = state.variety.folderToGroup.get(folder);
        if (!groupKey) {
            return;
        }

        const group = state.variety.groups.get(groupKey);
        if (!group) {
            return;
        }

        const index = group.entries.findIndex(entry => entry.folder === folder);
        group.currentIndex = index === -1 ? 0 : index;
    }

    function updateSwitchButtonText(folder) {
        const button = state.dom.switchVariety;
        if (!button) {
            return;
        }

        const groupKey = state.variety.folderToGroup.get(folder);
        if (!groupKey) {
            button.textContent = 'Switch Variety';
            return;
        }

        const group = state.variety.groups.get(groupKey);
        if (!group || group.entries.length < 2) {
            button.textContent = 'Switch Variety';
            return;
        }

        const nextIndex = (group.currentIndex + 1) % group.entries.length;
        const nextEntry = group.entries[nextIndex];
        button.textContent = `View ${nextEntry.label}`;
    }

    function toggleVarietySwitcher(folder) {
        const switcher = state.dom.varietySwitcher;
        if (!switcher) {
            return;
        }

        const groupKey = state.variety.folderToGroup.get(folder);
        if (groupKey) {
            const group = state.variety.groups.get(groupKey);
            if (group && group.entries.length > 1) {
                switcher.style.display = 'block';
                updateSwitchButtonText(folder);
                return;
            }
        }

        switcher.style.display = 'none';
    }

    function syncFolderSelect(folder) {
        const select = state.dom.folderSelect;
        if (!select) {
            return;
        }

        const optionExists = Array.from(select.options).some(option => option.value === folder);
        if (optionExists) {
            select.value = folder;
            delete select.dataset.activeVariety;
            return;
        }

        const groupKey = state.variety.folderToGroup.get(folder);
        if (!groupKey) {
            select.value = '';
            delete select.dataset.activeVariety;
            return;
        }

        const group = state.variety.groups.get(groupKey);
        if (!group || !group.entries.length) {
            return;
        }

        select.value = group.entries[0].folder;
        select.dataset.activeVariety = folder;
    }

    function setCurrentFolder(folder, { updateHistory = true } = {}) {
        if (!state.slider) {
            return;
        }

        const normalizedFolder = folder || '';
        state.currentFolder = normalizedFolder;
        state.slider.searchFolder(normalizedFolder);
        syncFolderSelect(normalizedFolder);
        updateVarietyState(normalizedFolder);
        toggleVarietySwitcher(normalizedFolder);
        if (normalizedFolder) {
            loadNotes(normalizedFolder);
        }

        document.body.setAttribute('data-current-miasma', normalizedFolder);

        if (updateHistory) {
            const path = normalizedFolder ? `/miasma/${normalizedFolder}` : '/miasma/';
            history.pushState({ folder: normalizedFolder }, '', path);
        }
    }

    function changeFolder(folder, options) {
        setCurrentFolder(folder, options);
    }

    function switchVariety() {
        const currentFolder = state.currentFolder;
        const groupKey = state.variety.folderToGroup.get(currentFolder);
        if (!groupKey) {
            return;
        }

        const group = state.variety.groups.get(groupKey);
        if (!group || group.entries.length < 2) {
            return;
        }

        const nextIndex = (group.currentIndex + 1) % group.entries.length;
        const nextFolder = group.entries[nextIndex].folder;
        setCurrentFolder(nextFolder);
    }

    function openTab(evt, tabName) {
        const { tabs } = state.dom;
        if (!tabs) {
            return;
        }

        if (tabName === 'game_notes') {
            $('#game_notes').show();
            tabs.game?.classList.add('active');
            $('#player_notes').hide();
            tabs.player?.classList.remove('active');
        } else if (tabName === 'player_notes') {
            $('#game_notes').hide();
            tabs.game?.classList.remove('active');
            $('#player_notes').show();
            tabs.player?.classList.add('active');
        }
    }

    function bindEventListeners() {
        const { controls, switchVariety: switchVarietyButton } = state.dom;

        safeAddListener(controls.prevSlide, 'click', () => state.slider.prev());
        safeAddListener(controls.nextSlide, 'click', () => state.slider.next());
        safeAddListener(controls.prevButton, 'click', () => state.slider.prev());
        safeAddListener(controls.nextButton, 'click', () => state.slider.next());
        safeAddListener(switchVarietyButton, 'click', () => switchVariety());

        window.addEventListener('keydown', (event) => {
            if (!state.slider) {
                return;
            }
            if (event.code === 'ArrowRight') {
                state.slider.next();
                event.preventDefault();
            } else if (event.code === 'ArrowLeft') {
                state.slider.prev();
                event.preventDefault();
            }
        });

        document.querySelectorAll('[data-searchFolder]').forEach((element) => {
            safeAddListener(element, 'click', function () {
                const folderName = this.getAttribute('data-searchFolder');
                setCurrentFolder(folderName);
            });
        });
    }

    function handlePopState(event) {
        const folderFromUrl = window.location.pathname.replace(/\/$/, '').split('/miasma/')[1] || '';
        setCurrentFolder(folderFromUrl, { updateHistory: false });
    }

    function initialise() {
        state.dom = cacheDom();
        buildVarietyGroups();

        state.slider = new Slider(state.dom.slider, {
            containers: {
                sliderContainer: state.dom.sliderContainer,
                mobileView: state.dom.mobileView,
                chooseMiasma: state.dom.chooseMiasma,
                notes: state.dom.notes
            },
            controls: state.dom.controls,
            onSlideComplete: updateButtons,
            onFolderChange: (_, sliderInstance) => updateButtons(sliderInstance)
        });

        bindEventListeners();

        const folderFromUrl = window.location.pathname.replace(/\/$/, '').split('/miasma/')[1] || '';

        openTab(null, 'game_notes');

        setCurrentFolder(folderFromUrl, { updateHistory: false });

        window.addEventListener('popstate', handlePopState);
    }

    document.addEventListener('DOMContentLoaded', initialise);

    window.changeFolder = (folder, options) => changeFolder(folder, options);
    window.openTab = (event, tabName) => openTab(event, tabName);
    window.switchVariety = () => switchVariety();

})(window, document);
