require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { initLifecycleScheduler } = require('./services/lifecycleService');

const PORT = process.env.PORT || 5000;

// Connect to Database and start listener
const startServer = async () => {
  await connectDB();
  
  // Start background lifecycle monitor for expiries
  initLifecycleScheduler();

  app.listen(PORT, () => {
    console.log(`[OneTap365 Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

startServer();
