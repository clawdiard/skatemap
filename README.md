# ParkCheck — NYC Skatepark Conditions

Real-time park status, weather & crowd data for NYC skateparks.

## Stack

- **Vite** + **React 18** + **TypeScript**
- **Tailwind CSS** (dark-mode-first)
- **GitHub Pages** (static SPA)

## Development

```bash
npm install
npm run dev
```

## Build & Deploy

Pushes to `main` auto-deploy via GitHub Actions to GitHub Pages.

```bash
npm run build
```

## Project Structure

```
skatemap/
├── .github/workflows/deploy.yml
├── data/           # Park, weather, user data (JSON)
├── public/
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── utils/
│   ├── types/
│   ├── App.tsx
│   └── main.tsx
├── vite.config.ts
├── tailwind.config.js
└── package.json
```
