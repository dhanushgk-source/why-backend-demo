const { renderEmailLayout } = require("./emailLayout");

/**
 * Sent when a student is enrolled in a training/course.
 */
function enrollmentTemplate({ fullName, courseName, loginUrl }) {
  const subject = `You've been enrolled in ${courseName}`;

  const html = renderEmailLayout({
    heading: `You're enrolled, ${fullName || "there"}!`,
    bodyHtml: `You've been enrolled in <strong>${courseName}</strong> on the WHY We Help learning portal. Log in to your account to start learning.`,
    ctaLabel: "Go to login",
    ctaUrl: loginUrl,
    footerNote: "If you weren't expecting this enrollment, contact your administrator.",
  });

  return { subject, html };
}

module.exports = enrollmentTemplate;
