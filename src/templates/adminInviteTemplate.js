const emailLayout = require("./emailLayout");

module.exports = function adminInviteTemplate({ fullName, roleName, setupUrl }) {
  const subject = "Invitation to WHY Care Operations Console";

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 700;">
      Welcome to the Team, ${fullName}!
    </h2>

    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
      You have been invited to join the <strong>WHY Care Operations Console</strong> as an administrator with the role of <strong>${roleName}</strong>.
    </p>

    <p style="margin: 0 0 24px 0; color: #374151; font-size: 15px; line-height: 1.6;">
      To set up your account password and access your dashboard, please click the button below:
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${setupUrl}"
         style="background-color: #0D9488; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
        Set Up Your Password & Access Console
      </a>
    </div>

    <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
      Or copy and paste this link into your browser:<br>
      <a href="${setupUrl}" style="color: #0D9488; word-break: break-all;">${setupUrl}</a>
    </p>

    <p style="margin: 16px 0 0 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
      This secure link will expire in 48 hours. If you did not expect this invitation, please contact your Super Admin.
    </p>
  `;

  return {
    subject,
    html: emailLayout({ content }),
  };
};
