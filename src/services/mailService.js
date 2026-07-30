const nodemailer = require("nodemailer");

// REQUIRED ENV VARS (set these on Render):
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
//   SMTP_SECURE=true            (true for port 465, false for 587/other)
//   MAIL_FROM="WHY We Help  <no-reply@yourdomain.com>"
//   FRONTEND_URL=https://your-frontend-domain.com   (used to build the link)
//
// Any standard SMTP provider works here — Gmail (with an App Password),
// SendGrid's SMTP relay, Mailgun, Zoho, etc. Swap the transport config below
// if you'd rather use a provider's HTTP API instead of SMTP.
//
// NOTE: `npm install nodemailer` is required — it isn't in this project yet.

let transporter;
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

function baseTemplate({ heading, bodyHtml, ctaLabel, ctaUrl }) {
  return `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background:#F8FAFB; padding:32px 16px;">
    <div style="max-width:480px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="background:#2F4A7D; padding:24px 32px;">
        <span style="color:#ffffff; font-size:18px; font-weight:700;">WHY We Help</span>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#2F4A7D; font-size:20px; margin:0 0 16px;">${heading}</h2>
        <div style="color:#4B5563; font-size:14px; line-height:1.6; margin-bottom:28px;">
          ${bodyHtml}
        </div>
        <a href="${ctaUrl}"
           style="display:inline-block; background:#52B5BD; color:#ffffff; text-decoration:none;
                  font-weight:600; font-size:14px; padding:12px 28px; border-radius:10px;">
          ${ctaLabel}
        </a>
        <p style="color:#9CA3AF; font-size:12px; margin-top:24px;">
          This link expires in 48 hours. If you didn't expect this email, you can safely ignore it.
        </p>
      </div>
    </div>
  </div>`;
}

/**
 * Sent when an admin creates a student account, or resends a setup link to
 * one that never got its password set.
 */
async function sendAccountSetupEmail({ to, fullName, rawToken }) {
  const link = `${process.env.FRONTEND_URL}/learn/set-password?token=${rawToken}`;
  const html = baseTemplate({
    heading: `Welcome, ${fullName || "there"}!`,
    bodyHtml: `An account has been created for you on the WHY We Help learning portal. Click below to choose your password and get started.`,
    ctaLabel: "Set your password",
    ctaUrl: link,
  });

  await getTransporter().sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: "Set up your learning portal account",
    html,
  });
}

/** Sent when an admin resets a student's password. */
async function sendPasswordResetEmail({ to, fullName, rawToken }) {
  const link = `${process.env.FRONTEND_URL}/learn/set-password?token=${rawToken}`;
  const html = baseTemplate({
    heading: `Reset your password`,
    bodyHtml: `Hi ${fullName || "there"}, an administrator has reset your learning portal password. Click below to set a new one.`,
    ctaLabel: "Set a new password",
    ctaUrl: link,
  });

  await getTransporter().sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: "Reset your learning portal password",
    html,
  });
}

module.exports = { sendAccountSetupEmail, sendPasswordResetEmail };
