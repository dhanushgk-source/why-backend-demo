module.exports = function certificateTemplate({ fullName, courseName, certificateUrl, certificateNumber }) {
  const subject = `🏆 Congratulations! Here is your Certificate for ${courseName}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background-color: #FAFAFA;">
      <div style="background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E5E7EB; padding: 40px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="display: inline-block; background-color: #FEF3C7; color: #92400E; font-size: 32px; padding: 12px 16px; border-radius: 50%;">🏆</span>
        </div>

        <h1 style="color: #2F4A7D; font-size: 24px; font-weight: 700; text-align: center; margin-top: 0; margin-bottom: 8px;">
          Course Completed!
        </h1>
        
        <p style="color: #4B5563; font-size: 16px; text-align: center; margin-top: 0; margin-bottom: 24px;">
          Congratulations <strong>${fullName}</strong>! You have successfully completed all modules and lessons for <strong>${courseName}</strong>.
        </p>

        <div style="background-color: #F3F4F6; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 28px;">
          <p style="color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">Certificate Code</p>
          <p style="color: #1F2937; font-family: monospace; font-size: 18px; font-weight: 700; margin: 0;">${certificateNumber}</p>
        </div>

        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${certificateUrl}" target="_blank" style="display: inline-block; background-color: #2F4A7D; color: #FFFFFF; font-weight: 600; font-size: 15px; text-decoration: none; padding: 14px 32px; border-radius: 12px; transition: background-color 0.2s;">
            View & Download Certificate →
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0;" />

        <p style="color: #9CA3AF; font-size: 13px; text-align: center; margin: 0;">
          Keep learning and growing with WHY We Help!
        </p>

      </div>
    </div>
  `;

  return { subject, html };
};
