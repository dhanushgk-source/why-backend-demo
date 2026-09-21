const BRAND_NAVY = "#0b1329";
const BRAND_TEAL = "#52B5BD";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://thewhyservices.com";

const SOCIAL_LINKS = {
  linkedin: "https://www.linkedin.com/company/why-companion-services/",
  youtube: "https://youtube.com/@whyservicesofficial?si=34EsY37BgjsC1TZB",
  instagram: "https://www.instagram.com/why.services?igsh=czR0eDViMnhtN2dw",
  facebook: "https://www.facebook.com/share/1Dij6aGamA/",
  whatsapp: "https://api.whatsapp.com/send/?phone=919090254343&text=Hello%21+Can+I+get+more+info+on+this?&type=phone_number&app_absent=0",
  twitter: "https://x.com/thewhyservices",
};

function newsletterTemplate({ name, email }) {
  const subject = "Welcome to WHY - Your Trusted Companion Insights";

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(11,19,41,0.08); border: 1px solid #e2e8f0;">
            
            <!-- HEADER -->
            <tr>
              <td style="background: linear-gradient(135deg, #070e1e 0%, #0b1329 60%, #131f37 100%); padding: 32px 40px; text-align: left;">
                <table width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td>
                      <span style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">WHY <span style="color: ${BRAND_TEAL};">- We Help You</span></span>
                      <div style="font-size: 12px; color: rgba(255,255,255,0.75); margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;">YOUR TRUSTED COMPANION</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- BODY -->
            <tr>
              <td style="padding: 40px;">
                <h1 style="font-size: 22px; font-weight: 800; color: ${BRAND_NAVY}; margin: 0 0 16px 0; line-height: 1.3;">
                  Welcome to WHY - Your Trusted Companion, ${name || "Valued Subscriber"}
                </h1>
                <p style="font-size: 15px; color: #475569; line-height: 1.65; margin: 0 0 20px 0;">
                  Thank you for subscribing to <strong>WHY - We Help You</strong>. You are now connected to receive curated updates on dependable companion assistance, hospital navigation guides, travel support, and official company announcements.
                </p>

                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0;">
                  <tr>
                    <td align="center" style="border-radius: 12px; background: linear-gradient(135deg, #52B5BD 0%, #2F4A7D 100%);">
                      <a href="${FRONTEND_URL}/blog" target="_blank" style="font-size: 15px; font-weight: 800; color: #ffffff; text-decoration: none; padding: 14px 32px; display: inline-block; border-radius: 12px;">
                        Explore WHY Insights
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- SOCIAL MEDIA FOOTER -->
            <tr>
              <td style="background-color: #f8fafc; padding: 28px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
                <div style="font-size: 13px; font-weight: 700; color: #0b1329; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Follow Us & Stay Connected</div>
                
                <!-- SOCIAL ICONS TABLE -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto 18px auto;">
                  <tr>
                    <td style="padding: 0 8px;">
                      <a href="${SOCIAL_LINKS.linkedin}" target="_blank" style="text-decoration: none;">
                        <img src="https://img.icons8.com/color/48/linkedin.png" width="30" height="30" alt="LinkedIn" style="display: block; border: 0; outline: none;" />
                      </a>
                    </td>
                    <td style="padding: 0 8px;">
                      <a href="${SOCIAL_LINKS.youtube}" target="_blank" style="text-decoration: none;">
                        <img src="https://img.icons8.com/color/48/youtube-play.png" width="30" height="30" alt="YouTube" style="display: block; border: 0; outline: none;" />
                      </a>
                    </td>
                    <td style="padding: 0 8px;">
                      <a href="${SOCIAL_LINKS.instagram}" target="_blank" style="text-decoration: none;">
                        <img src="https://img.icons8.com/color/48/instagram-new.png" width="30" height="30" alt="Instagram" style="display: block; border: 0; outline: none;" />
                      </a>
                    </td>
                    <td style="padding: 0 8px;">
                      <a href="${SOCIAL_LINKS.facebook}" target="_blank" style="text-decoration: none;">
                        <img src="https://img.icons8.com/color/48/facebook-new.png" width="30" height="30" alt="Facebook" style="display: block; border: 0; outline: none;" />
                      </a>
                    </td>
                    <td style="padding: 0 8px;">
                      <a href="${SOCIAL_LINKS.whatsapp}" target="_blank" style="text-decoration: none;">
                        <img src="https://img.icons8.com/color/48/whatsapp.png" width="30" height="30" alt="WhatsApp" style="display: block; border: 0; outline: none;" />
                      </a>
                    </td>
                  </tr>
                </table>

                <div style="font-size: 12px; color: #64748b; margin-bottom: 12px;">
                  <a href="${FRONTEND_URL}/terms-user" style="color: #52B5BD; text-decoration: none; font-weight: 600;">Terms & Conditions</a> &bull; 
                  <a href="${FRONTEND_URL}/privacy-policy-user" style="color: #52B5BD; text-decoration: none; font-weight: 600; margin: 0 6px;">Privacy Policy</a> &bull; 
                  <a href="${FRONTEND_URL}/contact" style="color: #52B5BD; text-decoration: none; font-weight: 600;">Contact Support</a>
                </div>

                <div style="margin-top: 14px; text-align: center;">
                  <a href="${FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(email || '')}" target="_blank" style="display: inline-block; padding: 7px 18px; background-color: #fee2e2; color: #dc2626; border-radius: 6px; font-size: 12px; font-weight: 700; text-decoration: none;">
                    Unsubscribe
                  </a>
                </div>

                <div style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin-top: 10px;">
                  &copy; 2026 WHY - We Help You Services. All rights reserved.<br>
                  Sent to <strong>${email || ''}</strong> &bull; You received this update from WHY - Your Trusted Companion.<br>
                  To manage subscription preferences or unsubscribe, visit <a href="${FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(email || '')}" style="color: #ef4444; font-weight: 600;">Unsubscribe Here</a>.
                </div>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  return { subject, html };
}

