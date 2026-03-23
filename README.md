# Offline-First Talent-to-Employment Platform

A full-stack web platform that connects African youth with skills, mentorship, and employment — built to work reliably even without a stable internet connection.

Learners study course modules, take assessed projects, and earn verifiable certificates. Employers search verified graduate portfolios and connect directly with talent. All payments run through MTN Mobile Money.

**Built by** Premier Ufitinema · African Leadership University · Kigali, Rwanda · 2025

---

## Table of Contents

- [Overview](#overview)
- [User Roles](#user-roles)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Default Login](#default-login)
- [How Offline-First Works](#how-offline-first-works)
- [API Reference](#api-reference)
- [Running the Tests](#running-the-tests)
- [Payments](#payments)
- [Deployment](#deployment)

---

## Overview

Most learning platforms assume a reliable internet connection. This one does not.

The platform uses a **Service Worker** to cache the app shell and module content on the first visit. From that point, learners can read courses, track their progress, and even submit assessments with no network at all. Everything queues locally in **IndexedDB** and syncs automatically the moment connectivity returns — no data is ever lost.

**Core features:**

- Learner pays a one-time $10 fee via MTN MoMo to unlock all courses
- Course content cached to device after first load — readable offline permanently
- Reading progress tracked by scroll position, synced in the background
- Assessments auto-graded on submission — passing issues a downloadable PDF certificate with a QR verification code
- Employer pays $20/month to search portfolios, filter by skill and track, message graduates
- Mentor reviews project submissions, gives rated feedback, schedules sessions
- Admin manages everything — modules, assessments, users, revenue stats

---

## User Roles

| Role | How to create | Access |
|---|---|---|
| **Admin** | Created automatically by `seed.js` | Full platform control — create modules and assessments, manage all users, view revenue, issue certificates manually |
| **Learner** | Register at `/register` → select Learner | Browse modules, read offline, take assessments, earn certificates, edit portfolio, message mentors |
| **Employer** | Register at `/register` → select Employer | Monthly subscription, search and filter portfolios, view certificates, message graduates |
| **Mentor** | Admin promotes an existing user to Mentor | Review submitted projects, give feedback with star rating, schedule sessions with learners |

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | REST API server |
| Sequelize ORM | Database abstraction layer |
| SQLite | Local development database (auto-created on first run) |
| PostgreSQL | Production database |
| JSON Web Tokens | Authentication — 7-day tokens |
| bcryptjs | Password hashing |
| PDFKit | Certificate PDF generation |
| Nodemailer | Transactional emails — password reset, welcome |
| express-validator | Input validation and sanitisation |
| MTN MoMo Collections API | Mobile Money payment processing |
| node-cron | Daily job to suspend expired employer subscriptions |
| Jest + Supertest | Automated testing — 48 tests across 6 suites |

### Frontend
| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| React Router v6 | Client-side routing and protected routes |
| Axios | HTTP client with automatic JWT header injection |
| Service Worker | Offline caching — app shell, module content, API responses |
| IndexedDB | Offline-first storage — module cache, progress queue, assessment queue |
| React Hot Toast | User notifications |

### Infrastructure
| Technology | Purpose |
|---|---|
| Docker + Docker Compose | Containerised deployment |
| Nginx | Frontend production server and reverse proxy |

---

## Project Structure

```
Offline-First-Talent-to-Employment-Platform/
│
├── backend/
│   ├── __tests__/
│   │   ├── auth.test.js                # Register, login, JWT validation (12 tests)
│   │   ├── assessment.test.js          # Auto-grading, cert issuance, payment gate (6 tests)
│   │   ├── payments.test.js            # MoMo flow, webhook, access grants (9 tests)
│   │   ├── certificates.test.js        # Verify, ownership, revocation (6 tests)
│   │   ├── subscriptionCron.test.js    # Expiry suspension, email warnings (5 tests)
│   │   ├── validation.test.js          # All input validation rules (10 tests)
│   │   ├── rateLimiter.test.js         # Allow, block, retry-after (4 tests)
│   │   └── testSetup.js                # In-memory SQLite + mocked email and MoMo
│   │
│   ├── config/
│   │   └── database.js                 # Sequelize — SQLite for dev, PostgreSQL for prod
│   │
│   ├── controllers/
│   │   ├── authController.js           # Register, login, profile update
│   │   ├── passwordController.js       # Forgot password, reset with token
│   │   ├── paymentController.js        # MoMo initiate, webhook, verify
│   │   ├── moduleController.js         # CRUD modules, sync offline progress
│   │   └── assessmentController.js     # Fetch questions, submit, auto-grade
│   │
│   ├── middleware/
│   │   ├── auth.js                     # protect(), restrictTo(), requireCourseAccess()
│   │   ├── validators.js               # express-validator rules for every route
│   │   └── rateLimiter.js              # In-memory rate limiting per endpoint
│   │
│   ├── models/
│   │   ├── index.js                    # All 11 Sequelize models and associations
│   │   ├── User.js
│   │   ├── LearningModule.js
│   │   └── Payment.js
│   │
│   ├── routes/
│   │   ├── auth.js                     # /register /login /profile /forgot /reset
│   │   ├── modules.js                  # /modules  /modules/:id  /modules/sync
│   │   ├── assessments.js              # /:id  /:id/submit
│   │   ├── certificates.js             # /verify/:code  /:id
│   │   ├── certificatePdf.js           # /:id/pdf — streams PDF download
│   │   ├── portfolios.js               # /  /me  /:learnerId
│   │   ├── payments.js                 # /initiate  /verify  /callback
│   │   ├── messages.js                 # threads and send
│   │   ├── submissions.js              # list, assign mentor, approve/reject
│   │   ├── sessions.js                 # mentor/learner sessions
│   │   ├── progress.js                 # /:learnerId progress report
│   │   ├── users.js                    # /me  role management
│   │   └── admin.js                    # /stats  manual certificate issuance
│   │
│   ├── utils/
│   │   ├── momoService.js              # MTN MoMo Collections API wrapper
│   │   ├── emailService.js             # Nodemailer transactional email helper
│   │   └── subscriptionCron.js         # Daily cron — suspend lapsed employers
│   │
│   ├── .env.example                    # All 19 environment variables with descriptions
│   ├── server.js                       # Express entry point
│   ├── seed.js                         # Creates admin account + 2 sample modules
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   ├── index.html                  # PWA meta tags — no external font dependencies
│   │   ├── manifest.json               # PWA install manifest with icons
│   │   ├── service-worker.js           # Four caching strategies for full offline support
│   │   └── offline.html                # Shown when app opens with no network for first time
│   │
│   └── src/
│       ├── components/
│       │   ├── MomoPaymentModal.jsx    # MTN MoMo payment UI with status polling
│       │   └── Skeletons.jsx           # Loading skeletons: Card, Grid, Table, Profile, Certificate
│       │
│       ├── context/
│       │   └── AuthContext.js          # Global user state, login, logout, refreshUser
│       │
│       ├── hooks/
│       │   ├── useServiceWorker.js     # SW registration + online event queue flusher
│       │   └── useMomoPayment.js       # Initiate MoMo payment and poll for result
│       │
│       ├── pages/
│       │   ├── Auth.jsx                # Register and Login
│       │   ├── LearnerDashboard.jsx    # Module grid, offline status widget, progress bar
│       │   ├── ModulePage.jsx          # Read module, track scroll progress, offline cache
│       │   ├── AssessmentPage.jsx      # Countdown timer, questions, offline queue on submit
│       │   ├── CertificatePage.jsx     # Printable certificate with PDF download
│       │   ├── MyCertificates.jsx      # Certificate list — View, PDF download, copy link
│       │   ├── Dashboards.jsx          # Employer, Mentor, and Admin dashboards
│       │   ├── PortfolioPage.jsx       # Public learner portfolio
│       │   ├── EditProfile.jsx         # Three-tab form: Personal, Learning, Portfolio
│       │   ├── MessagesPage.jsx        # Threaded chat with 8-second polling
│       │   ├── PaymentHistory.jsx      # Payment table with colour-coded status
│       │   ├── AdminModuleForm.jsx     # Create module with file upload
│       │   ├── AdminAssessmentForm.jsx # Create assessment with question builder
│       │   ├── AdminSubmissions.jsx    # Filter submissions, assign mentor, approve or reject
│       │   ├── PasswordReset.jsx       # Forgot password and reset with emailed token
│       │   └── NotFound.jsx            # 404 page
│       │
│       ├── utils/
│       │   ├── api.js                  # Axios instance with automatic JWT header injection
│       │   └── offlineDB.js            # IndexedDB wrapper — 3 stores, 13 exported functions
│       │
│       ├── App.js                      # All routes, ProtectedRoute, role-based redirects
│       └── index.js                    # React entry point + service worker registration
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js v18 or higher** — download at [nodejs.org](https://nodejs.org), choose the LTS version
- **Git** — download at [git-scm.com](https://git-scm.com)
- A terminal — PowerShell on Windows, Terminal on Mac, bash on Linux

### Step 1 — Clone the repository

```bash
git clone https://github.com/primitivecodes/Offline-First-Talent-to-Employment-Platform.git
cd Offline-First-Talent-to-Employment-Platform
```

### Step 2 — Install backend dependencies

```bash
cd backend
npm install
```

### Step 3 — Create your environment file

```bash
# Mac / Linux
cp .env.example .env

# Windows
copy .env.example .env
```

Open `.env` in your editor and fill in at minimum:

```env
JWT_SECRET=make_up_any_long_random_string_here
SMTP_USER=your_gmail_address@gmail.com
SMTP_PASS=your_16_character_gmail_app_password
```

Everything else can stay as the default for local development. See [Environment Variables](#environment-variables) for the full list.

### Step 4 — Seed the database

Creates the first admin account and two sample learning modules.

```bash
node seed.js
```

> Run this **once only**. Running it again shows a harmless duplicate warning — your data is untouched.

### Step 5 — Start the backend

```bash
npm run dev
```

You should see:

```
✓ Database connected
✓ Database synced
✓ Server running on http://localhost:5000
✓ Subscription cron scheduled
```

Leave this terminal open. The backend stops if you close it.

### Step 6 — Install and start the frontend

Open a **second terminal window**:

```bash
cd frontend
npm install
npm start
```

After about 30 seconds:

```
Compiled successfully!
Local:  http://localhost:3000
```

Open your browser at `http://localhost:3000`. The platform is running.

---

## Environment Variables

All variables live in `backend/.env`. A fully documented template is in `backend/.env.example`.

### Required — the platform will not work without these

| Variable | Description |
|---|---|
| `JWT_SECRET` | Any long random string — used to sign authentication tokens. Keep it private. |
| `SMTP_USER` | Your Gmail address |
| `SMTP_PASS` | Gmail **App Password** — not your regular Gmail password. Generate one at [myaccount.google.com](https://myaccount.google.com) → Security → 2-Step Verification → App Passwords |
| `FRONTEND_URL` | `http://localhost:3000` for local dev. Set to your domain in production. |

### Required for live payments — can skip for local sandbox testing

| Variable | Where to get it |
|---|---|
| `MTN_MOMO_SUBSCRIPTION_KEY` | [momodeveloper.mtn.com](https://momodeveloper.mtn.com) — subscribe to the Collections product |
| `MTN_MOMO_API_USER` | Generated via the MoMo sandbox or production API |
| `MTN_MOMO_API_KEY` | Generated via the MoMo sandbox or production API |
| `MTN_MOMO_CALLBACK_URL` | A public HTTPS URL pointing to `/api/payments/momo-callback` — MTN cannot call localhost |

### Optional — safe defaults already set in .env.example

`PORT`, `NODE_ENV`, `JWT_EXPIRES_IN`, `DB_PATH`, `SMTP_HOST`, `SMTP_PORT`, `MTN_MOMO_BASE_URL`, `MTN_MOMO_ENVIRONMENT`, `MTN_MOMO_CURRENCY`, `USD_TO_RWF`, `LEARNER_REGISTRATION_FEE`, `EMPLOYER_MONTHLY_FEE`, `MAX_FILE_SIZE_MB`, `UPLOAD_DIR`

---

## Default Login

After running `node seed.js`, go to `http://localhost:3000/login`:

```
Email:     admin@talentplatform.rw
Password:  Admin@123!
```

**Change this password immediately after your first login.**

### Creating other roles for testing

| Role | How |
|---|---|
| Learner | Go to `/register` → select Learner |
| Employer | Go to `/register` → select Employer |
| Mentor | Register as Learner first → Admin dashboard → change account role to Mentor |

---

## How Offline-First Works

Three layers work together to keep the platform functional without internet.

### Layer 1 — Service Worker (`public/service-worker.js`)

Registered on first visit. Uses four different caching strategies depending on the type of request:

| Request type | Strategy | Effect |
|---|---|---|
| App shell — HTML, JS, CSS | Cache first | UI loads instantly on every visit, even offline |
| Module content API (`/api/modules/:id`) | Stale-while-revalidate | Cached version loads immediately, background update fetched when online |
| Module list and other API calls | Network first | Live data when connected, cached fallback when offline |
| Google Fonts | Cache first | Typography works offline after first visit |

### Layer 2 — IndexedDB (`src/utils/offlineDB.js`)

Three stores handle all offline data. IndexedDB is used instead of localStorage because localStorage has a 5 MB cap, is synchronous (blocks the UI thread), and gets wiped under storage pressure — a real problem on budget Android phones common across Africa.

| Store | Key | Contents |
|---|---|---|
| `modules` | module id | Full module content — title, text, metadata — saved automatically after first load |
| `progressQueue` | module id | Reading progress that failed to reach the server. Only the highest percentage is kept to prevent rollback. |
| `assessmentQueue` | assessment id | Exam answers submitted while offline — held safely until the next reconnect |

### Layer 3 — Online event (`src/hooks/useServiceWorker.js`)

When `window.online` fires, the hook flushes both queues:

1. Reads all items from `progressQueue` → POSTs each to `/api/modules/sync`
2. Reads all items from `assessmentQueue` → POSTs each to `/api/assessments/:id/submit`
3. Removes each item from the queue only after the server confirms success
4. Leaves failed items in the queue to retry on the next online event

The Background Sync API is also registered as a secondary trigger for Chrome and Edge.

### The learner experience end-to-end

1. Opens a module while online → content loaded from server → saved to IndexedDB
2. Loses internet → opens the same module → loads from IndexedDB → **📴 Offline Mode** badge appears
3. Scrolls through content → progress saves to `progressQueue`
4. Submits an assessment offline → answers saved to `assessmentQueue` → sees a confirmation screen
5. Reconnects to internet → both queues flush silently in the background → nothing is lost

---

## API Reference

Base URL: `http://localhost:5000/api`

### Authentication

| Method | Endpoint | Auth required | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Create a new account |
| POST | `/auth/login` | No | Login and receive a JWT |
| PATCH | `/auth/profile` | Yes | Update name, photo, bio, skills |
| POST | `/auth/forgot-password` | No | Send a password reset email |
| POST | `/auth/reset-password` | No | Reset password with the emailed token |

### Modules

| Method | Endpoint | Auth required | Description |
|---|---|---|---|
| GET | `/modules` | Yes | List all published modules with learner progress |
| GET | `/modules/:id` | Learner (paid) | Full module content — blocked with 402 if unpaid |
| POST | `/modules/sync` | Learner | Sync offline reading progress to server |
| POST | `/modules` | Admin | Create a new module with optional file upload |
| PATCH | `/modules/:id/publish` | Admin | Toggle publish status |

### Assessments

| Method | Endpoint | Auth required | Description |
|---|---|---|---|
| GET | `/assessments/:id` | Learner | Fetch questions — correct answers stripped from response |
| POST | `/assessments/:id/submit` | Learner | Submit answers — auto-graded, certificate issued if passed |

### Certificates

| Method | Endpoint | Auth required | Description |
|---|---|---|---|
| GET | `/certificates/verify/:code` | **No** | Public endpoint — verify a certificate by unique code |
| GET | `/certificates/:id` | Yes | View certificate details |
| GET | `/certificates/:id/pdf` | Yes | Stream certificate as a downloadable A4 landscape PDF |

### Portfolios

| Method | Endpoint | Auth required | Description |
|---|---|---|---|
| GET | `/portfolios` | Employer | Search portfolios — `?search=&track=&country=&hasCertificate=true` |
| GET | `/portfolios/me` | Learner | Get own portfolio |
| PATCH | `/portfolios/me` | Learner | Update own portfolio |
| GET | `/portfolios/:learnerId` | Yes | View a public learner portfolio |

### Payments

| Method | Endpoint | Auth required | Description |
|---|---|---|---|
| POST | `/payments/learner/initiate` | Learner | Start $10 one-time MoMo payment |
| POST | `/payments/employer/initiate` | Employer | Start $20/month MoMo subscription |
| GET | `/payments/verify/:id` | Yes | Poll payment status during checkout |
| GET | `/payments/my-payments` | Yes | View own payment history |
| POST | `/payments/momo-callback` | MTN only | Webhook — MTN calls this to confirm payment |

### Admin

| Method | Endpoint | Auth required | Description |
|---|---|---|---|
| GET | `/admin/stats` | Admin | Revenue totals, user counts, module statistics |
| POST | `/admin/certificates` | Admin | Manually issue a certificate to a learner |

---

## Running the Tests

The backend has six test suites covering every major feature. All tests run against an **in-memory SQLite database** — completely safe to run at any time, no effect on your local data.

```bash
cd backend
npm test
```

Expected output:

```
PASS  __tests__/auth.test.js              (12 tests)
PASS  __tests__/assessment.test.js        (6 tests)
PASS  __tests__/payments.test.js          (9 tests)
PASS  __tests__/certificates.test.js      (6 tests)
PASS  __tests__/subscriptionCron.test.js  (5 tests)
PASS  __tests__/validation.test.js        (10 tests)

Test Suites:  6 passed, 6 total
Tests:        48 passed, 48 total
```

All 48 tests must pass before deploying to a production server.

---

## Payments

All transactions use the **MTN Mobile Money Collections API**.

### Pricing

| User | Amount | Type | When it triggers |
|---|---|---|---|
| Learner | $10 | One-time | First time they try to open any course |
| Employer | $20 | Monthly — auto-renews | On registration. Account suspended if a renewal fails. |

### Payment flow

1. User clicks pay in the UI
2. Frontend calls backend to initiate a request via MTN MoMo API
3. MTN sends a USSD prompt to the user's phone
4. User approves on their phone
5. MTN calls the backend callback URL to confirm
6. Backend grants access — course unlock or active employer subscription

### Sandbox testing

The default configuration targets the MTN sandbox. No real money moves. In the payment modal, enter any phone number in the format `250XXXXXXXXX` — the sandbox simulates a successful approval after a few seconds.

### Going live with real payments

1. Register at [momodeveloper.mtn.com](https://momodeveloper.mtn.com)
2. Subscribe to the **Collections** product
3. Fill in `MTN_MOMO_SUBSCRIPTION_KEY`, `MTN_MOMO_API_USER`, `MTN_MOMO_API_KEY` in your `.env`
4. Set `MTN_MOMO_ENVIRONMENT=mtnrwanda` (or your country — `mtnuganda`, `mtnghana`, `mtnivorycoast`)
5. Set `MTN_MOMO_CALLBACK_URL` to a live public HTTPS URL

---

## Deployment

To run in production with Docker:

```bash
# Fill in all production values first
cp .env.production .env

# Build and start all containers
docker-compose up -d
```

The frontend is served by Nginx on port 80. The backend API runs on port 5000 inside the Docker network.

For a full deployment guide covering server setup, domain configuration, SSL certificate, and MTN MoMo live key configuration, see the project documentation.

---

*African Leadership University · Kigali, Rwanda · 2025*
