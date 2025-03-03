// server/services/ai.js - Modified to store user tracks
const { GoogleGenerativeAI } = require('@google/generative-ai');
const uuid = require('uuid');

class AIService {
  constructor() {
    // Try to get from environment
    this.apiKey = process.env.GEMINI_API_KEY;
    
    // Debug actual value (first few characters only, for security)
    const maskedKey = this.apiKey ? `${this.apiKey.substring(0, 5)}...` : 'missing';
    console.log('AIService initialized with Gemini API key:', maskedKey);
    
    // Initialize the Google Generative AI client
    try {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      console.log('Google Generative AI client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Generative AI client:', error.message);
      // Create a placeholder genAI object that will throw errors when used
      this.genAI = {
        getGenerativeModel: () => {
          throw new Error('Google Generative AI client not properly initialized due to missing or invalid API key');
        }
      };
    }
    
    // Initialize the active streams map for persistence across requests
    this.activeStreams = new Map();
    console.log('Active streams map initialized');
  }
  async validateRecommendations(streamId, accessToken) {
    if (!this.activeStreams.has(streamId)) {
      console.log(`Stream ${streamId} not found for validation`);
      return false;
    }
    
    const stream = this.activeStreams.get(streamId);
    
    if (!stream.recommendations || stream.recommendations.length === 0) {
      console.log(`No recommendations to validate in stream ${streamId}`);
      return false;
    }
    
    // Skip if already validated
    if (stream.validationComplete) {
      console.log(`Stream ${streamId} already validated`);
      return true;
    }
    
    console.log(`Validating ${stream.recommendations.length} recommendations for stream ${streamId}`);
    
    const validatedRecs = [];
    const notFoundRecs = [];
    
    // Create a SpotifyService instance for validation
    const SpotifyService = require('../services/spotify');
    const spotifyService = new SpotifyService();
    
    // Process recommendations in batches
    const batchSize = 3; // Small batch size to avoid rate limits
    for (let i = 0; i < stream.recommendations.length; i += batchSize) {
      const batch = stream.recommendations.slice(i, i + batchSize);
      
      for (const rec of batch) {
        try {
          console.log(`Validating: "${rec.title}" by ${rec.artist}`);
          
          // Search Spotify
          const query = `track:"${rec.title}" artist:"${rec.artist}"`;
          const response = await spotifyService.search(accessToken, query, 'track', 3);
          
          if (response.tracks && response.tracks.items && response.tracks.items.length > 0) {
            // Found a match
            const track = response.tracks.items[0];
            console.log(`✓ Found: "${track.name}" by ${track.artists[0].name}`);
            
            validatedRecs.push({
              ...rec,
              spotifyId: track.id,
              spotifyUri: track.uri,
              validated: true
            });
          } else {
            // Try a more relaxed search
            const relaxedQuery = `${rec.title} ${rec.artist}`;
            const relaxedResponse = await spotifyService.search(accessToken, relaxedQuery, 'track', 3);
            
            if (relaxedResponse.tracks && relaxedResponse.tracks.items && relaxedResponse.tracks.items.length > 0) {
              // Found a potential match with relaxed query
              const track = relaxedResponse.tracks.items[0];
              console.log(`? Possible match: "${track.name}" by ${track.artists[0].name}`);
              
              validatedRecs.push({
                ...rec,
                spotifyId: track.id,
                spotifyUri: track.uri,
                validated: true,
                approximate: true
              });
            } else {
              // No match found
              console.log(`✗ Not found: "${rec.title}" by ${rec.artist}`);
              notFoundRecs.push(rec);
            }
          }
          
          // Add a small delay to avoid rate limits
          await new Promise(r => setTimeout(r, 200));
        } catch (error) {
          console.error(`Error validating track: "${rec.title}" by ${rec.artist}`, error);
          notFoundRecs.push(rec);
        }
      }
    }
    
    console.log(`Validation complete for stream ${streamId}:`);
    console.log(`- ${validatedRecs.length} tracks found`);
    console.log(`- ${notFoundRecs.length} tracks not found`);
    
    // Update the stream data
    stream.recommendations = validatedRecs;
    stream.notFoundRecommendations = notFoundRecs;
    stream.validationComplete = true;
    
    return true;
  }
  updateStreamRecommendations(streamId, recommendations) {
    if (this.activeStreams.has(streamId)) {
      const stream = this.activeStreams.get(streamId);
      stream.recommendations = recommendations;
    }
  }
  // Helper function to extract JSON from potential markdown response
  extractJsonFromResponse(text) {
    console.log('Extracting JSON from response...');
    
    try {
      // First, try direct parsing - maybe it's already valid JSON
      return JSON.parse(text);
    } catch (e) {
      console.log('Direct JSON parse failed, trying to extract from markdown...');
      
      try {
        // Look for JSON within markdown code blocks
        const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          console.log('Found JSON within markdown block, parsing...');
          return JSON.parse(jsonMatch[1]);
        }
        
        // Look for JSON without markdown code blocks
        const jsonRegex = /(\{[\s\S]*\})/g;
        const matches = text.match(jsonRegex);
        
        if (matches && matches.length > 0) {
          // Try each match until we find valid JSON
          for (const match of matches) {
            try {
              console.log('Found potential JSON object, attempting to parse...');
              return JSON.parse(match);
            } catch (err) {
              console.log('Parse attempt failed, trying next match...');
            }
          }
        }
        
        // If we get here, we couldn't extract JSON
        throw new Error('Could not extract valid JSON from the response');
      } catch (err) {
        console.error('JSON extraction failed:', err);
        console.log('Full response text:', text);
        throw new Error('Failed to extract JSON from AI response: ' + err.message);
      }
    }
  }
  
  async analyzeTracks(tracks, playlistName) {
    try {
      // Access the Gemini-2.0-flash model
      let model;
      try {
        model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      } catch (error) {
        console.error('Failed to get Gemini model:', error.message);
        return {
          error: "AI service unavailable. Please check your API key configuration.",
          details: error.message
        };
      }
      
      // Prepare the track information for analysis
      const trackData = tracks.map(track => ({
        name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album?.name,
        popularity: track.popularity,
        // Include other relevant details
      }));
      
      // Create the prompt for Gemini
      const prompt = `
        I want to understand my musical taste based on the following tracks I like:
        ${JSON.stringify(trackData, null, 2)}
        
        Please analyze these tracks and identify:
        1. Primary genres and subgenres represented in my selection
        2. Musical attributes (tempo, energy, acousticness, danceability, etc.)
        3. Mood and atmosphere characteristics
        4. Era/time periods represented
        5. Key musical elements (instruments, vocal styles, production techniques)
        
        DO NOT recommend specific songs.
        
        Provide your analysis in this JSON format:
        {
          "analysis": {
            "playlistName": "${playlistName || 'My Personalized Playlist'}",
            "genres": ["genre1", "genre2", "genre3"],
            "attributes": {
              "tempo": "description of typical tempo",
              "energy": "energy level description",
              "acousticness": "acoustic vs electronic description",
              "mood": ["mood1", "mood2", "mood3"],
              "era": ["era1", "era2"]
            },
            "artists": ["artist1", "artist2", "artist3"],
            "detailed_insights": "detailed paragraph about my music taste"
          }
        }
      `;
      
      // Get the response from Gemini
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const analysis = response.text();
      
      return {
        analysis,
        playlistName,
        originalTracks: trackData
      };
    } catch (error) {
      console.error('AI analysis error:', error);
      throw new Error('Failed to analyze tracks with AI: ' + error.message);
    }
  }
  
  async analyzeTracksStreaming(tracks, playlistName, playlistDescription = '', recommendationCount = 25, songCount = 25) {
    try {
      // Generate a stream ID
      const streamId = uuid.v4();
      console.log('Creating new stream with ID:', streamId);
      
      // Set up streaming data structure
      const streamData = {
        id: streamId,
        content: '',
        status: 'processing',
        completed: false,
        recommendations: [],
        analysis: null,
        playlistName: playlistName,
        userTracks: tracks, // Store the user tracks in the stream data
        timestamp: Date.now()
      };
      
      // Store stream data right away
      this.activeStreams.set(streamId, streamData);
      console.log(`Stream ${streamId} added to activeStreams map, current count:`, this.activeStreams.size);
      console.log('Active stream IDs:', Array.from(this.activeStreams.keys()).join(', '));
      
      // Access the Gemini-2.0-flash model
      let model;
      try {
        model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      } catch (error) {
        console.error('Failed to get Gemini model:', error.message);
        streamData.status = 'error';
        streamData.error = 'Failed to initialize AI model: ' + error.message;
        streamData.completed = true;
        return { id: streamId };
      }
      
      // Prepare the track information for analysis
      const trackData = tracks.map(track => ({
        id: track.id,
        name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album?.name,
        popularity: track.popularity,
        preview_url: track.preview_url,
        uri: track.uri
      }));
      
      // Create the prompt for Gemini
      const prompt = `
        I want to create a Spotify playlist called "${playlistName}" with ${songCount} songs total.
        ${playlistDescription ? `\nPlaylist Description: ${playlistDescription}\n` : ''}
        I've selected ${tracks.length} songs that I like. Please analyze these songs to understand my taste
        and then recommend exactly ${recommendationCount} more songs to complete my playlist.
        
        Here are my selected songs:
        ${JSON.stringify(trackData, null, 2)}
        
        First, analyze the musical patterns in my selection (genre, tempo, mood, era, artists, etc.).
        Then, recommend exactly ${recommendationCount} additional songs based on this analysis.
        
        For each recommendation, provide:
        1. Song title
        2. Artist name
        3. A brief explanation of why this song fits with my taste
        
        IMPORTANT: Return your response as a JSON object without any markdown formatting, code blocks, or explanations.
        The JSON must be directly parseable with JSON.parse().
        
        Use this exact structure:
        {
          "analysis": {
            "playlistName": "${playlistName}",
            "genres": ["list of main genres"],
            "mood": ["list of moods"],
            "era": ["list of eras"],
            "themes": ["list of themes"],
            "detailed_insights": "paragraph with detailed analysis"
          },
          "recommendations": [
            {
              "title": "Official song title as it appears on Spotify",
              "artist": "Primary artist name (avoid featuring artists in the name)",
              "reason": "Brief explanation of why this fits (1-2 sentences)"
            }
          ]
        }
      `;
      
      // Start the streaming generation as an async process
      const generateResponse = async () => {
        try {
          console.log(`Starting Gemini API request for stream ${streamId}`);
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const analysisText = response.text();
          
          console.log(`Received AI response for stream ${streamId}, processing...`);
          
          try {
            // Try to extract and parse the JSON response
            const aiResponse = this.extractJsonFromResponse(analysisText);
            
            // Make sure the playlistName is included in the response
            if (!aiResponse.analysis.playlistName) {
              aiResponse.analysis.playlistName = playlistName;
            }
            
            // Update stream data
            streamData.content = analysisText;
            streamData.status = 'completed';
            streamData.completed = true;
            streamData.analysis = aiResponse.analysis;
            streamData.recommendations = aiResponse.recommendations;
            
            console.log(`Stream ${streamId} processing completed successfully`);
          } catch (jsonError) {
            console.error(`Failed to parse AI response as JSON for stream ${streamId}:`, jsonError);
            console.log('Response text:', analysisText.substring(0, 500) + '...');
            
            streamData.content = analysisText;
            streamData.status = 'error';
            streamData.error = 'Failed to parse AI response. Details: ' + jsonError.message;
            streamData.completed = true;
          }
        } catch (error) {
          console.error(`AI streaming error for stream ${streamId}:`, error);
          streamData.status = 'error';
          streamData.error = error.message;
          streamData.completed = true;
        }
      };
      
      // Start generating in the background
      generateResponse();
      
      // Set a cleanup timeout (remove old streams after 1 hour)
      setTimeout(() => {
        if (this.activeStreams.has(streamId)) {
          console.log(`Removing expired stream ${streamId}`);
          this.activeStreams.delete(streamId);
        }
      }, 60 * 60 * 1000);
      
      // Return stream ID immediately
      return { id: streamId };
    } catch (error) {
      console.error('AI streaming setup error:', error);
      throw new Error('Failed to set up AI analysis stream: ' + error.message);
    }
  }
  
  getStreamStatus(streamId) {
    console.log(`Checking status for stream ID: ${streamId}`);
    console.log(`Active streams count: ${this.activeStreams.size}`);
    console.log(`Active stream IDs:`, Array.from(this.activeStreams.keys()).join(', '));
    
    if (!streamId) {
      console.log('Stream ID is required');
      return { exists: false, error: 'Stream ID is required' };
    }
    
    if (!this.activeStreams.has(streamId)) {
      console.log(`Stream ${streamId} not found in active streams`);
      return { exists: false, error: 'Stream not found or expired' };
    }
    
    const stream = this.activeStreams.get(streamId);
    console.log(`Found stream ${streamId}, status: ${stream.status}, completed: ${stream.completed}`);
    
    return {
      exists: true,
      status: stream.status,
      completed: stream.completed,
      content: stream.content,
      analysis: stream.analysis,
      recommendations: stream.recommendations,
      userTracks: stream.userTracks, // Include user tracks in the response
      error: stream.error
    };
  }
}

module.exports = AIService;