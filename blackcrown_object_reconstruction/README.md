# Black Crown object reconstruction

This package is a modern browser runtime for the archived pseudo-3D objects from the Black Crown Project. The viewer now exposes **all 40 object datasets** found under `assets/objects/object_data`, including the alternate/prototype variants preserved in the repository.

The runtime interprets the original state trees and hotspot action strings rather than replacing them with hand-authored approximations.

## What now works

- object-specific base resolutions, including portrait document objects
- recursive/nested state trees
- both archived default formats: `property_defaults` and `state_defaults`
- invisible polygon hotspots
- state-specific and inherited UI controls
- property push/pop navigation
- property reads used by **Your Great Work**
- mutable puzzle `progress`
- infobox sections and expanded legends
- zoom-mode toggling used by document-style objects
- object-local sound effects
- persistent audio with play / pause / stop for the Breath players
- completion events and archived continuation-link metadata
- original image/audio fallback from GitHub when local media has not yet been downloaded

The browser focus outline that appeared after clicking hotspots/controls has also been suppressed so interaction no longer leaves a white selection box over the object.

## Run it

The most reliable way to run the viewer is:

```bash
python serve.py
```

Then open:

```text
http://127.0.0.1:8765/
```

`serve.py` normally opens the page automatically.

The included Diplomat and Wayle Map definitions remain bundled as emergency fallbacks. The other object definitions are loaded from a local archive copy when present, then from the original GitHub archive when online.

## Make the entire collection offline

Run this once while online:

```bash
python download_assets.py
```

The downloader now processes **all 40 object directories**. For each object it:

1. downloads the original `data.json` and `info.html` into `archive/<object>/`;
2. scans the archived state/action data;
3. downloads every object image referenced by the state graph;
4. downloads every audio file referenced by `playSound(...)`.

After it completes, the reconstructed collection can run from the local server without GitHub.

To fetch only one object while testing:

```bash
python download_assets.py --object yourgreatwork
```

You can pass `--object` more than once.

## Controls

- Use visible arrows to rotate, page, or change viewpoint.
- Click the object where the archived hotspot geometry permits interaction.
- **Show hotspots** reveals the original polygons for debugging.
- Arrow keys mirror visible directional controls.
- **Reset object** restores the archived defaults and stops object audio.
- On document-style objects, the archived zoom control expands/collapses the object viewer.
- `Esc` closes an expanded infobox or exits expanded zoom mode.

## Audio

Nine archived datasets contain audio actions. The rebuilt runtime supports all required audio primitives (`playSound`, `pauseSound`, and `stopSound`) and preserves playback position when paused. See `OBJECT_AUDIT.md` for the full file list.

## Links

See `LINK_AUDIT.md` for the hyperlink audit. The short version: no hotspot action directly navigates the browser, but many datasets contain top-level continuation-link metadata. The reconstruction exposes a link only after an archived `completed()` event and never auto-opens it.

## Files

- `index.html` — viewer shell
- `style.css` — presentation and interaction layers
- `app.js` — generic archived-object runtime
- `manifest.js` — all 40 archive entries
- `objects.js` — bundled Diplomat/Wayle Map emergency fallback data
- `download_assets.py` — complete local-archive/media downloader
- `serve.py` — small local HTTP server
- `OBJECT_AUDIT.md` — datasets, runtime requirements, and audio audit
- `LINK_AUDIT.md` — external-link audit
- `archive/` — downloaded original JSON/info definitions
- `assets/` — downloaded original images/audio

See `LICENSE.md` for the original archive author's release terms.
