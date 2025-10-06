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

## build notes

if you need to rebuild css/js, install dependencies and run your build pipeline:

```bash
npm install
# add/adjust your build command as needed
```


