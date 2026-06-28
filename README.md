# BM Global Ventures Scheduling System — Employee Scheduling System

A full-stack employee scheduling app built with **Nuxt 3** + **MongoDB Atlas**.

## Features
- **Manager + Employee roles** with JWT auth (httpOnly cookies)
- **Weekly & monthly calendar** with color-coded shifts per employee
- **Shift management** — create, edit, delete shifts
- **Employee profiles** — availability, roles, departments, hourly rate
- **Time-off requests** — employees submit, managers approve/deny with notes

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your MongoDB Atlas URI and a strong JWT secret
```

### 3. (Optional) Seed demo data
```bash
npm run seed
```
This creates:
- **Manager:** `manager@demo.com` / `manager123`
- **Employees:** `sarah@demo.com`, `mike@demo.com`, `emma@demo.com` / `employee123`

### 4. Run development server
```bash
npm run dev
# Visit http://localhost:3000
```

### 5. Build for production
```bash
npm run build
npm run preview
```

## Project Structure
```
├── server/
│   ├── api/          # REST API endpoints (Nuxt server routes)
│   │   ├── auth/     # login, logout, me
│   │   ├── employees/
│   │   ├── shifts/
│   │   └── time-off/
│   ├── models/       # Mongoose schemas (User, Shift, TimeOffRequest)
│   ├── plugins/      # MongoDB connection
│   └── utils/        # JWT auth helpers
├── pages/            # Nuxt pages
│   ├── login.vue
│   ├── dashboard.vue
│   ├── schedule.vue  # Weekly/monthly calendar
│   ├── employees/
│   └── time-off.vue
├── components/       # Reusable Vue components
├── composables/      # useAuth, useToast
└── middleware/       # Auth route guard
```

## Environment Variables
| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for signing JWT tokens (use a long random string in production) |
