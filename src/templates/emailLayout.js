// Shared responsive HTML shell for all outgoing emails.
// Every template below renders its body/CTA into this same layout so
// branding (WHY We Help, colors, spacing) stays consistent in one place.

const BRAND_NAVY = "#2F4A7D";
const BRAND_TEAL = "#52B5BD";

/**
 * @param {Object} opts
 * @param {string} opts.heading   Main heading shown in the card
 * @param {string} opts.bodyHtml  Inner HTML for the message body (already escaped by caller)
 * @param {string} opts.ctaLabel  Button text
 * @param {string} opts.ctaUrl    Button link
 * @param {string} [opts.footerNote] Optional small-print line under the button
 */
function renderEmailLayout({ heading, bodyHtml, ctaLabel, ctaUrl, footerNote }) {
  return `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background:#F8FAFB; padding:32px 16px;">
    <div style="max-width:480px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="background:${BRAND_NAVY}; padding:24px 32px;">
        <span style="color:#ffffff; font-size:18px; font-weight:700;">WHY We Help</span>
      </div>
      <div style="padding:32px;">
        <h2 style="color:${BRAND_NAVY}; font-size:20px; margin:0 0 16px;">${heading}</h2>
        <div style="color:#4B5563; font-size:14px; line-height:1.6; margin-bottom:28px;">
          ${bodyHtml}
        </div>
        <a href="${ctaUrl}"
           style="display:inline-block; background:${BRAND_TEAL}; color:#ffffff; text-decoration:none;
                  font-weight:600; font-size:14px; padding:12px 28px; border-radius:10px;">
          ${ctaLabel}
        </a>
        <p style="color:#9CA3AF; font-size:12px; margin-top:24px;">
          ${footerNote || "If you didn't expect this email, you can safely ignore it."}
        </p>
      </div>
    </div>
  </div>`;
}

module.exports = { renderEmailLayout, BRAND_NAVY, BRAND_TEAL };
