// server/index.js - Modified to load environment variables first
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// IMPORTANT: Load environment variables FIRST, before importing any modules
const envPath = path.resolve(__dirname, '.env');
console.log('Looking for .env file at:', envPath);

// Check if the file exists
if (fs.existsSync(envPath)) {
  console.log('.env file found! Loading environment variables...');
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('Error loading .env file:', result.error);
  }
} else {
  console.error('ERROR: .env file not found at expected path:', envPath);
}

// Display environment variables for debugging (REDACTED for security)
console.log('Environment variables loaded:');
console.log('SPOTIFY_CLIENT_ID exists:', !!process.env.SPOTIFY_CLIENT_ID);
console.log('SPOTIFY_CLIENT_SECRET exists:', !!process.env.SPOTIFY_CLIENT_SECRET);
console.log('SPOTIFY_REDIRECT_URI:', process.env.SPOTIFY_REDIRECT_URI);
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('CLIENT_URL:', process.env.CLIENT_URL);
console.log('PORT:', process.env.PORT);

// NOW import modules that need environment variables
const spotifyRoutes = require('./routes/spotify');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.set('trust proxy', 1);
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_URL || 'http://localhost:3000' 
    : 'http://localhost:3000',
  credentials: true
}));

// Routes
app.use('/api/spotify', spotifyRoutes);
app.use('/api/ai', aiRoutes);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at: http://localhost:${PORT}/api`);
  console.log(`Client expected at: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
});
