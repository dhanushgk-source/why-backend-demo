const { renderEmailLayout } = require("./emailLayout");

/**
 * Sent when an admin resets a student's password.
 * Never include the password here — only the token-based reset link.
 */
function passwordResetTemplate({ fullName, resetUrl }) {
  const subject = "Reset your learning portal password";

  const html = renderEmailLayout({
    heading: "Reset your password",
    bodyHtml: `Hi ${fullName || "there"}, an administrator has reset your learning portal password. Click below to set a new one.`,
    ctaLabel: "Set a new password",
    ctaUrl: resetUrl,
    footerNote: "This link expires in 48 hours. If you didn't expect this email, you can safely ignore it.",
  });

  return { subject, html };
}

module.exports = passwordResetTemplate;
