const Application = require('../models/application.model');
const Job = require('../models/job.model');
const Company = require('../models/company.model');
const User = require('../models/user.model');
const sendEmail = require('../utils/sendEmail');
const { evaluateResumeATS } = require('../services/atsEvaluator');
const { sendAssessmentNotification, sendInterviewShortlistNotification } = require('../services/notificationService');

const applyForJob = async (req, res) => {
  try {
    const { job_id, cover_letter, college_name, cgpa, willing_to_relocate, experience_years } = req.body;

    // ✅ Ensure resume is uploaded
    if (!req.file) {
      return res.status(400).json({ message: "Resume is required" });
    }

    console.log("Uploaded File:", req.file);

    // Use the Cloudinary URL
    const resume_url = req.file.path;

    // Check if already applied
    const existingApplication = await Application.findByUserAndJob(req.user.id, job_id);
    if (existingApplication) {
      return res.status(400).json({ message: 'Already applied for this job' });
    }

    // Retrieve job description for ATS mapping
    const job = await Job.findById(job_id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Process ATS Evaluation
    const atsScore = await evaluateResumeATS(resume_url, job.description);
    
    let status = 'applied';
    let testStatus = 'not_started';

    if (atsScore >= 70) {
      status = 'shortlisted';
      testStatus = 'sent';
    } else {
      status = 'rejected';
    }

    const applicationId = await Application.create({
      job_id,
      user_id: req.user.id,
      cover_letter,
      resume_url, // ✅ fixed URL
      college_name,
      cgpa: cgpa ? parseFloat(cgpa) : null,
      willing_to_relocate: willing_to_relocate === 'true' || willing_to_relocate === true,
      experience_years: experience_years ? parseInt(experience_years) : 0,
      ats_score: atsScore,
      status: status,
      test_status: testStatus
    });

    const user = await User.findById(req.user.id);
    
    if (status === 'shortlisted') {
      await sendAssessmentNotification(req.user.id, user.email, user.name, job.title);
    }

    res.status(201).json({
      message: 'Application submitted successfully',
      applicationId,
      ats_score: atsScore,
      status,
      candidate_name: user.name,
      job_role: job.title
    });

  } catch (error) {
    console.error("Apply Job Error:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.findByUserId(req.user.id);
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getApplicationsForJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const company = await Company.findByManagerId(req.user.id);
    if (job.company_id !== company.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const applications = await Application.findByJobId(req.params.id);
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const job = await Job.findById(application.job_id);
    const company = await Company.findByManagerId(req.user.id);
    if (job.company_id !== company.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await Application.updateStatus(req.params.id, status);

    // Send email notification
    const user = await User.findById(application.user_id);
    const subject = `Application Status Update for ${job.title}`;
    const text = `Your application status has been updated to: ${status}`;
    await sendEmail(user.email, subject, text);

    res.json({ message: 'Application status updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateTestScore = async (req, res) => {
  try {
    const { application_id, test_score } = req.body;
    
    if (!application_id || test_score === undefined) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    const application = await Application.findById(application_id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    await Application.updateTestScore(application_id, test_score);
    
    const user = await User.findById(application.user_id);
    const job = await Job.findById(application.job_id);

    res.json({
      candidate_name: user?.name,
      job_role: job?.title,
      ats_score: application.ats_score,
      test_score: test_score,
      status: 'test_completed'
    });
  } catch (error) {
    console.error("Update Test Score Error:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const managerApproveForInterview = async (req, res) => {
  try {
    const application_id = req.params.id || req.body.application_id;
    
    const application = await Application.findById(application_id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const job = await Job.findById(application.job_id);
    const company = await Company.findByManagerId(req.user.id);
    if (job.company_id !== company.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await Application.updateStatus(application_id, 'interview_ready');

    const user = await User.findById(application.user_id);
    await sendInterviewShortlistNotification(user.id, user.email);

    res.json({
      candidate_name: user.name,
      job_role: job.title,
      ats_score: application.ats_score,
      test_score: application.test_score,
      status: 'interview_ready',
      message: 'Candidate approved for interview successfully'
    });
  } catch (error) {
    console.error("Manager Approve Error:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { 
  applyForJob, 
  getMyApplications, 
  getApplicationsForJob, 
  updateApplicationStatus,
  updateTestScore,
  managerApproveForInterview
};