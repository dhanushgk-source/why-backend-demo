const { renderEmailLayout } = require("./emailLayout");

module.exports = function adminInviteTemplate({ fullName, roleName, setupUrl }) {
  const subject = "Invitation to WHY Care Operations Console";

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">
      You have been invited to join the <strong>WHY Care Operations Console</strong> as an administrator with the role of <strong>${roleName || "Admin"}</strong>.
    </p>
    <p style="margin: 0 0 16px 0;">
      To set up your account password and access your dashboard, please click the button below:
    </p>
  `;

  const html = renderEmailLayout({
    heading: `Welcome to the Team, ${fullName || "there"}!`,
    bodyHtml,
    ctaLabel: "Set Up Password & Access Console",
    ctaUrl: setupUrl,
    footerNote: "This secure link will expire in 48 hours. If you did not expect this invitation, please contact your Super Admin.",
  });

  return { subject, html };
};
