const mongoose = require('mongoose');
const dns = require('dns');

// Configure public DNS to resolve MongoDB Atlas SRV records reliably on Windows/ISP networks
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // fallback to default resolver
}

let cachedConnection = null;

const connectDB = async () => {
  // If already connected, reuse existing database connection
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  if (cachedConnection) {
    return cachedConnection;
  }

  try {
    cachedConnection = mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rescuebite', {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });

    const conn = await cachedConnection;
    console.log(`[MongoDB Connected]: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    cachedConnection = null;
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    // In serverless environments (like Vercel), do not terminate process
    if (!process.env.VERCEL) {
      process.exit(1);
    }
    throw error;
  }
};

module.exports = connectDB;

