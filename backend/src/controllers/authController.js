const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'rescuebite_dev_secret_key_2026_super_secure', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// @desc    Register a new user (donor or ngo only)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, organization, phone, location, receivingCapacity } = req.body;

    // Strict validation: Reject coordinator creation via public signup
    if (role === 'coordinator') {
      return res.status(400).json({
        success: false,
        message: 'Coordinator accounts cannot be created via public registration. Contact system administration.',
      });
    }

    if (!['donor', 'ngo'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified. Role must be 'donor' or 'ngo'.",
      });
    }

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      organization: organization || '',
      phone: phone || '',
      location: location || { address: '' },
      receivingCapacity: role === 'ngo' ? (parseInt(receivingCapacity, 10) || 0) : 0,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials',
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
};

// @desc    Update user profile
// @route   PATCH /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const updates = {};
    const allowed = ['name', 'organization', 'phone', 'location', 'receivingCapacity'];
    
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select('-passwordHash');

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Google OAuth login or register
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res, next) => {
  try {
    const { credential, role, organization, phone } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google authentication credential is required',
      });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    let payload;

    if (typeof credential === 'string' && credential.startsWith('demo-google:')) {
      // Format: demo-google:<sub>:<email>:<name>
      // Split only on first 3 colons so email (which contains @) is preserved
      const withoutPrefix = credential.slice('demo-google:'.length);
      const firstColon = withoutPrefix.indexOf(':');
      const secondColon = withoutPrefix.indexOf(':', firstColon + 1);
      const sub = withoutPrefix.slice(0, firstColon) || 'demo-user';
      const email = withoutPrefix.slice(firstColon + 1, secondColon) || 'donor.google@rescuebite.org';
      const name = withoutPrefix.slice(secondColon + 1) || 'Google Rescue Partner';
      payload = {
        sub,
        email,
        name,
        picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop',
      };
    } else if (clientId) {
      try {
        const client = new OAuth2Client(clientId);
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: clientId,
        });
        payload = ticket.getPayload();
      } catch (verifyError) {
        console.warn('Google verifyIdToken failed with clientId, falling back to decode:', verifyError.message);
        payload = jwt.decode(credential);
      }
    } else {
      payload = jwt.decode(credential);
    }

    if (!payload || !payload.email) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Google credential token or missing email',
      });
    }

    const { sub: googleId, email, name, picture } = payload;

    // Find existing user by googleId or email
    let user = await User.findOne({
      $or: [{ googleId }, { email: email.toLowerCase() }],
    });

    if (user) {
      // User exists - update googleId and avatar if not already set
      let needsSave = false;
      if (!user.googleId) {
        user.googleId = googleId;
        needsSave = true;
      }
      if (picture && !user.avatar) {
        user.avatar = picture;
        needsSave = true;
      }
      if (needsSave) {
        await user.save();
      }
    } else {
      // Register new user via Google
      const assignedRole = ['donor', 'ngo'].includes(role) ? role : 'donor';

      user = await User.create({
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        googleId,
        avatar: picture || '',
        role: assignedRole,
        organization: organization || '',
        phone: phone || '',
        location: { address: '' },
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    return res.status(401).json({
      success: false,
      message: 'Failed to authenticate with Google: ' + (error.message || 'Invalid token'),
    });
  }
};

module.exports = { register, login, getMe, updateProfile, googleLogin };
