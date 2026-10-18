# AgriSmart Platform 

**AI-Powered Digital Agriculture for Smallholder Farmers in Uganda**

AgriSmart is a digital agriculture platform designed to help smallholder farmers make informed farming and business decisions. It brings agricultural market information, AI-assisted advisory services, crop disease detection, and a farmer-to-buyer marketplace into one platform accessible through **mobile devices and desktop computers**.

The platform aims to connect farmers with useful agricultural information and potential buyers, helping them improve productivity, access market opportunities, and make better-informed decisions.

##  Key Features

###  1. Agricultural Market Intelligence

Access agricultural market information to support better selling and production decisions.

- View available commodities and market prices.
- Explore historical price information where available.
- Support future price forecasting using historical data and machine learning.
- Help farmers compare market opportunities across regions.

###  2. AI-Powered Agricultural Advisory

AgriSmart aims to provide farmers with accessible agricultural guidance through a digital advisory assistant.

- Ask farming questions in natural language.
- Get guidance on crop management, planting, and common farming challenges.
- Access advisory conversations and previous questions where supported.
- Extend advisory capabilities through rule-based recommendations and AI language models.

*Important: AI-generated advice should be treated as guidance, not a substitute for qualified agricultural expertise.*

###  3. Crop Disease Detection

The platform is designed to support crop disease identification using images of affected plants.

- Submit crop images for analysis.
- Identify supported crop diseases when a trained model is available.
- Provide relevant treatment and prevention recommendations.

Disease detection depends on the availability and integration of a trained model. It should not be considered operational until the implementation has been tested and verified.

###  4. Farmer-to-Buyer Marketplace

Connect farmers and buyers through a digital produce marketplace.

- Browse available agricultural produce.
- Create produce listings with quantities, prices, and descriptions.
- View listing details.
- Allow buyers to submit offers where supported.
- Improve access to potential customers and market opportunities.

###  5. Notifications and Alerts

AgriSmart includes notification capabilities intended to keep users informed about important activities.

Potential notification use cases include:

- Updates on marketplace offers.
- Changes to relevant agricultural market prices.
- Agricultural advisory updates.
- Weather alerts and pest or disease warnings when the necessary data integrations are available.

Actual notification channels and alert types depend on the implemented integrations.

### 📱 6. Mobile and Desktop Access

AgriSmart is designed for use across different devices.

- **Mobile application:** React Native and Expo.
- **Web application:** React, Vite, and TypeScript.
- **Backend API:** Django REST Framework, shared by the client applications.

The goal is to provide a consistent experience across mobile phones, tablets, and desktop computers while keeping the interface responsive and accessible.

---

## 🛠️ Technology Stack

| Component | Technologies |
|---|---|
| Backend | Python, Django, Django REST Framework |
| Authentication | JWT with `djangorestframework-simplejwt` |
| Database | SQLite for local development; PostgreSQL where configured for deployment |
| API documentation | drf-spectacular and Swagger UI, where configured |
| Mobile application | React Native, Expo, Expo Router, TypeScript |
| Mobile state management | Zustand and TanStack Query |
| Mobile API requests | Axios |
| Mobile token storage | Expo SecureStore on supported native platforms |
| Web application | React, Vite, TypeScript |
| Web styling | Tailwind CSS and project UI components |
| Charts and visualizations | Recharts, where used |
| AI and machine learning | Planned or integrated components depend on the module's implementation |

*The technology list describes the project's stack and intended integrations. Check the dependency files and source code for the exact installed versions and currently active capabilities.*

---

##  Project Structure

```text
AgriSmart-Platform/
├── backend/
│   ├── config/                 # Django project configuration
│   ├── apps/
│   │   ├── accounts/           # User and account functionality
│   │   ├── markets/            # Agricultural markets and prices
│   │   ├── forecasts/          # Price forecasting functionality
│   │   ├── advisory/           # Agricultural advisory services
│   │   ├── diseases/           # Crop disease functionality
│   │   ├── marketplace/        # Produce listings and offers
│   │   └── notifications/      # Notifications
│   ├── requirements/           # Python dependency files
│   ├── manage.py               # Django management commands
│   └── .env.example            # Example environment configuration
├── mobile/
│   ├── app/                    # Expo Router screens
│   ├── components/             # Reusable interface components
│   ├── services/               # API client and services
│   └── store/                  # Client-side state management
├── web/
│   └── src/                    # React web application
├── README.md
└── .gitignore
```

*This is a high-level overview. Some directories or modules may differ as development continues.*

---

##  Getting Started

Follow these instructions to run AgriSmart locally. Backend, mobile, and web applications may require separate terminals.

### Prerequisites

Install the following tools:

