# This round's changes — student self-signup + email-based password setup

## FRONTEND (drop into src/ at the same paths)
- src/services/authService.js   — EDITED: added registerStudent(), setPassword()
- src/pages/learn/LearnRegister.jsx — EDITED: now calls registerStudent instead of registerUser
- src/pages/learn/SetPassword.jsx   — NEW: the page an emailed link lands on
- src/App.jsx                       — EDITED: added the /learn/set-password route

## BACKEND (drop into src/ at the same paths)
- src/migrations/004_account_setup_tokens.sql — NEW: run this migration
- src/utils/accountSetupToken.js               — NEW: token create/verify/consume helpers
- src/services/mailService.js                  — NEW: nodemailer wrapper + email templates
- src/controllers/authController.js            — EDITED: added registerStudent, setPassword
- src/routes/authRoutes.js                      — EDITED: added /register-student, /set-password
- src/controllers/studentController.js          — EDITED: createStudent + resetStudentPassword
                                                   now send real emails instead of console.log;
                                                   added resendSetupEmail
- src/routes/adminRoutes.js                     — EDITED: added POST /students/:id/resend-setup-email

## Required before this works
1. `npm install nodemailer` in the backend
2. Run the migration: `psql $DATABASE_URL -f src/migrations/004_account_setup_tokens.sql`
3. Set these env vars on Render (backend):
   SMTP_HOST=...
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=...
   SMTP_PASS=...
   MAIL_FROM="WHY We Help <no-reply@yourdomain.com>"
   FRONTEND_URL=https://your-frontend-domain.com   (used to build the emailed link)

## What this does NOT include yet
- No UI button in the admin panel for "Resend setup email" — the backend route exists
  (POST /api/admin/students/:id/resend-setup-email), but I don't have your admin panel's
  source code to wire the button in. Upload it and I'll add it.
- Self-registered students get no email verification step — they can log in immediately
  with the password they chose. If you want an email-confirmation step for self-signup
  too, let me know and I'll add it using the same token mechanism.
