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

/**
  * Parses sender name and email from MAIL_FROM e.g. "WHY We Help <no-reply@whycare.com>"
  */
function getSenderDetails() {
  const defaultSenderEmail = process.env.MAIL_FROM_EMAIL || "techadmin@thewhyservices.com";
  const defaultSenderName = process.env.MAIL_FROM_NAME || "WHY We Help";

  const rawMailFrom = (process.env.MAIL_FROM || "").trim();
  if (!rawMailFrom) {
    return { name: defaultSenderName, email: defaultSenderEmail };
  }

  const match = rawMailFrom.match(/^(?:"?([^"]*)"?\s)?<([^>]+)>$/);
  if (match) {
    return { name: match[1]?.trim() || defaultSenderName, email: match[2]?.trim() };
  }

  // If MAIL_FROM is just a plain email address e.g. "techadmin@thewhyservices.com"
  if (rawMailFrom.includes("@")) {
    return { name: defaultSenderName, email: rawMailFrom.replace(/^["']|["']$/g, "") };
  }

  return { name: defaultSenderName, email: defaultSenderEmail };
}

/**
 * Sends email directly using Brevo's REST API v3 (https://api.brevo.com/v3/smtp/email).
 * Bypasses SMTP port blocking entirely for maximum speed & reliability on cloud hosts like Render.
 */
async function dispatchBrevoApi({ to, subject, html }) {
  const apiKey = (process.env.BREVO_API_KEY || "").trim().replace(/^["']|["']$/g, "");
  const sender = getSenderDetails();

  // If the key is an SMTP key (starts with xsmtpsib-), use SMTP transport instead of REST API
  if (apiKey.startsWith("xsmtpsib-")) {
    console.log("ℹ️ Detected Brevo SMTP key. Routing via Brevo SMTP relay...");
    return dispatchBrevoSmtp({ to, subject, html, smtpKey: apiKey });
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    if (response.status === 401) {
      throw new Error(`Brevo 401 Unauthorized: The BREVO_API_KEY is invalid or expired. Please generate a new API key from Brevo -> Settings -> SMTP & API -> API Keys tab (starts with xkeysib-).`);
    }
    throw new Error(`Brevo API Error (${response.status}): ${errorBody}`);
  }

  console.log(`✅ Brevo API email ("${subject}") sent to ${to}`);
}

async function dispatchBrevoSmtp({ to, subject, html, smtpKey }) {
  const host = process.env.SMTP_HOST || "smtp-relay.brevo.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || "b401d3001@smtp-brevo.com";

  const smtpTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass: smtpKey || process.env.SMTP_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 8000,
    socketTimeout: 15000,
  });

  await smtpTransporter.sendMail({
    from: process.env.MAIL_FROM || "WHY We Help <techadmin@thewhyservices.com>",
    to,
    subject,
    html,
  });
  console.log(`✅ Brevo SMTP email ("${subject}") sent to ${to}`);
}

/** Single reusable transporter instance for Brevo / standard SMTP fallback. */
let transporter;
function getTransporter() {
  if (!transporter) {
    const host = process.env.SMTP_HOST || "smtp-relay.brevo.com";
    const port = Number(process.env.SMTP_PORT || 587);
    const isSecure = process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE === "true" : port === 465;

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS || process.env.BREVO_SMTP_KEY,
      },
      connectionTimeout: 10000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
    });
  }
  return transporter;
}

/**
 * Sends email directly using SendGrid's REST API v3 (https://api.sendgrid.com/v3/mail/send).
 */
async function dispatchSendGridApi({ to, subject, html }) {
  const apiKey = (process.env.SENDGRID_API_KEY || "").trim().replace(/^["']|["']$/g, "");
  const sender = getSenderDetails();

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: to }],
        },
      ],
      from: { email: sender.email, name: sender.name },
      subject,
      content: [
        {
          type: "text/html",
          value: html,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`SendGrid API Error (${response.status}): ${errorBody}`);
  }

  console.log(`✅ SendGrid API email ("${subject}") sent to ${to}`);
}

async function verifyMailServer() {
  if (process.env.SENDGRID_API_KEY) {
    console.log("✅ SendGrid API Key detected.");
    return;
  }
  if (process.env.BREVO_API_KEY) {
    console.log("✅ Brevo API Key detected.");
    return;
  }
  try {
    await getTransporter().verify();
    console.log("✅ SMTP server connected successfully.");
  } catch (error) {
    console.error("❌ SMTP connection failed.");
    console.error(error.message);
  }
}

/**
 * Dispatches mail via SendGrid HTTP API, Brevo HTTP API, or SMTP fallback.
 */
async function dispatchMail({ to, subject, html }) {
  try {
    if (process.env.SENDGRID_API_KEY) {
      await dispatchSendGridApi({ to, subject, html });
    } else if (process.env.BREVO_API_KEY) {
      await dispatchBrevoApi({ to, subject, html });
    } else {
      await getTransporter().sendMail({
        from: process.env.MAIL_FROM || "WHY We Help <techadmin@thewhyservices.com>",
        to,
        subject,
        html,
      });
      console.log(`✅ SMTP email ("${subject}") sent to ${to}`);
    }
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

const certificateTemplate = require("../templates/certificateTemplate");
const adminInviteTemplate = require("../templates/adminInviteTemplate");

/**
 * Sent when a student completes all lessons in a training course.
 */
async function sendCertificateEmail({ to, fullName, courseName, certificateId, certificateNumber }) {
  const certificateUrl = `${process.env.FRONTEND_URL}/learn/certificate/${certificateId}`;
  const { subject, html } = certificateTemplate({ fullName, courseName, certificateUrl, certificateNumber });
  await dispatchMail({ to, subject, html });
}

/**
 * Sent when a Super Admin invites a new admin user to the console.
 */
async function sendAdminInviteEmail({ to, fullName, roleName, rawToken }) {
  const adminFrontendUrl = process.env.ADMIN_FRONTEND_URL || "https://why-website-admin-panel.vercel.app";
  const setupUrl = `${adminFrontendUrl}/set-password?token=${rawToken}`;
  const { subject, html } = adminInviteTemplate({ fullName, roleName, setupUrl });
  await dispatchMail({ to, subject, html });
}

module.exports = {
  verifyMailServer,
  sendAccountSetupEmail,
  sendPasswordResetEmail,
  sendEnrollmentEmail,
  sendCertificateEmail,
  sendAdminInviteEmail,
};