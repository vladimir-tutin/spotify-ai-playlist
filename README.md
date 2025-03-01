# AI-Powered Spotify Playlist Generator

A full-stack web application that uses AI to analyze your music taste and create personalized Spotify playlists tailored to your preferences.

![AI Powered Playlist](https://github.com/user-attachments/assets/1ecd2321-6368-4a0c-94db-c15fae4964bc)



## Features

- **Spotify Integration**: Login with your Spotify account to access your music library
- **Smart Music Selection**: Add tracks, artists, albums, or entire playlists
- **AI-Powered Analysis**: Uses Google's Gemini AI to analyze your music taste patterns
- **Personalized Recommendations**: Generates music recommendations based on your selections
- **Custom Playlist Creation**: Creates and adds the playlist directly to your Spotify account
- **Detailed Insights**: Provides analysis of genres, moods, eras, and themes in your music
- **User-Friendly Interface**: Modern, intuitive UI designed for music discovery

## Technology Stack

- **Frontend**: React, React Router, Axios
- **Backend**: Node.js, Express
- **APIs**: Spotify Web API, Google Generative AI (Gemini)
- **Authentication**: Spotify OAuth

## Prerequisites

Before you begin, ensure you have the following:

- [Node.js](https://nodejs.org/) (v14 or later) and npm installed
- A [Spotify Developer](https://developer.spotify.com/dashboard/) account
- A [Google AI Studio](https://ai.google.dev/) account for Gemini API access
- Git (for cloning the repository)

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/ai-spotify-playlist-generator.git
cd ai-spotify-playlist-generator
```

### 2. Install dependencies

Install dependencies for both the server and client applications:

```bash
# Install server dependencies
cd server
npm install

# Return to root and install client dependencies
cd ..
cd client
npm install
```

### 3. Set up environment variables

Create a `.env` file in the `server` directory with the following variables:

```
# Spotify API credentials
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:5000/api/spotify/callback

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key

# Application settings
CLIENT_URL=http://localhost:3000
PORT=5000
NODE_ENV=development
```

#### How to get these credentials:

**Spotify API Credentials:**
1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
2. Log in with your Spotify account
3. Click "Create An App"
4. Fill in the app name and description
5. Once created, you'll see your Client ID
6. Click "Show Client Secret" to view your Client Secret
7. Go to "Edit Settings" and add `http://localhost:5000/api/spotify/callback` to the Redirect URIs section

**Google Gemini API Key:**
1. Go to the [Google AI Studio](https://ai.google.dev/)
2. Create an account or sign in
3. Navigate to the API keys section
4. Create a new API key
5. Copy the key to your `.env` file

## Running the Application

### Development Mode

Start the backend server:

```bash
# From the server directory
npm run dev
```

In a separate terminal, start the frontend client:

```bash
# From the client directory
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

### Production Build

To create a production build:

```bash
# Build the client
cd client
npm run build

# Return to server directory
cd ../server
```

To run the production version:

```bash
# From the server directory
NODE_ENV=production npm start
```

The application will serve the built frontend assets and API from a single server at http://localhost:5000.

## Project Structure

```
/
├── client/                 # React frontend
│   ├── public/             # Static files
│   └── src/
│       ├── components/     # UI components
│       ├── contexts/       # React contexts (Auth, Playlist)
│       ├── pages/          # Page components
│       ├── services/       # API service
│       └── assets/         # Images, styles, etc.
│
└── server/                 # Node.js backend
    ├── controllers/        # Route controllers
    ├── routes/             # API routes
    ├── services/           # Business logic
    └── index.js            # Server entry point
```

## Usage Guide

1. **Login with Spotify**: Click the "Connect with Spotify" button on the home page
2. **Browse Your Library**: View your existing playlists on the dashboard
3. **Create a New Playlist**: Click "Create New Playlist"
4. **Select Music**: Search for and add tracks, artists, albums, or playlists
5. **Customize Settings**: Adjust the name, description, and song count
6. **Generate Playlist**: Click "Generate Playlist" to start the AI analysis
7. **Review Recommendations**: The AI will provide music recommendations based on your selections
8. **Create Playlist**: Click "Create Playlist in Spotify" to add it to your Spotify account
9. **Enjoy**: Open the playlist in Spotify and enjoy your personalized music selection!

## Troubleshooting

### Common Issues

**Authentication Failed**
- Verify your Spotify developer credentials are correct
- Check that your redirect URI matches exactly what's in your Spotify dashboard
- Ensure cookies are enabled in your browser

**AI Analysis Errors**
- Verify your Gemini API key is correct and has sufficient quota
- Ensure you've selected enough tracks for the AI to analyze (at least 1)

**Playlist Creation Issues**
- Check your Spotify account's playlist limit
- Verify the Spotify API scopes are correctly set up

### Debug Logging

The application includes extensive logging:
- Client-side logging is visible in the browser console
- Server-side logging is visible in the terminal running the server

## Advanced Configuration

### Customizing the AI prompt

The AI prompt can be modified in `server/services/ai.js`. Look for the `analyzeTracksStreaming` method to adjust how the AI analyzes and recommends music.

### Scaling considerations

For production deployment:
- Consider adding rate limiting
- Implement proper caching
- Use environment variables for all configuration
- Consider deploying the frontend to a CDN

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Spotify Web API](https://developer.spotify.com/documentation/web-api/)
- [Google Generative AI](https://ai.google.dev/docs)
- [React](https://reactjs.org/)
- [Express](https://expressjs.com/)

---

## Screenshots

### Home Page
![Home Page](https://github.com/user-attachments/assets/07c051c2-4d8b-4adf-96a7-c317750ea303)


### Dashboard
![Dashboard](https://github.com/user-attachments/assets/a51bc2df-e0a1-4e94-b6cb-63a863118c14)


### Playlist Creator
![Playlist Creator](https://github.com/user-attachments/assets/c07e035a-44e9-4f93-9581-c9dd49ccb594)


### Generation Results
![Geneartion Results](https://github.com/user-attachments/assets/feb07104-4064-444d-8338-174aed5c88bf)


