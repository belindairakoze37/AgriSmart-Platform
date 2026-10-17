# AgriSmart Platform

AgriSmart consists of a shared Django REST API and two clients: the existing
React Native/Expo app for Android and a separate responsive React/TypeScript
web app for desktop and mobile browsers. User accounts, market reports,
marketplace listings/offers, and advisory conversations live in the backend
and are shared between clients.

## Project structure

- `backend/` — Django REST Framework API and business data.
- `mobile/` — React Native, Expo Router, NativeWind, and SecureStore client.
- `web/` — React, TypeScript, Vite, React Router and HttpOnly-cookie browser
  authentication.

## Start all three applications

Open separate terminals in the repository root.

### 1. Django backend

```powershell
cd backend
.\venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000
```

Confirm `ALLOWED_HOSTS` includes the host used by your client. The development
settings allow CORS origins for Vite (`http://localhost:5173`) and Expo
(`http://localhost:8081`). Set `WEB_APP_ORIGINS` to a comma-separated list of
the deployed web origins in the backend environment; these origins are also
added to `CSRF_TRUSTED_ORIGINS`. For production use HTTPS, secure deployment
settings, a real `SECRET_KEY`, and explicit hosts and browser origins.

### 2. Android app

```powershell
cd mobile
Copy-Item .env.example .env
npm.cmd ci
npm.cmd run start
```

The committed emulator default is `http://10.0.2.2:8000/api/v1`. On a physical
Android device replace it with the PC's LAN address, such as
`http://192.168.1.20:8000/api/v1`, and allow Django through the firewall. The
backend must bind to `0.0.0.0`. Expo environment variables are bundled into the
client; never store secrets there. `mobile/.env` is git-ignored.

### 3. Desktop or mobile browser

```powershell
cd web
Copy-Item .env.example .env
npm.cmd ci
npm.cmd run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`).
Set `VITE_API_URL` in `web/.env` to the backend API base URL reachable by the
browser. For local desktop development that is
`http://localhost:8000/api/v1`. Mobile browsers can use the same responsive
web app served from the development machine's LAN address; use the machine's
LAN IP for `VITE_API_URL` and list the browser's origin in `WEB_APP_ORIGINS`.
Restart Vite after changing `.env`. `VITE_` values are public and must never
contain credentials or secrets. `web/.env` is git-ignored.

The browser uses a short-lived access token held in application memory and an
HttpOnly, SameSite=Lax refresh cookie restricted to `/api/v1/auth/web/`. Login,
registration, refresh and logout require CSRF protection. For production, serve
the web app over HTTPS and set `WEB_APP_ORIGINS` to the exact web origin(s).
Keep the web app and API same-site if possible: cross-site deployments need a
deliberate cookie/SameSite and CSRF deployment design.

## Feature/API mapping

- Account login, registration and profile: `/api/v1/auth/`; browser sessions use
  the additional `/api/v1/auth/web/` cookie endpoints and the same users/JWT
  and profile resource.
- Commodity, district, current price and history: `/api/v1/markets/`.
- Administrator analytics, commodity management, and market-price CSV import:
  `/api/v1/markets/admin/`.
- Advisory session/message history and chat: `/api/v1/advisory/`.
- Marketplace list/detail/create, own listings and offers:
  `/api/v1/marketplace/`.
- District-scoped extension-officer farmer lists, outbreak reports, and bulk
  in-app advisories: `/api/v1/farmers/officers/`.

Both clients access the same API-managed business records. Browser and mobile
clients have distinct refresh-token storage, but sign in to the same account.
Mobile farmers can manage farms and crops, set price alerts, receive
in-app marketplace/price/weather notifications, and set notification
preferences. The browser includes role-gated administrator and extension
officer portals. The price-import CSV requires `market`, `commodity`,
`price_per_unit`, and `recorded_date`; `unit`, `price_type`, and `source` are
optional. All rows are validated before changes are applied.
Administrator and extension-officer roles must be provisioned by an
administrator; public registration cannot assign either role.

For development or demonstrations, add sample marketplace listings after
migrations with:

```powershell
cd backend
.\venv\Scripts\python.exe manage.py seed_marketplace
```

The command is safe to rerun. It creates six listings labeled as samples in the
browser and mobile marketplace; demo seller accounts are inactive, and sample
listings do not accept offers. Do not run this command in production.

The live service still has external prerequisites and incomplete integrations:
weather requires a valid OpenWeatherMap key and district coordinates; SMS/OTP
delivery and feature-phone offer replies are not connected; MTN/Airtel payments,
escrow, and actual payment-confirmed transaction handling are not connected;
push notification delivery is not configured; the UI language preference is
stored but does not yet translate all screens; and disease diagnosis remains
unavailable until a compatible trained model is installed. Completed
transaction records and totals in the admin portal are platform database
records, not proof of payment or platform revenue.

## Production deployment

Build the browser app from `web/`:

```powershell
npm.cmd run build
```

Publish `web/dist/` behind a static file server with SPA fallback rewriting:
route unknown application paths back to `index.html`. Set the production
`VITE_API_URL` at build time to the HTTPS API origin and configure the backend
to allow the exact web origin and credentials. Browser auth requires cookies;
verify the deployed cookie's Secure, HttpOnly, SameSite, path, HTTPS, CORS, and
CSRF settings before release.

The browser-specific auth endpoints use Django's SimpleJWT token blacklist
app. Apply backend migrations before enabling the web app:

```powershell
cd backend
.\venv\Scripts\python.exe manage.py migrate
```

See [web/README.md](./web/README.md) for detailed browser development,
authentication, and deployment instructions.

Build/deploy the Android app with Expo's platform tooling from `mobile/`; point
`EXPO_PUBLIC_API_URL` to the production HTTPS API before creating the build.
Deploy Django separately using the project's production settings, database,
static/media storage, allowed hosts, and secret environment variables.

## Validation

From `web/`: `npm.cmd run typecheck`, `npm.cmd run lint`,
`npm.cmd test`, and `npm.cmd run build`.

From `mobile/`: `.\node_modules\.bin\tsc.cmd --noEmit`,
`npm.cmd run lint`, `.\node_modules\.bin\expo.cmd install --check`,
`.\node_modules\.bin\expo.cmd export --platform web`, and
`.\node_modules\.bin\expo.cmd export --platform android`.

The browser authentication state/form tests and Django browser-cookie/auth tests
are automated. Production bundle builds validate routing and platform bundling;
they do not replace a live-backend browser test or a physical/emulated Android
test.
