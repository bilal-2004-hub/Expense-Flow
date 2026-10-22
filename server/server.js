const dotenv = require('dotenv');
const app = require('./app');

// Load env vars
dotenv.config();

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use by another application. Please free port ${PORT} or change PORT in .env`);
  } else {
    console.error('❌ Server startup error:', err);
  }
  process.exit(1);
});
