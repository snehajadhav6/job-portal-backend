const express = require('express');
const { applyForJob, getMyApplications, getApplicationsForJob, updateApplicationStatus, updateTestScore, managerApproveForInterview } = require('../controllers/application.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const upload = require('../middleware/upload.middleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/', roleMiddleware(['client']), upload.single('resume'), applyForJob);
router.get('/my', roleMiddleware(['client']), getMyApplications);
router.get('/job/:id', roleMiddleware(['manager']), getApplicationsForJob);
router.put('/:id', roleMiddleware(['manager']), updateApplicationStatus);

// API Endpoints for ATS Test evaluation & Manager controls
router.post('/update-test-score', updateTestScore);
router.patch('/manager-approve/:id', roleMiddleware(['manager']), managerApproveForInterview);

module.exports = router;