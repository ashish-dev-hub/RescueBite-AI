const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile, googleLogin } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', protect, getMe);
router.patch('/profile', protect, updateProfile);

module.exports = router;
