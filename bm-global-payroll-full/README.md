# BM Global Ventures Inc. — Payroll & HR System

A full-stack payroll and HR system built for **BM Global Ventures Inc.** (Philippines), using **Nuxt 3** and **MongoDB**.

## What's included

- **Employee management** — records, compensation, government IDs, leave credits; separated employees move to a dedicated **Archive** (Employees → View Archive), excluded from the active directory and from all future payroll generation, while their existing payroll history stays intact
- **Attendance tracking** — manual cutoff entry by HR/admin (days worked, absences, late/undertime minutes, overtime)
- **Daily Time Record (DTR)** — a separate, independent self-service time clock. Employees clock themselves in/out (multiple punches per day supported, e.g. for breaks or errands), and can see their own punch history with computed hours worked. Admins get a read-only roster view across all employees. This does **not** replace or feed into the admin-entered Attendance/payroll data — the two systems are intentionally kept separate.
- **Leave management** — employees request vacation/sick/unpaid leave; admins approve/reject; approved leave auto-syncs to attendance and deducts leave credits
- **Payroll engine** — computes Philippine statutory deductions automatically:
  - **SSS** (15% of Monthly Salary Credit, 5% employee / 10% employer + EC)
  - **PhilHealth** (5% flat rate, 2.5%/2.5% split, ₱10,000–₱100,000 base)
  - **Pag-IBIG** (2%/2%, capped at ₱10,000 Maximum Fund Salary)
  - **BIR Withholding Tax** (TRAIN Law graduated table, RA 10963)
  - 13th month pay (PD 851) with the ₱90,000/year tax-exempt cap
- **Payslips** — printable, per-employee, per-cutoff breakdown of earnings/deductions/employer contributions
- **Reports** — government remittance summary (SSS/PhilHealth/Pag-IBIG/BIR totals) for filing prep, exportable to Excel
- **Role-based access** — three tiers: **Super Admin** (everything an Admin can do, plus exclusive access to Audit Trail and Login Logs), **Admin** (full HR/payroll access), and **Employee** (self-service: own attendance, leave requests, payslips, profile)
- **Audit Trail** — every write action across the system (employee changes, payroll runs, leave approvals, password changes, etc.) is logged with who did it, when, from what IP, and a before/after snapshot where relevant. Visible only to Super Admins, at **Audit Trail** in the sidebar.
- **Login Logs** — every login attempt, successful or failed, is recorded with IP address and parsed device/browser/OS. Visible only to Super Admins, at **Login Logs** in the sidebar.

The statutory rates are isolated in **`server/utils/payrollEngine.js`** with comments citing their legal basis, specifically so they're easy to find and update when government agencies issue new circulars.

> ⚠️ **Compliance note:** Rates were verified against current sources as of mid-2026. Before running real payroll, confirm the figures in `payrollEngine.js` against `sss.gov.ph`, `philhealth.gov.ph`, `pagibigfund.gov.ph`, and `bir.gov.ph` — or have your accountant review them. This system is a tool to help compute payroll; it isn't a substitute for professional payroll/tax advice.

---

## Roles in detail

| Role | Can do |
|---|---|
| **Employee** | View own attendance, payslips, leave balance; request leave; edit own contact info and password |
| **Admin** | Everything an Employee can, plus: manage employees, attendance, leave approvals, payroll, reports |
| **Super Admin** | Everything an Admin can, plus: view Audit Trail and Login Logs, and is the only role that can grant or revoke the Super Admin role itself |

The system always keeps at least one Admin/Super Admin and at least one Super Admin — you can't demote or separate the last person in either category, to avoid permanently locking everyone out.

Super Admin accounts never get payroll generated for them, even if explicitly selected — Super Admin is treated as a systems/IT role, not a paid employee position.

---

## Tech stack

