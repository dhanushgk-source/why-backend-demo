const { renderEmailLayout } = require("./emailLayout");

/**
 * Welcome email sent when an admin creates a student account.
 * Never include the password here — only the token-based set-password link.
 */
function accountSetupTemplate({ fullName, setupUrl }) {
  const subject = "Set up your learning portal account";

  const html = renderEmailLayout({
    heading: `Welcome, ${fullName || "there"}!`,
    bodyHtml: `An account has been created for you on the WHY We Help learning portal. Click below to choose your password and get started.`,
    ctaLabel: "Set your password",
    ctaUrl: setupUrl,
    footerNote: "This link expires in 48 hours. If you didn't expect this email, you can safely ignore it.",
  });

  return { subject, html };
}

module.exports = accountSetupTemplate;
