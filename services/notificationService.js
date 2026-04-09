const sendEmail = require('../utils/sendEmail');
const pool = require('../config/db');

async function sendAssessmentNotification(userId, email, candidateName, jobRole) {
  // 1. Send Email
  const subject = `Coding Assessment Invitation`;
  const text = `Dear ${candidateName},

Thank you for applying for the ${jobRole} position.

To help us evaluate your technical skills, you are invited to complete a coding assessment.

Assessment Details:
• Includes multiple-choice and/or coding questions
• Complete within 3 days
• Assessment link expires after 7 days
• Must be completed in a single session

Assessment Link:
https://assessment.shnoor.com

After completing the assessment, your results will be reviewed by the hiring manager.

Best regards,
Talent Acquisition Team`;

  await sendEmail(email, subject, text);

  // 2. Insert into notifications table
  await pool.query(
    `INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)`,
    [userId, `You have been selected for a coding assessment for the ${jobRole} position. Check your email for details.`, 'assessment']
  );
}

async function sendInterviewShortlistNotification(userId, email) {
  const subject = `Interview Shortlist Status`;
  const text = `You have been shortlisted for the interview round. Interview scheduling details will be shared shortly.`;
  
  await sendEmail(email, subject, text);

  await pool.query(
    `INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)`,
    [userId, text, 'interview']
  );
}

module.exports = { sendAssessmentNotification, sendInterviewShortlistNotification };
