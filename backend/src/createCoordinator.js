require('dotenv').config();
const dns = require('dns');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const createCoordinator = async () => {
  const args = process.argv.slice(2);
  const email = args[0] || process.env.COORDINATOR_EMAIL || 'coordinator@rescuebite.org';
  const password = args[1] || process.env.COORDINATOR_PASSWORD || 'Password123!';
  const name = args[2] || 'Operations Coordinator';
  const organization = args[3] || 'RescueBite Operations Hub';

  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('[Error] MONGO_URI is not set in backend/.env');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('[Connected] MongoDB Atlas');

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      console.log(`[Info] User with email ${email} already exists (role: ${existing.role}).`);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'coordinator',
      organization,
      receivingCapacity: 0,
    });

    console.log('\n--- Real Coordinator Account Created Successfully ---');
    console.log(`Name:  ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role:  ${user.role}`);
    console.log('-----------------------------------------------------\n');
    process.exit(0);
  } catch (error) {
    console.error('[Error]:', error.message);
    process.exit(1);
  }
};

createCoordinator();
