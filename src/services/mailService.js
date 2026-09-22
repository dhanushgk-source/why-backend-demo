const nodemailer = require("nodemailer");

const accountSetupTemplate = require("../templates/accountSetupTemplate");
const passwordResetTemplate = require("../templates/passwordResetTemplate");
const enrollmentTemplate = require("../templates/enrollmentTemplate");

/**
 * Parses sender name and email from MAIL_FROM or RESEND_FROM e.g. "WHY - We Help You <techadmin@thewhyservices.com>"
 */
function getSenderDetails() {
  const defaultSenderEmail = process.env.MAIL_FROM_EMAIL || "techadmin@thewhyservices.com";
  const defaultSenderName = process.env.MAIL_FROM_NAME || "WHY - We Help You";

  const rawMailFrom = (process.env.MAIL_FROM || process.env.RESEND_FROM || "").trim();
  if (!rawMailFrom) {
    return { name: defaultSenderName, email: defaultSenderEmail };
  }

  const match = rawMailFrom.match(/^(?:"?([^"]*)"?\s)?<([^>]+)>$/);
  if (match) {
    return { name: match[1]?.trim() || defaultSenderName, email: match[2]?.trim() };
  }

  if (rawMailFrom.includes("@")) {
    return { name: defaultSenderName, email: rawMailFrom.replace(/^["']|["']$/g, "") };
  }

  return { name: defaultSenderName, email: defaultSenderEmail };
}

/**
 * Sends email directly using Resend's REST API (https://api.resend.com/emails).
 * High deliverability, zero SMTP port blocking, fast and modern.
 */
async function dispatchResendApi({ to, subject, html }) {
  const apiKey = (process.env.RESEND_API_KEY || (process.env.SMTP_PASS?.startsWith('re_') ? process.env.SMTP_PASS : '') || "").trim().replace(/^["']|["']$/g, "");
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set. Please add RESEND_API_KEY in backend environment variables.");
  }

  const sender = getSenderDetails();
  const from = process.env.RESEND_FROM || process.env.MAIL_FROM || `${sender.name} <${sender.email}>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    if (response.status === 401) {
      throw new Error(`Resend 401 Unauthorized: Invalid RESEND_API_KEY. Generate a key at resend.com/api-keys.`);
    }
    throw new Error(`Resend API Error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  console.log(`✅ Resend email ("${subject}") sent to ${to} (ID: ${data.id || "ok"})`);
  return data;
}

/**
 * Sends email directly using Brevo's REST API v3
 */
async function dispatchBrevoApi({ to, subject, html }) {
  const apiKey = (process.env.BREVO_API_KEY || "").trim().replace(/^["']|["']$/g, "");
  const sender = getSenderDetails();

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
      throw new Error(`Brevo 401 Unauthorized: Invalid BREVO_API_KEY.`);
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
    from: process.env.MAIL_FROM || "WHY - We Help You <techadmin@thewhyservices.com>",
    to,
    subject,
    html,
  });
  console.log(`✅ Brevo SMTP email ("${subject}") sent to ${to}`);
}

let transporter;
function getTransporter() {
  if (!transporter) {
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = Number(process.env.SMTP_PORT || 465);
    const isSecure = process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE === "true" : port === 465;

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
    });
  }
  return transporter;
}

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
      personalizations: [{ to: [{ email: to }] }],
      from: { email: sender.email, name: sender.name },
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`SendGrid API Error (${response.status}): ${errorBody}`);
  }

  console.log(`✅ SendGrid API email ("${subject}") sent to ${to}`);
}

