# AgriSmart Web

Responsive React and TypeScript browser client for the shared AgriSmart Django
REST API. It supports desktop, tablet, and mobile-browser layouts. The Expo
application in `../mobile/` remains the Android client; neither frontend owns
authoritative market, account, advisory, or marketplace data.

## Requirements

- Node.js and npm (use the versions already available in the repository).
- The Django backend running and reachable from the browser.
- Backend database migrations applied.

## Local development

From the repository root, create `web/.env` from the example and set the API
base URL:

```powershell
cd web
Copy-Item .env.example .env
npm.cmd ci
npm.cmd run dev
```

The development server prints its browser URL, usually
`http://localhost:5173`. Set `VITE_API_URL` in `web/.env` to the backend URL
reachable from the browser, including the `/api/v1` prefix, for example:

```dotenv
VITE_API_URL=http://localhost:8000/api/v1
```

`VITE_` variables are public build-time configuration; never put passwords,
signing keys, or other secrets in them.

Start the backend separately from `backend/`:

```powershell
.\venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000
```

Desktop local development uses `localhost` for both web and API hosts. For a
mobile browser or a physical Android device, use the development computer's
LAN IP in both the browser URL and `VITE_API_URL` (for example,
`http://192.168.1.20:5173` and `http://192.168.1.20:8000/api/v1`). Configure
the backend `ALLOWED_HOSTS` to accept that host and set
`WEB_APP_ORIGINS=http://192.168.1.20:5173`. Allow the backend and Vite ports
through the computer firewall. Restart Vite after changing its environment.

The Android emulator uses `http://10.0.2.2:8000/api/v1` in the mobile
application; that special emulator address is not the URL to configure for a
browser. See `../mobile/README.md` for Expo commands and device setup.

## Authentication and browser security

The web client signs in to the same backend accounts as mobile using the
backend's browser-specific endpoints under `/api/v1/auth/web/`. It does not
store JWTs in local storage: the short-lived access JWT stays in memory, and
the backend sets the refresh JWT as an `HttpOnly`, `SameSite=Lax` cookie
restricted to `/api/v1/auth/web/`. On page reload, the app attempts a CSRF-
protected refresh and then loads the shared profile. Login, registration,
refresh, and logout use Django CSRF tokens and credentialed CORS requests.
Logout also blacklists the refresh token.

Keep the web application and API on the same site (same hostname and scheme)
where possible. `localhost` and `127.0.0.1` are distinct cookie hosts; use one
consistently. Cross-site production deployments require a deliberate
`SameSite`, cookie, CORS, and CSRF configuration and must be tested over HTTPS.
The backend marks refresh cookies Secure when `DEBUG=False`.

The browser auth endpoints use SimpleJWT's token blacklist app for logout.
After enabling the app, apply migrations in the backend environment before
using or deploying browser auth:

```powershell
cd backend
.\venv\Scripts\python.exe manage.py migrate
```

`WEB_APP_ORIGINS` is a comma-separated list of exact browser origins, without
trailing paths (for example, `https://app.example.com`). Set it in the backend
environment for each web deployment. The configured origins are added to
credentialed CORS and CSRF trusted origins. Keep CORS restricted to known
origins; do not enable `CORS_ALLOW_ALL_ORIGINS` for deployment.

## Features

- Public entry page, registration, login, protected application navigation.
- Dashboard, commodity prices and market history.
- Advisory questions and saved backend conversation history.
- Marketplace browsing, listing details and listing creation.
- Offer submission, received/sent offer history, and seller accept/reject
  actions when permitted by the backend. Accepting an offer creates a backend
  transaction record and marks its listing sold; no payment is processed.
- Shared profile viewing/editing and logout.

All business data is read from or written to the Django API. The current
backend does not provide a finished browser flow for OTP verification, disease
detection, price alerts, or farm/crop management; those capabilities are not
mocked as working features here.

## Checks

Run from `web/`:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

The production build is output to `web/dist/`.

## Deployment

Set `VITE_API_URL` to the production HTTPS API base when building, then run
`npm.cmd run build`. Deploy `dist/` on a static host with SPA fallback routing
to `index.html`. Configure the backend with the exact `WEB_APP_ORIGINS`, HTTPS,
an appropriate `ALLOWED_HOSTS`, a production secret key, and production
database settings. Run Django migrations as part of backend deployment. Verify
credentialed CORS, CSRF checks, and the refresh cookie's Secure, HttpOnly,
SameSite, and path attributes against the actual deployed origins.
