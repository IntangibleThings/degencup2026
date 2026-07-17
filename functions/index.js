const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// ============================================================================
// EMAIL CONFIGURATION
// ============================================================================
// Option A: Gmail (RECOMMENDED - free)
//    1. Go to https://myaccount.google.com/apppasswords
//    2. Sign in to your Google account
//    3. Select "Mail" + "Other (Custom name)" → type "Degen Cup"
//    4. Click GENERATE → copy the 16-character password
//    5. Paste it below as gmailAppPassword
//
// Option B: SendGrid (also free, 100 emails/day)
//    1. Sign up at https://sendgrid.com/
//    2. Create an API key
//    3. Use the API key as the password below
// ============================================================================

const gmailEmail = 'eugene.ps.kan@gmail.com';      // Your Gmail address
const gmailAppPassword = 'YOUR_APP_PASSWORD_HERE';    // 16-char app password from Google
const notificationEmail = 'eugene.ps.kan@gmail.com';  // Where notifications go

const mailTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailEmail,
    pass: gmailAppPassword,
  },
});

// ============================================================================
// CLOUD FUNCTION: Send email when new manager signs up
// Trigger: Firestore document created in games/{gameId}/managers/{managerId}
// ============================================================================
exports.onManagerSignup = functions.firestore
  .document('games/{gameId}/managers/{managerId}')
  .onCreate(async (snap, context) => {
    const manager = snap.data();
    const { gameId, managerId } = context.params;

    console.log(`New manager signed up: ${manager.name} in game ${gameId}`);

    const subject = `Degen Cup 2026 - New Manager Signed Up: ${manager.name}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 2px solid #2D3192; background: #f5f5f5;">
        <h2 style="color: #2D3192; font-family: 'Courier New', monospace;">&#127942; DEGEN CUP 2026</h2>
        <h3 style="color: #333;">New Manager Signed Up!</h3>

        <table style="width: 100%; background: white; border-collapse: collapse; margin: 15px 0;">
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 10px; font-weight: bold; color: #666;">Team Name</td>
            <td style="padding: 10px;">${manager.name || 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 10px; font-weight: bold; color: #666;">Username</td>
            <td style="padding: 10px;">${manager.realName || 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 10px; font-weight: bold; color: #666;">Teams Drafted</td>
            <td style="padding: 10px;">${(manager.teamCodes || []).length} / 12</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 10px; font-weight: bold; color: #666;">Top Scorer Guess</td>
            <td style="padding: 10px;">${manager.topScorerGuess ? `${manager.topScorerGuess.name} (${manager.topScorerGuess.country})` : 'Not set'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 10px; font-weight: bold; color: #666;">Paid</td>
            <td style="padding: 10px; color: ${manager.paid ? '#00AA00' : '#E60012'}; font-weight: bold;">${manager.paid ? 'YES' : 'NO'}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold; color: #666;">Signed Up</td>
            <td style="padding: 10px;">${new Date().toLocaleString('en-HK', { timeZone: 'Asia/Hong_Kong' })}</td>
          </tr>
        </table>

        <p style="font-size: 12px; color: #888;">
          Manager ID: ${managerId}<br>
          Game: ${gameId}
        </p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 11px; color: #999; text-align: center;">
          Degen Cup 2026 Notification System<br>
          <a href="https://degencup2026.xyz" style="color: #2D3192;">degencup2026.xyz</a>
        </p>
      </div>
    `;

    const mailOptions = {
      from: `"Degen Cup 2026" <${gmailEmail}>`,
      to: notificationEmail,
      subject: subject,
      html: htmlContent,
    };

    try {
      await mailTransport.sendMail(mailOptions);
      console.log(`Notification email sent for manager: ${manager.name}`);
      return null;
    } catch (error) {
      console.error('Failed to send email:', error);
      return null;
    }
  });

// ============================================================================
// CLOUD FUNCTION: Send email when a manager submits their teams
// ============================================================================
exports.onManagerSubmit = functions.firestore
  .document('games/{gameId}/managers/{managerId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const { gameId, managerId } = context.params;

    // Only trigger if teamCodes went from empty to having teams (first submission)
    const hadTeamsBefore = (before.teamCodes || []).length > 0;
    const hasTeamsAfter = (after.teamCodes || []).length > 0;

    if (!hadTeamsBefore && hasTeamsAfter) {
      console.log(`Manager ${after.name} submitted ${after.teamCodes.length} teams`);

      const teamList = (after.teamCodes || []).join(', ');

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 2px solid #00AA00; background: #f5f5f5;">
          <h2 style="color: #00AA00; font-family: 'Courier New', monospace;">&#9989; ROSTER SUBMITTED</h2>
          <h3 style="color: #333;">${after.name} has locked in their teams!</h3>

          <table style="width: 100%; background: white; border-collapse: collapse; margin: 15px 0;">
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px; font-weight: bold; color: #666;">Manager</td>
              <td style="padding: 10px;">${after.name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px; font-weight: bold; color: #666;">Teams Selected</td>
              <td style="padding: 10px;">${after.teamCodes.length} / 12</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; color: #666;">Team Codes</td>
              <td style="padding: 10px; font-family: monospace; font-size: 11px;">${teamList}</td>
            </tr>
          </table>

          <p style="font-size: 12px; color: #888;">
            Submitted at: ${new Date().toLocaleString('en-HK', { timeZone: 'Asia/Hong_Kong' })}
          </p>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="font-size: 11px; color: #999; text-align: center;">
            <a href="https://degencup2026.xyz" style="color: #2D3192;">View Standings</a>
          </p>
        </div>
      `;

      const mailOptions = {
        from: `"Degen Cup 2026" <${gmailEmail}>`,
        to: notificationEmail,
        subject: `Degen Cup 2026 - ${after.name} Submitted Roster!`,
        html: htmlContent,
      };

      try {
        await mailTransport.sendMail(mailOptions);
        console.log(`Submission email sent for: ${after.name}`);
      } catch (error) {
        console.error('Failed to send submission email:', error);
      }
    }

    return null;
  });
