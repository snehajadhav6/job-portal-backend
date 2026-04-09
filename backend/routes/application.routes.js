const express = require('express');
const { applyForJob, getMyApplications, getApplicationsForJob, updateApplicationStatus } = require('../controllers/application.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const upload = require('../middleware/upload.middleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/', roleMiddleware(['client']), upload.single('resume'), applyForJob);
router.get('/my', roleMiddleware(['client']), getMyApplications);
router.get('/job/:id', roleMiddleware(['manager']), getApplicationsForJob);
router.put('/:id', roleMiddleware(['manager']), updateApplicationStatus);

module.exports = router;