- [Git](https://git-scm.com/)
- [Python](https://www.python.org/downloads/) compatible with the backend's dependencies
- [Node.js and npm](https://nodejs.org/)
- [Expo Go](https://expo.dev/go/) for testing on a compatible physical device, or an appropriate emulator
- A code editor such as [Visual Studio Code](https://code.visualstudio.com/)

### 1. Clone the repository

```bash
git clone https://github.com/belindairakoze37/AgriSmart-Platform.git
cd AgriSmart-Platform
```

### 2. Set up the backend

Open a terminal in the project root, then navigate to the backend:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it in Git Bash on Windows:

```bash
source venv/Scripts/activate
```

On Windows Command Prompt, use:

```bat
venv\Scripts\activate.bat
```

On macOS or Linux, use:

```bash
source venv/bin/activate
```

Install the dependencies using the requirements file available in your project. For example, if `requirements/base.txt` contains the required packages:

```bash
pip install -r requirements/base.txt
```

Configure the environment:

1. Review `backend/.env.example`.
2. Create the appropriate local `.env` file if required by the project configuration.
3. Set the necessary development values, including a Django secret key and database settings.
4. Never commit real credentials, secret keys, or production environment variables.

Apply database migrations:

```bash
python manage.py migrate
```

Start the development server:

```bash
python manage.py runserver
```

The backend should now be available at:

- API base: `http://127.0.0.1:8000/`
- API documentation: `http://127.0.0.1:8000/api/docs/`, if enabled in the current configuration.

Check the project's URL configuration and Swagger documentation for the exact API routes.

### 3. Set up the mobile application

Open a **second terminal** from the repository root:

```bash
cd mobile
npm install
```

Configure the mobile application's API URL using the environment variable expected by its API client.

For a physical phone connected to the same Wi-Fi network as your computer, the URL may look like this:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000/api/v1
```

Replace `192.168.1.100` with your computer's actual local IP address, and adjust the API path to match the mobile application's configuration.

**Important:** `127.0.0.1` on a physical phone refers to the phone itself, not your computer. Also, ensure your firewall permits the phone to reach the development server.

Start Expo:

```bash
npx expo start
```

Follow the terminal instructions to open the application in Expo Go or an appropriate emulator. Use the Expo SDK and Expo Go versions supported by the project.

### 4. Set up the web application

Open another terminal from the repository root:

```bash
cd web
npm install
```

Configure the web application's backend URL using the environment variable expected by its API client. Check the existing source code and any example environment files before choosing a variable name.

Start the development server:

```bash
npm run dev
```

Open the local URL printed by Vite in your terminal.

Make sure the Django backend is running and that CORS settings allow the local web application's origin.

*Note: These instructions assume the web application has a working `package.json` with a `dev` script. Use the scripts defined in that file if they differ.*

---

##  API Documentation

AgriSmart uses Django REST Framework to expose backend functionality to its client applications.

When the backend is running and API documentation is enabled, open:

**Swagger UI:** `http://127.0.0.1:8000/api/docs/`

Use the live API documentation as the source of truth for available endpoints, authentication requirements, request formats, and response structures.

Examples of API areas include:

- Authentication and user accounts.
- Agricultural markets and commodity prices.
- Price forecasting.
- Agricultural advisory conversations.
- Crop disease analysis.
- Marketplace listings and offers.
- Notifications.

Endpoint paths and supported methods may change during development. Confirm them in Swagger UI rather than assuming an endpoint exists.

---

##  Security and Best Practices

- Keep secret keys, database credentials, and API keys in environment variables.
- Never commit `.env` files containing real secrets.
- Use Django's password hashing and the configured authentication system.
- Protect private API endpoints with appropriate permissions.
- Store mobile authentication tokens using the configured secure storage mechanism.
- Configure CORS and allowed hosts appropriately for each environment.
- Validate user input and uploaded files on the backend.
- Use HTTPS and production-appropriate security settings when deploying.
- Avoid committing local databases, generated files, virtual environments, or build artifacts unless they are intentionally required.

---

##  Roadmap

AgriSmart is being developed in stages. The roadmap below describes areas of work, not a guarantee that every feature is already available.

- [ ] Complete and verify backend APIs and authentication flows.
- [ ] Continue improving the mobile application and its core user journeys.
- [ ] Complete responsive web experiences for relevant user roles.
- [ ] Improve agricultural market data quality and price forecasting.
- [ ] Train and evaluate crop disease detection models.
- [ ] Expand agricultural advisory capabilities and validate recommendations.
- [ ] Add or complete SMS integrations where required.
- [ ] Evaluate and integrate supported payment providers.
- [ ] Improve automated testing, deployment, monitoring, and documentation.
- [ ] Conduct end-to-end testing across desktop and mobile devices.

Update this checklist as features are implemented, tested, and released.

---

##  Testing and Quality

Before submitting changes:

1. Run the relevant backend tests.
2. Run the mobile or web checks defined in the respective `package.json` scripts.
3. Test authentication and protected routes.
4. Verify that client applications can reach the backend.
5. Check responsive layouts on desktop and mobile screen sizes.
6. Confirm that no secrets or unintended local data are included in the changes.

Document any known limitations that remain.

---

##  Contributing

Contributions, suggestions, and bug reports are welcome.

To contribute:

1. Create a feature branch from the appropriate development branch.
2. Make a focused change.
3. Run the relevant tests and checks.
4. Use clear commit messages, such as `feat:`, `fix:`, `test:`, `docs:`, or `refactor:`.
5. Open a pull request describing the change and its verification.

Please avoid committing unrelated changes, credentials, or local development data.

---

##  License

Add or update the repository's `LICENSE` file to reflect the license selected for AgriSmart. If the project uses the MIT License, include the complete MIT License text in that file.

---

**Built with ❤️ to support agricultural innovation and smallholder farmers in Uganda.**