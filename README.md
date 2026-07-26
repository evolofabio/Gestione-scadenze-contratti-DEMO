# ProrogaPro — Demo pubblica

Demo interattiva della piattaforma per la gestione delle scadenze contrattuali. Nessun login, dati fittizi precaricati, ideale per prospect e sito vetrina.

**[Demo live](https://evolofabio.github.io/Gestione-scadenze-contratti-DEMO/contract_manager_dashboard.html)**

Prodotto SaaS (trial 14 giorni): [gestione-scadenze-contratti](https://evolofabio.github.io/gestione-scadenze-contratti/contract_manager_dashboard.html)

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

## Cosa include la demo

- Dashboard, calendario, cantieri, analytics con **dati di esempio**
- Export Excel / PDF / CSV
- Verifica proroghe e causale (normativa italiana)
- Dark mode, notifiche, anteprima email
- Banner **DEMO** + CTA verso trial SaaS
- **Nessun salvataggio permanente** — reimposta con il pulsante ⟳ in alto a destra

## Integrazione sul tuo sito

Link diretto:

```html
<a href="https://evolofabio.github.io/Gestione-scadenze-contratti-DEMO/contract_manager_dashboard.html" target="_blank" rel="noopener">
  Prova la demo
</a>
```

Embed in iframe (consigliato altezza ≥ 800px):

```html
<iframe
  src="https://evolofabio.github.io/Gestione-scadenze-contratti-DEMO/contract_manager_dashboard.html"
  title="ProrogaPro — Demo scadenze contratti"
  width="100%"
  height="900"
  style="border:0;border-radius:12px;"
  loading="lazy"
></iframe>
```

Personalizza URL trial e email in `scripts/demo-config.js`.

## Avvio locale

```bash
python3 -m http.server 8766
# Apri http://localhost:8766/contract_manager_dashboard.html
```

## Test

```bash
npm ci
npm test
```

## Deploy

Push su `main` → GitHub Pages (`.github/workflows/deploy.yml`).

## Struttura

```
├── contract_manager_dashboard.html
├── scripts/
│   ├── demo-config.js      # URL trial, email contatto
│   ├── app-core.js
│   ├── app-ui.js
│   ├── app-data.js
│   └── ...
├── styles/dashboard.css
└── index.html              # redirect alla dashboard
```

## Licenza

[MIT](LICENSE)
