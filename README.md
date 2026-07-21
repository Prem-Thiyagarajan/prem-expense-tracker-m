# Pocket — Expense Tracker (Mobile)

Native iOS + Android client for the **Prem Expense Tracker**, built with Expo. It is a new mobile
frontend for the existing FastAPI + PostgreSQL backend (REST API at `/api/v1`) — no backend rewrite.

Design language: **"Pocket"** — cream background, 2px ink borders, hard offset shadows, candy-colored
cards, Archivo Black numerals, in light and dark themes.

## Tech stack

- **Expo (managed) + React Native + TypeScript**
- **expo-router** — file-based navigation
- **@tanstack/react-query** — server state
- **expo-secure-store** — JWT storage (Keychain/Keystore)
- **react-native-svg** + **react-native-reanimated** — custom Pocket-styled charts & animations
- **@expo-google-fonts** — Bricolage Grotesque, Archivo, Archivo Black, JetBrains Mono

## Getting started

```bash
npm install
cp .env.example .env   # set EXPO_PUBLIC_API_BASE_URL to your API
npm start              # then scan the QR with Expo Go, or press a/i for emulator
```

The API base URL is configured via `EXPO_PUBLIC_API_BASE_URL` in `.env` — point it at a local
FastAPI backend or the production API. On a physical device, use your machine's LAN IP, not `localhost`.

## Project structure

```
src/
  app/            expo-router routes ((tabs) group + root layout)
  components/     UI primitives (ui/), tab bar, icons, sheets
  theme/          Pocket design tokens + ThemeProvider (light/dark)
  api/            axios client, react-query client, secure token store
  lib/            env/config
```

## Scripts

- `npm start` — Expo dev server
- `npm run android` / `npm run ios` / `npm run web`
- `npm run lint` — Expo lint
- `npx tsc --noEmit` — type-check
