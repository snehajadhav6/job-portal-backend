const express = require('express');
const { getProfile, updateProfile, getMyJobs, getDashboardStats } = require('../controllers/company.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const upload = require('../middleware/upload.middleware');

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(['manager']));

router.get('/profile', getProfile);
router.put('/profile', upload.single('logo'), updateProfile);
router.get('/my-company', getProfile);
router.get('/jobs', getMyJobs);
router.get('/dashboard-stats', getDashboardStats);

module.exports = router;
