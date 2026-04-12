const express = require('express');
const { register, login, getMe } = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

const { getNotifications } = require('../controllers/notification.controller');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);
router.get('/notifications', authMiddleware, getNotifications);

module.exports = router;
