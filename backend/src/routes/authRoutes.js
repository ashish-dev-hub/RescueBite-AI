const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  googleLogin,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);
router.patch('/profile', protect, updateProfile);

module.exports = router;
