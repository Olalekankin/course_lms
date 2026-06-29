const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'interview_lms',
    });
    isConnected = true;
    console.log('[MongoDB] Connected to Atlas — interview_lms');
  } catch (error) {
    console.error('[MongoDB] Connection failed:', error.message);
    process.exit(1);
  }
}

module.exports = { connectDB };