function customBroadcastTemplate({ name, email, subject, preheader, heading, headerTagline, content, ctaLabel, ctaUrl }) {
  const finalSubject = subject || "WHY - We Help You Newsletter";
  const finalHeading = heading || subject || "WHY - We Help You Update";
  const finalHeaderTagline = headerTagline || "YOUR TRUSTED COMPANION";
  const finalCtaLabel = ctaLabel ? ctaLabel.trim() : "";
  const finalCtaUrl = ctaUrl || `${FRONTEND_URL}/contact`;
  const previewSnippet = preheader || "Latest insights and companion support updates from WHY - We Help You.";

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${finalSubject}</title>
    <style>
      .email-content img { max-width: 100% !important; height: auto !important; border-radius: 8px; margin: 12px 0; }
      .email-content a { color: #52B5BD; text-decoration: underline; font-weight: 600; }
      .email-content p { margin: 0 0 16px 0; line-height: 1.7; }
      .email-content ul, .email-content ol { padding-left: 20px; margin: 0 0 16px 0; }
      .email-content li { margin-bottom: 6px; }
      .email-content h1, .email-content h2, .email-content h3 { color: #0b1329; margin: 20px 0 12px 0; font-weight: 800; }
      .email-content blockquote { border-left: 4px solid #52B5BD; padding-left: 16px; margin: 16px 0; color: #475569; font-style: italic; }
    </style>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Helvetica, Arial, sans-serif; color: #1e293b;">
    <!-- Inbox Preheader Snippet -->
    <div style="display:none;font-size:1px;color:#f1f5f9;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
      ${previewSnippet}
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 620px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 12px 36px rgba(11,19,41,0.08); border: 1px solid #e2e8f0;">
            
            <!-- BRAND HEADER -->
            <tr>
              <td style="background: linear-gradient(135deg, #070e1e 0%, #0b1329 60%, #131f37 100%); padding: 36px 40px; text-align: left;">
                <table width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td>
                      <span style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">WHY <span style="color: ${BRAND_TEAL};">- We Help You</span></span>
                      <div style="font-size: 12px; color: rgba(255,255,255,0.75); margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;">${finalHeaderTagline}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- MAIN NEWSLETTER CARD BODY -->
            <tr>
              <td style="padding: 40px;">
                <p style="font-size: 15px; color: #64748b; margin: 0 0 12px 0; font-weight: 600;">
                  Dear <strong>${name || "Valued Subscriber"}</strong>,
                </p>

                <h1 style="font-size: 24px; font-weight: 800; color: ${BRAND_NAVY}; margin: 0 0 20px 0; line-height: 1.35; letter-spacing: -0.3px;">
                  ${finalHeading}
                </h1>

                <!-- RICH TEXT CONTENT BODY -->
                <div class="email-content" style="font-size: 15px; color: #334155; line-height: 1.7; margin-bottom: 32px;">
                  ${content}
                </div>

                <!-- OPTIONAL CALL-TO-ACTION BUTTON (FULLY CUSTOMIZABLE) -->
                ${finalCtaLabel ? `
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 32px 0 16px 0;">
                  <tr>
                    <td align="center" style="border-radius: 12px; background: linear-gradient(135deg, #52B5BD 0%, #2F4A7D 100%); box-shadow: 0 4px 15px rgba(82,181,189,0.35);">
                      <a href="${finalCtaUrl}" target="_blank" style="font-size: 15px; font-weight: 800; color: #ffffff; text-decoration: none; padding: 14px 36px; display: inline-block; border-radius: 12px;">
                        ${finalCtaLabel}
                      </a>
                    </td>
                  </tr>
                </table>
                ` : ''}
              </td>
            </tr>

            <!-- SOCIAL MEDIA & FOOTER -->
            <tr>
              <td style="background-color: #f8fafc; padding: 32px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
                <div style="font-size: 12px; font-weight: 800; color: #0b1329; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.08em;">
                  Connect with WHY - We Help You
                </div>

                <!-- REAL SOCIAL MEDIA ICON BADGES -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto 20px auto;">
                  <tr>
                    <td style="padding: 0 8px;">
                      <a href="${SOCIAL_LINKS.linkedin}" target="_blank" style="text-decoration: none;">
                        <img src="https://img.icons8.com/color/48/linkedin.png" width="30" height="30" alt="LinkedIn" style="display: block; border: 0; outline: none;" />
                      </a>
                    </td>
                    <td style="padding: 0 8px;">
                      <a href="${SOCIAL_LINKS.youtube}" target="_blank" style="text-decoration: none;">
                        <img src="https://img.icons8.com/color/48/youtube-play.png" width="30" height="30" alt="YouTube" style="display: block; border: 0; outline: none;" />
                      </a>
                    </td>
                    <td style="padding: 0 8px;">
                      <a href="${SOCIAL_LINKS.instagram}" target="_blank" style="text-decoration: none;">
                        <img src="https://img.icons8.com/color/48/instagram-new.png" width="30" height="30" alt="Instagram" style="display: block; border: 0; outline: none;" />
                      </a>
                    </td>
                    <td style="padding: 0 8px;">
                      <a href="${SOCIAL_LINKS.facebook}" target="_blank" style="text-decoration: none;">
                        <img src="https://img.icons8.com/color/48/facebook-new.png" width="30" height="30" alt="Facebook" style="display: block; border: 0; outline: none;" />
                      </a>
                    </td>
                    <td style="padding: 0 8px;">
                      <a href="${SOCIAL_LINKS.whatsapp}" target="_blank" style="text-decoration: none;">
                        <img src="https://img.icons8.com/color/48/whatsapp.png" width="30" height="30" alt="WhatsApp" style="display: block; border: 0; outline: none;" />
                      </a>
                    </td>
                  </tr>
                </table>

                <div style="font-size: 12px; color: #64748b; margin-bottom: 14px;">
                  <a href="${FRONTEND_URL}/terms-user" style="color: #52B5BD; text-decoration: none; font-weight: 600;">Terms & Conditions</a> &bull; 
                  <a href="${FRONTEND_URL}/privacy-policy-user" style="color: #52B5BD; text-decoration: none; font-weight: 600; margin: 0 6px;">Privacy Policy</a> &bull; 
                  <a href="${FRONTEND_URL}/contact" style="color: #52B5BD; text-decoration: none; font-weight: 600;">Contact Support</a>
                </div>

                <div style="margin-top: 14px; text-align: center;">
                  <a href="${FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(email || '')}" target="_blank" style="display: inline-block; padding: 7px 18px; background-color: #fee2e2; color: #dc2626; border-radius: 6px; font-size: 12px; font-weight: 700; text-decoration: none;">
                    Unsubscribe
                  </a>
                </div>

                <div style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin-top: 10px;">
                  &copy; 2026 WHY - We Help You Services. All rights reserved.<br>
                  Sent to <strong>${email}</strong> &bull; You received this corporate update from WHY - Your Trusted Companion.<br>
                  To manage subscription preferences or unsubscribe, visit <a href="${FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(email || '')}" style="color: #ef4444; font-weight: 600;">Unsubscribe Here</a>.
                </div>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  return { subject: finalSubject, html };
}

module.exports = {
  newsletterTemplate,
  customBroadcastTemplate,
};