async function verifyMailServer() {
  if (process.env.RESEND_API_KEY) {
    console.log("✅ Resend API Key detected.");
    return;
  }
  if (process.env.SENDGRID_API_KEY) {
    console.log("✅ SendGrid API Key detected.");
    return;
  }
  if (process.env.BREVO_API_KEY) {
    console.log("✅ Brevo API Key detected.");
    return;
  }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("ℹ️ Mail service unconfigured locally (RESEND_API_KEY or SMTP credentials not set in .env).");
    return;
  }
  try {
    await getTransporter().verify();
    console.log("✅ SMTP server connected successfully.");
  } catch (error) {
    console.error("⚠️ SMTP connection warning:", error.message);
  }
}

/**
 * Main email dispatcher.
 * Priority: 1. Resend API -> 2. SendGrid API -> 3. Brevo API -> 4. SMTP Fallback
 */
async function dispatchMail({ to, subject, html }) {
  const resendKey = process.env.RESEND_API_KEY || (process.env.SMTP_PASS?.startsWith('re_') ? process.env.SMTP_PASS : '');
  const hasResend = Boolean(
    (resendKey && resendKey.trim()) ||
    (process.env.SMTP_HOST && process.env.SMTP_HOST.includes('resend'))
  );
  const hasSendGrid = Boolean(process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.trim());
  const hasBrevo = Boolean(process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim());
  const hasSmtp = Boolean(process.env.SMTP_USER && process.env.SMTP_USER.trim() && process.env.SMTP_PASS);

  if (!hasResend && !hasSendGrid && !hasBrevo && !hasSmtp) {
    console.log(`ℹ️ [SIMULATED MAIL DISPATCH] To: ${to} | Subject: "${subject}"`);
    return;
  }

  try {
    if (hasResend) {
      await dispatchResendApi({ to, subject, html });
    } else if (hasSendGrid) {
      await dispatchSendGridApi({ to, subject, html });
    } else if (hasBrevo) {
      await dispatchBrevoApi({ to, subject, html });
    } else if (hasSmtp) {
      await getTransporter().sendMail({
        from: process.env.MAIL_FROM || "WHY - We Help You <techadmin@thewhyservices.com>",
        to,
        subject,
        html,
      });
      console.log(`✅ SMTP email ("${subject}") sent to ${to}`);
    }
  } catch (error) {
    console.error(`❌ Failed to send email ("${subject}") to ${to}:`, error.message);
    throw new Error(`Email dispatch failed (${error.message}). Please check RESEND_API_KEY or mail credentials.`);
  }
}

/**
 * Sent when an admin creates a student account, or resends a setup link to
 * one that never got its password set.
 */
async function sendAccountSetupEmail({ to, fullName, rawToken }) {
  const setupUrl = `${process.env.FRONTEND_URL}/learn/set-password?token=${rawToken}`;
  const { subject, html } = accountSetupTemplate({ fullName, setupUrl });
  await dispatchMail({ to, subject, html });
}

/**
 * Sent when an admin resets a student's password.
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
const { newsletterTemplate, customBroadcastTemplate } = require("../templates/newsletterTemplate");

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

/**
 * Sent when a user subscribes to the newsletter.
 */
async function sendNewsletterWelcomeEmail({ to, name }) {
  const { subject, html } = newsletterTemplate({ name, email: to });
  await dispatchMail({ to, subject, html });
}

/**
 * Sent when an admin broadcasts a custom newsletter to all or selected subscribers.
 */
async function sendCustomNewsletterEmail({ to, name, subject, preheader, heading, headerTagline, content, ctaLabel, ctaUrl }) {
  const { subject: mailSubject, html } = customBroadcastTemplate({
    name,
    email: to,
    subject,
    preheader,
    heading,
    headerTagline,
    content,
    ctaLabel,
    ctaUrl,
  });
  await dispatchMail({ to, subject: mailSubject, html });
}

module.exports = {
  verifyMailServer,
  sendAccountSetupEmail,
  sendPasswordResetEmail,
  sendEnrollmentEmail,
  sendCertificateEmail,
  sendAdminInviteEmail,
  sendNewsletterWelcomeEmail,
  sendCustomNewsletterEmail,
};