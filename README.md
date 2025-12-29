# Flaška TV

## Spuštění
- Tizen Web App (HTML/CSS/JS).
- Soubor `config.js` obsahuje API klíč a endpoint. V repu je jen `config.example.js`.

## Struktura
- `index.html`
- `styles.css`
- `app.js`
- `data/names.json`
- `data/tasks.json`
- `config.xml`

## Build
- `tizen build-web -- <APP_DIR>`
- `tizen package -t wgt -s PRO75 -o <OUT_DIR> -- <APP_DIR>\.buildResult`