- **Nuxt 3** (Vue 3, Nitro server engine) — single codebase for frontend + API
- **MongoDB** + **Mongoose** — data storage
- **JWT** (httpOnly cookie) — session auth, **bcrypt** — password hashing
- **Tailwind CSS** — styling
- **Pinia** — auth state
- **Day.js** — date handling
- **SheetJS (xlsx)** — client-side Excel export for the Reports page

---

## Getting started

### 1. Prerequisites

- Node.js 18+ (20+ recommended)
- A MongoDB database — either:
  - **Local**: install MongoDB Community Server, or run `docker run -d -p 27017:27017 mongo`
  - **Cloud**: a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster (recommended for easy access from anywhere)

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
NUXT_MONGODB_URI=mongodb://localhost:27017/bm_global_payroll
NUXT_JWT_SECRET=generate-a-long-random-string-here
NUXT_PUBLIC_COMPANY_NAME=BM Global Ventures Inc.
```

> **Why `NUXT_`-prefixed names?** Nuxt's `runtimeConfig` only auto-overrides from environment variables that follow the `NUXT_<KEY>` pattern (e.g. `runtimeConfig.mongodbUri` ← `NUXT_MONGODB_URI`). Using an unprefixed name like plain `MONGODB_URI` will silently fail to override the config, and the app will fall back to its localhost default — which shows up as a confusing `ECONNREFUSED ::1:27017` error rather than an obvious "wrong credentials" error. This trips people up constantly when deploying, so the naming is called out here deliberately.

Generate a strong `NUXT_JWT_SECRET` with:
```bash
openssl rand -base64 48
```

### 4. Seed the first accounts

```bash
npm run seed
```

This creates:
- **Super Admin**: `superadmin@bmglobalventures.com` / `ChangeMe123!` — the only account that can see Audit Trail and Login Logs
- **Admin**: `admin@bmglobalventures.com` / `ChangeMe123!`
- **Sample employee**: `juan.delacruz@bmglobalventures.com` / `Welcome123!`

All accounts are forced to change their password on first login. You can promote any existing employee to Admin or Super Admin later from their profile page (only a Super Admin can grant or revoke the Super Admin role).

### 5. Run the dev server

```bash
npm run dev
```

Visit **http://localhost:3000** and sign in with the admin account above.

### 6. Build for production

```bash
npm run build
node .output/server/index.mjs
```

(Set `NUXT_MONGODB_URI`, `NUXT_JWT_SECRET`, and `NUXT_PUBLIC_COMPANY_NAME` as real environment variables on your host — see the DigitalOcean section right below for a concrete walkthrough.)

---

## Deploying to DigitalOcean App Platform

1. Push this repo to GitHub (private recommended — it contains employee data once seeded).
2. In DigitalOcean, go to **Apps** → **Create App** → connect your GitHub repo → select the **main** branch.
3. Keep this as a **single Web Service** component pointing at the repo root (`/`) — don't create separate containers.
4. Set:
   - **Build Command**: `npm run build`
   - **Run Command**: `node .output/server/index.mjs`
   - **HTTP Port**: `3000`
5. Under **Environment Variables**, add (mark the first two as **Encrypted**):
   - `NUXT_MONGODB_URI` — your Atlas connection string
   - `NUXT_JWT_SECRET` — your generated secret
   - `NUXT_PUBLIC_COMPANY_NAME` — `BM Global Ventures Inc.`

   **Use the `NUXT_` prefix here, not plain `MONGODB_URI`/`JWT_SECRET`.** Nuxt's `runtimeConfig` only auto-overrides from `NUXT_<KEY>`-prefixed environment variables; an unprefixed name silently fails to override the config, and the app falls back to a `localhost` MongoDB URI baked in at build time — which surfaces as a confusing `MongooseServerSelectionError: connect ECONNREFUSED ::1:27017` in the runtime logs rather than an obvious credentials error.
6. In MongoDB Atlas → **Network Access**, allow connections from `0.0.0.0/0`. DigitalOcean App Platform doesn't expose fixed outbound IPs on the basic tiers, so per-IP allowlisting isn't practical here — your database still requires the correct username/password regardless of which IP connects, so this doesn't weaken auth.
7. Deploy. If you added or changed environment variables after the first deploy, trigger a manual redeploy — App Platform doesn't always pick up env var changes automatically on an already-running deployment.

---

## Using the system

### As an admin (HR)

1. **Add employees** — Employees → Add Employee. Set their basic salary, pay frequency, and department. A temporary password is generated; share it with the employee securely.
2. **Record attendance per cutoff** — Attendance → select employee + date range → mark present/absent/leave/etc. for each day, plus late minutes, undertime, and overtime hours.
3. **Approve leave requests** — Leaves → approve or reject pending requests. Approved leave automatically updates attendance and deducts leave credits.
4. **Manually adjust leave balances when needed** — Employees → select an employee → "Leave Balances" card. Use this for corrections, granting extra days, prorating a new hire, or an annual reset. Logged separately in the Audit Trail (Super Admin only) from regular profile edits.
5. **Generate payroll** — Payroll → Generate Payroll → choose the cutoff dates and pay date → the system computes every active employee's payslip as a **draft**.
6. **Review, finalize, and mark as paid** — open each payslip, or use the run-level finalize action, to move drafts to `finalized` then `paid`. Employees can only see `finalized`/`paid` payslips, never drafts.
7. **Cancel a payroll record if needed** — any record (draft, finalized, or even paid) can be cancelled from its detail page, or directly from the list for drafts. Cancelling never deletes the record — it's marked `cancelled` and kept for audit history, with who cancelled it, when, and why. Cancelled records drop out of employee views and report totals, and the same pay period becomes available to regenerate. Cancelling a `paid` record does **not** reverse any real bank transfer — that has to be handled separately outside the app.
8. **Pull reports** — Reports → set a date range → see SSS/PhilHealth/Pag-IBIG/BIR totals for remittance filing, plus a per-employee breakdown.

### As an employee

- **Dashboard** — leave balances and latest payslip at a glance
- **Attendance** — view your own attendance history (read-only)
- **Leaves** — request vacation/sick/unpaid leave
- **Payroll** — view and print your payslips
- **Profile** — update contact info and bank details, change your password

---

## Project structure

```
server/
  models/          Mongoose schemas (Employee, Attendance, LeaveRequest, PayrollRecord)
  utils/
    payrollEngine.js   ← Core PH statutory payroll calculations (start here for rate updates)
    auth.js             JWT session helpers (requireAuth, requireAdmin)
    db.js               Cached MongoDB connection
  api/             Nitro API routes (REST endpoints, organized by resource)
  scripts/seed.mjs Bootstrap script for the first admin account

pages/             Nuxt pages (file-based routing)
components/        Reusable UI (ui/) and layout (layout/) components
composables/       useAuthStore (Pinia), useCurrency
middleware/        Global auth guard (auth.global.js)
```

## Updating statutory rates

All rate constants live at the top of `server/utils/payrollEngine.js`, grouped by agency (SSS, PhilHealth, Pag-IBIG, BIR) with the legal citation in the comments. When a new circular is issued:

1. Update the relevant constants (e.g. `SSS_MAX_MSC`, `PHILHEALTH_RATE`, `MONTHLY_TAX_BRACKETS`).
2. The change applies to all **future** payroll runs immediately — already-finalized payslips keep their original computed values (each `PayrollRecord` stores a full snapshot, not just a reference).

## Security notes

- Passwords are hashed with bcrypt; never stored in plain text.
- Sessions use httpOnly, sameSite cookies — not accessible to client-side JS.
- Employees can only view/edit their own records; admin-only routes are enforced server-side, not just hidden in the UI.
- Change `NUXT_JWT_SECRET` to a strong, unique value before any real deployment.
