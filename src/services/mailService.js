const nodemailer = require("nodemailer");

const accountSetupTemplate = require("../templates/accountSetupTemplate");
const passwordResetTemplate = require("../templates/passwordResetTemplate");
const enrollmentTemplate = require("../templates/enrollmentTemplate");

// REQUIRED ENV VARS (set these on Render):
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
//   SMTP_SECURE=true            (true for port 465, false for 587/other)
//   MAIL_FROM="WHY We Help  <no-reply@yourdomain.com>"
//   FRONTEND_URL=https://your-frontend-domain.com   (used to build links)
//
// Any standard SMTP provider works here — Gmail (with an App Password),
// SendGrid's SMTP relay, Mailgun, Zoho, etc. Swap the transport config below
// if you'd rather use a provider's HTTP API instead of SMTP.
//
// NOTE: `npm install nodemailer` is required if it isn't already a dependency.

let transporter;

/** Single reusable transporter instance, created lazily on first use. */
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

async function verifyMailServer() {
  try {
    await getTransporter().verify();
    console.log("✅ SMTP server connected successfully.");
  } catch (error) {
    console.error("❌ SMTP connection failed.");
    console.error(error.message);
  }
}

/**
 * Internal helper — every public send* function funnels through here so
 * transporter usage, the "from" address, and error logging stay in one
 * place. Errors are logged and re-thrown (never crash the process); it's
 * up to the caller (controller) to decide whether a failed email should
 * affect the API response — normally it shouldn't, since email is sent
 * only after the main operation already succeeded.
 */
async function dispatchMail({ to, subject, html }) {
  try {
    await getTransporter().sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error(`❌ Failed to send email ("${subject}") to ${to}:`, error.message);
    throw error;
  }
}

/**
 * Sent when an admin creates a student account, or resends a setup link to
 * one that never got its password set. Never send the password itself —
 * only a token-based link. Uses the existing account-setup token mechanism
 * (src/utils/accountSetupToken.js): pass in the raw token it returns.
 */
async function sendAccountSetupEmail({ to, fullName, rawToken }) {
  const setupUrl = `${process.env.FRONTEND_URL}/learn/set-password?token=${rawToken}`;
  const { subject, html } = accountSetupTemplate({ fullName, setupUrl });
  await dispatchMail({ to, subject, html });
}

/**
 * Sent when an admin resets a student's password. Reuses the same
 * account-setup token mechanism (purpose: "reset_password") and the same
 * template styling as the account-setup email.
 */
async function sendPasswordResetEmail({ to, fullName, rawToken }) {
  const resetUrl = `${process.env.FRONTEND_URL}/learn/set-password?token=${rawToken}`;
  const { subject, html } = passwordResetTemplate({ fullName, resetUrl });
  await dispatchMail({ to, subject, html });
}

/**
 * Sent when a student is enrolled in a training/course.
 */
async function sendEnrollmentEmail({ to, fullName, courseName }) {
  const loginUrl = `${process.env.FRONTEND_URL}/learn/login`;
  const { subject, html } = enrollmentTemplate({ fullName, courseName, loginUrl });
  await dispatchMail({ to, subject, html });
}

// To add a new email type later (certificate issued, reminders,
// announcements, etc.): add a templates/xTemplate.js that returns
// { subject, html }, then export a small sendXEmail() here that builds
// the right URL/context and calls dispatchMail(). Every send* function
// follows this same three-line shape.

module.exports = {
  verifyMailServer,
  sendAccountSetupEmail,
  sendPasswordResetEmail,
  sendEnrollmentEmail,
};
