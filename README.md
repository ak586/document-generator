# MPharma Document Portal

Student submission portal + admin review + PDF generation from HTML templates.

## Finalized Architecture

- Frontend + backend: Next.js (single codebase)
- Database: Local PostgreSQL
- File storage: Local `public/generated` folder
- PDF generation: Puppeteer + Chromium from HTML template
- Hosting: local server (current setup)

## Core Flows

1. Student submits details + selects requested document type.
2. Admin reviews application and approves/rejects.
3. On approval, admin triggers PDF generation from selected HTML template.
4. PDF is saved in `public/generated` and linked to application.

## Local Setup

1. Install dependencies:
```bash
npm install
```
2. Create `.env.local`:
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_AUTH_SECRET=replace-with-long-random-secret
ADMIN_JWT_SECRET=replace-with-long-random-jwt-secret
```
3. Run SQL schema from [supabase/schema.sql](/Users/aky03/Documents/New%20project/supabase/schema.sql).
4. Start app:
```bash
npm run dev
```

## Next Build Steps

- Add local auth (student/admin roles).
- Add secure admin middleware.
- Add signature/stamp image support in templates.
- Add audit logs and email notifications.

## Admin Access

- Admin login page: `/admin/login`
- Admin panel: `/admin` (protected)
- Admin APIs under `/api/admin/*` are protected by JWT session cookie middleware.
