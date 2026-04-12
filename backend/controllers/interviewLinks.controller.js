const Company = require('../models/company.model');
const User = require('../models/user.model');
const pool = require('../config/db');
const InterviewLink = require('../models/interviewLink.model');
const InterviewResult = require('../models/interviewResult.model');
const sendEmail = require('../utils/sendEmail');

function buildInterviewUrl(token) {
  return `http://localhost:5174/interview?token=${token}`;
}

async function assertManagerCanAccessCandidate(managerId, candidateUserId) {
  const company = await Company.findByManagerId(managerId);
  if (!company) return false;

  const { rows } = await pool.query(
    `SELECT 1
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE a.user_id = $1
       AND j.company_id = $2
     LIMIT 1`,
    [candidateUserId, company.id]
  );
  return rows.length > 0;
}

const sendInterviewLink = async (req, res) => {
  try {
    const candidateUserId = parseInt(req.params.user_id, 10);
    if (Number.isNaN(candidateUserId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    // Role permissions:
    // - admin can generate for any candidate
    // - manager can generate only for candidates who applied to their company
    if (req.user.role === 'manager') {
      const allowed = await assertManagerCanAccessCandidate(req.user.id, candidateUserId);
      if (!allowed) return res.status(403).json({ message: 'Unauthorized' });
    }

    const candidate = await User.findById(candidateUserId);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    const linkRow = await InterviewLink.createForUser(candidateUserId);
    const interviewLink = buildInterviewUrl(linkRow.token);

    // Email notification
    const subject = 'Interview Shortlisted';
    const text =
      `You have been shortlisted for the interview. Please use the link below to attend your interview.\n\n` +
      `${interviewLink}\n`;
    await sendEmail(candidate.email, subject, text);

    // Candidate dashboard notification (optional but enabled)
    const panelMessage = 'You have been shortlisted for the interview. Please check your interview link.';
    try {
      await pool.query(
        `INSERT INTO notifications (user_id, message, status, created_at) VALUES ($1, $2, $3, NOW())`,
        [candidateUserId, panelMessage, 'interview']
      );
    } catch (_) {
      await pool.query(
        `INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)`,
        [candidateUserId, panelMessage, 'interview']
      );
    }

    return res.json({
      user_id: candidateUserId,
      token: linkRow.token,
      expires_at: linkRow.expires_at,
      interview_link: interviewLink
    });
  } catch (error) {
    console.error('sendInterviewLink error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getInterviewResults = async (req, res) => {
  try {
    const candidateUserId = parseInt(req.params.user_id, 10);
    if (Number.isNaN(candidateUserId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    if (req.user.role === 'manager') {
      const allowed = await assertManagerCanAccessCandidate(req.user.id, candidateUserId);
      if (!allowed) return res.status(403).json({ message: 'Unauthorized' });
    }

    const result = await InterviewResult.getLatestByUserId(candidateUserId);
    if (!result) {
      return res.json({ user_id: candidateUserId, score: null, feedback: null });
    }

    return res.json({
      user_id: result.user_id,
      score: result.score,
      feedback: result.feedback
    });
  } catch (error) {
    console.error('getInterviewResults error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  sendInterviewLink,
  getInterviewResults
};

