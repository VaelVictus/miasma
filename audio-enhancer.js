(function (window, document) {
    'use strict';

    // all variables should be snake_case; function names camelCase per project rules

    const track_state_map = new WeakMap();

    function formatTime(seconds) {
        if (!Number.isFinite(seconds)) {
            return '0:00';
        }
        const minutes = Math.floor(seconds / 60);
        const remaining_seconds = Math.floor(seconds % 60);
        return `${minutes}:${remaining_seconds.toString().padStart(2, '0')}`;
    }

    function getFracAt(progress_el, client_x) {
        const rect = progress_el.getBoundingClientRect();
        if (!rect.width) {
            return 0;
        }
        return Math.max(0, Math.min(1, (client_x - rect.left) / rect.width));
    }

    function bindEnhancements(track_el) {
        if (track_state_map.has(track_el)) {
            return;
        }

        const audio_el = track_el.querySelector('audio');
        const progress_el = track_el.querySelector('.audio-progress');
        const progress_bar_el = track_el.querySelector('.audio-progress-bar');
        const time_label_el = track_el.querySelector('.audio-time');

        if (!audio_el || !progress_el || !progress_bar_el || !time_label_el) {
            return;
        }

        // selection handles removed; keep simple seeking/scrubbing only

        const state = {
            audio_el,
            progress_el,
            progress_bar_el,
            time_label_el,
            is_scrubbing: false,
            was_playing: false
        };
        track_state_map.set(track_el, state);

        // click to seek
        progress_el.addEventListener('click', (event) => {
            if (state.is_scrubbing) {
                return;
            }
            const frac = getFracAt(progress_el, event.clientX);
            const duration = audio_el.duration;
            if (Number.isFinite(duration)) {
                audio_el.currentTime = frac * duration;
            }
        });

        // scrubbing: pointer drag seeks smoothly; preserves play/pause state
        progress_el.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            const duration = audio_el.duration;
            if (!Number.isFinite(duration)) {
                return;
            }
            state.is_scrubbing = true;
            state.was_playing = !audio_el.paused;
            audio_el.pause();
            const frac = getFracAt(progress_el, e.clientX);
            audio_el.currentTime = frac * duration;
            document.body.style.userSelect = 'none';
        });
        window.addEventListener('pointermove', (e) => {
            if (!state.is_scrubbing) {
                return;
            }
            const duration = audio_el.duration;
            if (!Number.isFinite(duration)) {
                return;
            }
            const frac = getFracAt(progress_el, e.clientX);
            audio_el.currentTime = frac * duration;
        });
        window.addEventListener('pointerup', () => {
            if (!state.is_scrubbing) {
                return;
            }
            state.is_scrubbing = false;
            document.body.style.userSelect = '';
            if (state.was_playing) {
                audio_el.play().catch(() => {});
            }
            state.was_playing = false;
        });

        // update the visible time label during playback
        audio_el.addEventListener('timeupdate', () => {
            time_label_el.textContent = formatTime(audio_el.currentTime);
        });
    }

    function enhanceAllExisting() {
        document.querySelectorAll('#audio_container .audio-track').forEach((el) => bindEnhancements(el));
    }

    function observeAudioContainer() {
        const container = document.getElementById('audio_container');
        if (!container) {
            return;
        }
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                mutation.addedNodes && mutation.addedNodes.forEach((node) => {
                    if (!(node instanceof HTMLElement)) {
                        return;
                    }
                    if (node.classList && node.classList.contains('audio-track')) {
                        bindEnhancements(node);
                    }
                    node.querySelectorAll && node.querySelectorAll('.audio-track').forEach((el) => bindEnhancements(el));
                });
            }
        });
        observer.observe(container, { childList: true, subtree: true });
    }

    function onResizeUpdate() {
        window.addEventListener('resize', () => {
            // nothing to resize now that handles/segment are removed
        });
    }

    window.addEventListener('DOMContentLoaded', () => {
        enhanceAllExisting();
        observeAudioContainer();
        onResizeUpdate();
    });

})(window, document);


