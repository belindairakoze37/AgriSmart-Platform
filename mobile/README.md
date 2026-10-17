# AgriSmart Mobile

Expo Router app for AgriSmart, built with React Native, NativeWind, Zustand,
TanStack Query, Axios, and Expo SecureStore.

## Run locally

From PowerShell:

```powershell
cd mobile
Copy-Item .env.example .env
npm.cmd ci
npm.cmd run start -- --clear
```

The default API URL in `.env.example` is for the Android emulator. Start the
Django backend on port 8000 before opening the app.

- **Android emulator:** use `http://10.0.2.2:8000/api/v1`.
- **Physical device:** set `EXPO_PUBLIC_API_URL` to the computer's LAN IPv4
  address, for example `http://192.168.1.20:8000/api/v1`. Run Django with
  `python manage.py runserver 0.0.0.0:8000` and allow the port through the
  computer's firewall.
- **iOS simulator:** use `http://127.0.0.1:8000/api/v1`.
- **Web:** web bundling is supported for build checks, but authenticated web
  runtime is not currently supported because Expo SecureStore is native-only.

Restart Expo after changing `.env`. Expo public environment variables are
bundled into the app; never put secrets in them. `.env` is ignored by Git.

## Implemented flows

- Phone/password registration, login, secure token storage, profile restoration,
  access-token refresh, logout, and protected tab navigation.
- Dashboard and market browsing with commodity prices and price history.
- Advisory sessions, message history, and sending messages to the backend.
- Marketplace browsing/search, seller's own listings, listing creation and
  details, and submitting buyer offers.

The mobile client uses the Django API under `/api/v1`, including auth,
commodities/prices/districts, advisory sessions/messages/chat, and marketplace
listings/offers. The backend remains the source of truth for fields and
behavior.

No payment flow is included: submitting an offer does not transfer money.
Disease-detection screens and SMS/OTP verification are also not presented as
working mobile features.

## Checks

Run from `mobile/`:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
npm.cmd run lint
.\node_modules\.bin\expo.cmd install --check
.\node_modules\.bin\expo.cmd export --platform web
.\node_modules\.bin\expo.cmd export --platform android
```

The Expo Router entrypoint is configured in `package.json`; NativeWind is wired
through `global.css`, Babel, and Metro configuration.
