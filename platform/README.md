# Offline-First Talent-to-Employment Platform

A full-stack web platform that connects African youth with skills, mentorship, and employment — built to work reliably even without a stable internet connection.

Learners study course modules, take assessed projects, and earn verifiable certificates. Employers search verified graduate portfolios and connect directly with talent. Mentors guide learners through project submissions and feedback. All payments run through MTN Mobile Money.

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
- [Demo Mode — Instant Payment Bypass](#demo-mode--instant-payment-bypass)
- [How Offline-First Works](#how-offline-first-works)
- [Mentor Module Approval Flow](#mentor-module-approval-flow)
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
- Mentor registers, gets approved by admin, then creates modules and assessments, reviews submissions, and gives rated feedback
- Submissions automatically assigned to mentors whose expertise matches the module track — split equally between matching mentors
- Admin manages everything — modules, assessments, users, revenue stats, module approvals

---

## User Roles

| Role | How to create | Access |
|---|---|---|
| **Admin** | Created by `seed.js` or manually | Full platform control — create and approve modules, manage users, view revenue, issue certificates |
| **Learner** | Register at `/register` → select Learner | Browse modules, read offline, take assessments, earn certificates, edit portfolio, message mentors |
| **Employer** | Register at `/register` → select Employer | Monthly subscription, search and filter portfolios, view certificates, message graduates |
| **Mentor** | Register at `/register` → select Mentor → admin activates the account | Create modules (pending admin approval), create assessments, review assigned submissions, give feedback, schedule sessions |

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
| Nodemailer | Transactional emails — password reset, welcome, module approval |
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
│   │   ├── auth.test.js
│   │   ├── assessment.test.js
│   │   ├── payments.test.js
│   │   ├── certificates.test.js
│   │   ├── subscriptionCron.test.js
│   │   ├── validation.test.js
│   │   ├── rateLimiter.test.js
│   │   └── testSetup.js
│   │
│   ├── config/
│   │   └── database.js             # SQLite for dev, PostgreSQL for prod
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── passwordController.js
│   │   ├── paymentController.js    # Includes demo bypass for phone 1111111111
│   │   ├── moduleController.js     # Includes mentor approval flow
│   │   └── assessmentController.js
│   │
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── validators.js
│   │   └── rateLimiter.js
│   │
│   ├── models/
│   │   ├── index.js
│   │   ├── User.js
│   │   ├── LearningModule.js       # approvalStatus and rejectionReason fields
│   │   └── Payment.js
│   │
│   ├── routes/
│   │   ├── auth.js
│   │   ├── modules.js              # Includes /pending route for admin
│   │   ├── assessments.js          # Admin and mentor can create
│   │   ├── certificates.js
│   │   ├── certificatePdf.js
│   │   ├── portfolios.js
│   │   ├── payments.js
│   │   ├── messages.js
│   │   ├── submissions.js          # Auto-assign to mentor by expertise
│   │   ├── sessions.js
│   │   ├── progress.js
│   │   ├── users.js
│   │   └── admin.js
│   │
│   ├── utils/
│   │   ├── momoService.js
│   │   ├── emailService.js
│   │   └── subscriptionCron.js
│   │
│   ├── .env.example
│   ├── server.js
│   ├── seed.js
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   ├── manifest.json
│   │   ├── service-worker.js
│   │   └── offline.html
│   │
│   └── src/
│       ├── components/
│       │   ├── MomoPaymentModal.jsx    # Demo bypass built in
│       │   └── Skeletons.jsx
│       │
│       ├── context/
│       │   └── AuthContext.js
│       │
│       ├── hooks/
│       │   ├── useServiceWorker.js
│       │   └── useMomoPayment.js
│       │
│       ├── pages/
│       │   ├── Auth.jsx                # Register supports Learner, Employer, Mentor
│       │   ├── LearnerDashboard.jsx
│       │   ├── ModulePage.jsx
│       │   ├── AssessmentPage.jsx
│       │   ├── CertificatePage.jsx
│       │   ├── MyCertificates.jsx
│       │   ├── Dashboards.jsx          # Mentor dashboard with Modules, Submissions, Sessions, Messages tabs
│       │   ├── PortfolioPage.jsx
│       │   ├── EditProfile.jsx
│       │   ├── MessagesPage.jsx
│       │   ├── PaymentHistory.jsx
│       │   ├── AdminModuleForm.jsx     # Works for both admin and mentor
│       │   ├── AdminAssessmentForm.jsx # Works for both admin and mentor
│       │   ├── AdminSubmissions.jsx
│       │   ├── PasswordReset.jsx
│       │   └── NotFound.jsx
│       │
│       ├── utils/
│       │   ├── api.js
│       │   └── offlineDB.js
│       │
│       ├── App.js
│       └── index.js
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
cd platform/backend
npm install
```

### Step 3 — Create your environment file

```bash
# Mac / Linux
cp .env.example .env

# Windows
copy .env.example .env
```

Open `.env` and fill in at minimum:

```env
JWT_SECRET=make_up_any_long_random_string_here
SMTP_USER=your_gmail_address@gmail.com
SMTP_PASS=your_16_character_gmail_app_password
FRONTEND_URL=http://localhost:3000
```

### Step 4 — Seed the database

```bash
node seed.js
```

> Run this once only.

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

Leave this terminal open.

### Step 6 — Install and start the frontend

Open a second terminal:

```bash
cd platform/frontend
npm install
npm start
```

Open your browser at `http://localhost:3000`.

---

## Environment Variables

All variables live in `backend/.env`. A documented template is in `backend/.env.example`.

### Required

| Variable | Description |
|---|---|
| `JWT_SECRET` | Any long random string — keep it private |
| `SMTP_USER` | Your Gmail address |
| `SMTP_PASS` | Gmail App Password — generate at myaccount.google.com → Security → App Passwords |
| `FRONTEND_URL` | `http://localhost:3000` locally, your domain in production |

### Required for live MTN payments

| Variable | Where to get it |
|---|---|
| `MTN_MOMO_SUBSCRIPTION_KEY` | momodeveloper.mtn.com — subscribe to Collections |
| `MTN_MOMO_API_USER` | Generated via MoMo sandbox API |
| `MTN_MOMO_API_KEY` | Generated via MoMo sandbox API |
| `MTN_MOMO_CALLBACK_URL` | Public HTTPS URL — MTN cannot call localhost |

---

## Default Login

After running `node seed.js`:

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
| Mentor | Go to `/register` → select Mentor → log in as admin → Users tab → click Activate next to the mentor account |

---

## Demo Mode — Instant Payment Bypass

For demonstrations and testing without real MTN Mobile Money, the platform has a built-in demo bypass.

### How to use it

When the payment modal appears, enter:

```
1111111111
```

The system instantly grants full access — no MTN contact, no real money, no sandbox account needed.

### What happens

| User | Enters | Result |
|---|---|---|
| Learner | `1111111111` | All courses unlocked immediately |
| Employer | `1111111111` | Full portfolio access activated for 1 month |

The button label changes to **Grant Demo Access** when this number is detected, so it is clear what is happening during a demo.

### When to use real MTN MoMo

The demo bypass is for local development and live demonstrations only. For real user deployments, configure your MTN MoMo credentials in `.env`. See the [Payments](#payments) section.

---

## How Offline-First Works

Three layers keep the platform functional without internet.

### Layer 1 — Service Worker

Registered on first visit. Four caching strategies:

| Request type | Strategy | Effect |
|---|---|---|
| App shell — HTML, JS, CSS | Cache first | UI loads instantly even offline |
| Module content API | Stale-while-revalidate | Cached version loads immediately, update fetched in background |
| Other API calls | Network first | Live data when online, cached fallback when offline |
| Fonts | Cache first | Typography works offline after first visit |

### Layer 2 — IndexedDB

| Store | Key | Contents |
|---|---|---|
| `modules` | module id | Full module content — readable offline indefinitely |
| `progressQueue` | module id | Reading progress that failed to sync |
| `assessmentQueue` | assessment id | Exam answers submitted offline — auto-submitted on reconnect |

### Layer 3 — Online event

When connectivity returns, the app automatically flushes both queues and syncs everything to the server. No data is ever lost.

---

## Mentor Module Approval Flow

1. Mentor clicks **+ Submit New Module** on their dashboard
2. Module saved with `approvalStatus: pending` — not visible to learners
3. Admin sees a red badge on the **Modules** tab
4. Admin previews the content, then clicks **Approve** or **Reject** with a reason
5. Approved — module published automatically, mentor notified by email
6. Rejected — mentor sees the reason on their dashboard and can edit and resubmit

### Auto-assignment of submissions

When a learner submits a project:
1. System checks the module track
2. Finds active mentors whose expertise matches that track
3. Picks the mentor with the fewest current assignments
4. If no matching mentor — goes to admin to assign manually

---

## API Reference

Base URL: `http://localhost:5000/api`

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Create account — learner, employer, or mentor |
| POST | `/auth/login` | No | Login and receive JWT |
| PATCH | `/auth/profile` | Yes | Update name, photo, bio, skills |
| POST | `/auth/forgot-password` | No | Send password reset email |
| POST | `/auth/reset-password` | No | Reset with emailed token |

### Modules

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/modules` | Yes | List modules |
| GET | `/modules/pending` | Admin | List pending mentor modules |
| GET | `/modules/:id` | Learner (paid) | Full module content |
| POST | `/modules/sync` | Learner | Sync offline progress |
| POST | `/modules` | Admin or Mentor | Create module |
| PATCH | `/modules/:id/review` | Admin | Approve or reject mentor module |
| PATCH | `/modules/:id/publish` | Admin | Toggle publish status |

### Assessments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/assessments/:id` | Learner | Questions with answers stripped |
| POST | `/assessments/:id/submit` | Learner | Submit — auto-graded, cert issued if passed |
| POST | `/assessments` | Admin or Mentor | Create assessment |
| PATCH | `/assessments/:id/publish` | Admin or Mentor | Publish assessment |

### Payments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/payments/learner/initiate` | Learner | $10 payment — use `1111111111` for instant demo access |
| POST | `/payments/employer/initiate` | Employer | $20/month — use `1111111111` for instant demo subscription |
| GET | `/payments/verify/:id` | Yes | Poll payment status |
| GET | `/payments/my-payments` | Yes | Payment history |
| POST | `/payments/momo-callback` | MTN | Webhook from MTN |

### Submissions

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/submissions` | Learner | Submit project — auto-assigned to mentor |
| GET | `/submissions` | Mentor or Admin | List submissions |
| GET | `/submissions/unassigned` | Admin | Submissions with no mentor |
| PATCH | `/submissions/:id/assign` | Admin | Manually assign mentor |
| POST | `/submissions/:id/feedback` | Mentor | Submit feedback with rating |

### Admin

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/admin/stats` | Admin | User counts and platform stats |
| GET | `/admin/revenue` | Admin | Revenue breakdown |
| GET | `/admin/users` | Admin | List users by role |
| PATCH | `/admin/users/:id/toggle-active` | Admin | Activate or deactivate user |
| POST | `/admin/certificates` | Admin | Manually issue certificate |

---

## Running the Tests

```bash
cd backend
npm test
```

Expected output:

```
PASS  __tests__/auth.test.js
PASS  __tests__/assessment.test.js
PASS  __tests__/payments.test.js
PASS  __tests__/certificates.test.js
PASS  __tests__/subscriptionCron.test.js
PASS  __tests__/validation.test.js

Test Suites:  6 passed, 6 total
Tests:        48 passed, 48 total
```

---

## Payments

### Demo — no setup required

Enter `1111111111` in the payment modal for instant access. See [Demo Mode](#demo-mode--instant-payment-bypass).

### Pricing

| User | Amount | Type |
|---|---|---|
| Learner | $10 | One-time — unlocks all courses permanently |
| Employer | $20 | Monthly — auto-renews |

### MTN MoMo sandbox setup

1. Register free at [momodeveloper.mtn.com](https://momodeveloper.mtn.com)
2. Subscribe to the Collections product
3. Generate your API user and API key
4. Set `MTN_MOMO_CURRENCY=EUR` for sandbox
5. Fill in the four `MTN_MOMO_*` variables in `.env`

### Going live

- Set `MTN_MOMO_ENVIRONMENT=mtnrwanda` (or your country)
- Set `MTN_MOMO_CURRENCY=RWF`
- Set `MTN_MOMO_CALLBACK_URL` to your live HTTPS URL

---

## Deployment

### Free hosting — Render + Vercel

**Backend on Render:**
1. Sign in at [render.com](https://render.com) with GitHub
2. Create a free PostgreSQL database — copy the Internal Database URL
3. Create a Web Service — Root Directory: `platform/backend`, Start Command: `node server.js`
4. Add all environment variables including `DATABASE_URL`
5. Run `node seed.js` from the Render Shell tab once deployed

**Frontend on Vercel:**
1. Sign in at [vercel.com](https://vercel.com) with GitHub
2. Import repo — Root Directory: `platform/frontend`
3. Add env variable: `REACT_APP_API_URL=https://your-backend.onrender.com`
4. Deploy

> The free Render backend sleeps after 15 minutes of inactivity. First request after sleep takes 30–60 seconds. Normal on the free plan.

### Docker

```bash
cp .env.production .env
docker-compose up -d
```

---

*FTEP · Kigali, Rwanda · 2025*