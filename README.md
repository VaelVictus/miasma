# Miasma

an interactive php + js art project. site data lives in `object_data/` and assets in `compiled/`.

## quick start

- ensure php is available (laragon/xampp/valet/etc.).
- from the project root, start a local server:

```bash
php -S localhost:8000
```

- visit `http://localhost:8000/index.php`.

## project structure

- `index.php`: main entry point
- `main.js` and `slideShow.js`: client scripts
- `index.scss` and `compiled/`: styles and built css/js
- `object_data/`: json, images, and optional audio per object

## interactive specimens

Each specimen opens in Interactive, with the existing viewer available under Gallery.
Show hotspots reveals clickable regions; arrow keys and the visible controls change
views. Reset object restores that specimen's defaults. Progress is retained when
switching tabs or specimens during the current page visit. Leaving Interactive pauses
its audio. Completion dialogs include the original narrative, unlock code, and archived
continuation link where supplied by the object definition.

`interactive-engine.js` runs the trusted, repository-owned `object_data/*/data.json`
state graphs and maps archived asset names to this repo's optimized files.
`interactive.js` handles the tabs, SVG hotspots, audio, and dialogs;
`interactive.css` styles them directly. Nothing is loaded from the experimental
`blackcrown_object_reconstruction` folder or a remote asset archive.

Run all regression tests and the per-specimen interaction audit with `npm test`.
See [the audit report](docs/interactive-audit.md) for findings, coverage, and limits.

## build notes

if you need to rebuild css/js, install dependencies and run your build pipeline:

```bash
npm install
# add/adjust your build command as needed
```


