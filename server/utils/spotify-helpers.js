// server/utils/spotify-helpers.js - Complete file

/**
 * Utility functions for Spotify track validation and recommendations
 */

// Import the Spotify service
const SpotifyService = require('../services/spotify');

/**
 * Normalize strings for better matching
 * @param {string} str - String to normalize
 * @returns {string} - Normalized string
 */
function normalizeString(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    // Remove special characters
    .replace(/[^\w\s]/gi, '')
    // Remove common words that might interfere with matching
    .replace(/\b(feat|ft|featuring|with|prod|remix|version|edit|instrumental|radio|extended|original)\b/gi, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate similarity between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity score (0-1)
 */
function stringSimilarity(str1, str2) {
  const a = normalizeString(str1);
  const b = normalizeString(str2);
  
  // If either string is empty, return 0
  if (!a.length || !b.length) return 0;
  
  // If strings are identical after normalization, perfect match
  if (a === b) return 1;
  
  // Check if either string contains the other
  if (a.includes(b) || b.includes(a)) {
    const ratio = Math.min(a.length, b.length) / Math.max(a.length, b.length);
    // Return a score based on how much of the longer string is covered
    return 0.75 + (ratio * 0.25);
  }
  
  // Count matching words
  const wordsA = a.split(' ');
  const wordsB = b.split(' ');
  
  let matchCount = 0;
  for (const wordA of wordsA) {
    if (wordA.length <= 2) continue; // Skip very short words
    for (const wordB of wordsB) {
      if (wordB.length <= 2) continue;
      if (wordA === wordB || wordA.includes(wordB) || wordB.includes(wordA)) {
        matchCount++;
        break;
      }
    }
  }
  
  // Calculate similarity based on word matches
  const totalWords = Math.max(wordsA.length, wordsB.length);
  return totalWords > 0 ? matchCount / totalWords : 0;
}

/**
 * Find the best match for a track in Spotify search results
 * @param {Object} recommendation - Recommendation with title and artist
 * @param {Array} searchResults - Array of Spotify track objects
 * @returns {Object|null} - Best match or null if no good match found
 */
function findBestMatch(recommendation, searchResults) {
  if (!searchResults || !searchResults.length) return null;
  
  const trackMatches = searchResults.map(track => {
    const titleSimilarity = stringSimilarity(recommendation.title, track.name);
    
    // Find the best matching artist
    let bestArtistSimilarity = 0;
    for (const artist of track.artists) {
      const similarity = stringSimilarity(recommendation.artist, artist.name);
      bestArtistSimilarity = Math.max(bestArtistSimilarity, similarity);
    }
    
    // Calculate overall match score, weighting title more heavily
    const overallScore = (titleSimilarity * 0.7) + (bestArtistSimilarity * 0.3);
    
    return {
      track,
      score: overallScore,
      titleSimilarity,
      artistSimilarity: bestArtistSimilarity
    };
  });
  
  // Sort by overall score
  trackMatches.sort((a, b) => b.score - a.score);
  
  // We need a reasonably good match
  if (trackMatches[0] && trackMatches[0].score > 0.6) {
    return trackMatches[0].track;
  }
  
  return null;
}

/**
 * Advanced track validation and fallback system
 * This ensures we only add real tracks to playlists, with multiple fallback strategies
 * @param {string} accessToken - Spotify access token
 * @param {Array} recommendations - Array of recommendations objects with title and artist
 * @param {number} minRequiredTracks - Minimum number of tracks needed
 * @returns {Object} - Object with validatedTracks, notFoundTracks, and stats
 */
async function validateAndResolveRecommendations(accessToken, recommendations, minRequiredTracks) {
  const spotifyService = new SpotifyService();
  const validatedTracks = [];
  const notFoundTracks = [];
  
  // 1. First attempt: Try to find each recommendation in Spotify
  for (const rec of recommendations) {
    try {
      // Create multiple search queries with different formats to increase chances of finding the track
      const searchQueries = [
        // Exact search with quotes - high precision
        `track:"${rec.title}" artist:"${rec.artist}"`,
        // Relaxed search without quotes - higher recall
        `${rec.title} ${rec.artist}`,
        // Title only for very distinctive track names
        `track:"${rec.title}"`,
        // Remove special characters which might cause issues
        `${rec.title.replace(/[^\w\s]/gi, '')} ${rec.artist.replace(/[^\w\s]/gi, '')}`
      ];
      
      let trackFound = false;
      
      for (const query of searchQueries) {
        if (trackFound) break;
        
        const searchResponse = await spotifyService.search(accessToken, query, 'track', 5);
        
        if (searchResponse.tracks?.items?.length) {
          // Use our custom matching function
          const bestMatch = findBestMatch(rec, searchResponse.tracks.items);
          
          if (bestMatch) {
            // Add the validated track with the correct data from Spotify
            validatedTracks.push({
              id: bestMatch.id,
              title: bestMatch.name,
              artist: bestMatch.artists[0].name,
              reason: rec.reason,
              uri: bestMatch.uri,
              albumImage: bestMatch.album?.images?.[0]?.url
            });
            
            trackFound = true;
            break;
          }
        }
      }
      
      // If no track found after all search attempts
      if (!trackFound) {
        notFoundTracks.push(rec);
        console.warn(`Could not find track: ${rec.title} by ${rec.artist}`);
      }
    } catch (error) {
      console.error('Error searching for track:', error);
      notFoundTracks.push(rec);
    }
  }
  
  console.log(`Found ${validatedTracks.length} valid tracks out of ${recommendations.length} recommendations`);
  
  // 2. Fallback: If we don't have enough tracks, get recommendations based on validated tracks
  if (validatedTracks.length < minRequiredTracks && validatedTracks.length > 0) {
    console.log(`Not enough validated tracks (${validatedTracks.length}/${minRequiredTracks}), using fallback recommendations`);
    
    try {
      // Use up to 5 validated tracks as seeds (Spotify API limit)
      const seedTracks = validatedTracks.slice(0, 5).map(track => track.id);
      
      // Get recommendations from Spotify
      const additionalRecs = await spotifyService.getRecommendations(
        accessToken, 
        {
          seed_tracks: seedTracks.join(','),
          limit: minRequiredTracks - validatedTracks.length
        }
      );
      
      // Add these tracks to our validated list
      if (additionalRecs.tracks && additionalRecs.tracks.length > 0) {
        for (const track of additionalRecs.tracks) {
          // Avoid duplicates
          if (!validatedTracks.some(vt => vt.id === track.id)) {
            validatedTracks.push({
              id: track.id,
              title: track.name,
              artist: track.artists[0].name,
              reason: "This track complements your selected music based on audio features and popularity.",
              uri: track.uri,
              albumImage: track.album?.images?.[0]?.url
            });
          }
        }
      }
    } catch (fallbackError) {
      console.error('Error getting fallback recommendations:', fallbackError);
    }
  }
  
  return {
    validatedTracks,
    notFoundTracks,
    stats: {
      requested: recommendations.length,
      found: validatedTracks.length,
      notFound: notFoundTracks.length
    }
  };
}

/**
 * Get music recommendations using Spotify's API
 * @param {string} accessToken - Spotify access token
 * @param {Array} seedTracks - Array of track IDs to use as seeds
 * @param {number} limit - Number of recommendations to get
 * @returns {Array} - Array of track recommendations
 */
async function getSpotifyRecommendations(accessToken, seedTracks, limit = 20) {
  try {
    const spotifyService = new SpotifyService();
    
    // Use up to 5 tracks (Spotify limit)
    const seeds = seedTracks.slice(0, 5).join(',');
    
    const recommendations = await spotifyService.getRecommendations(
      accessToken, 
      {
        seed_tracks: seeds,
        limit
      }
    );
    
    return recommendations.tracks.map(track => ({
      id: track.id,
      title: track.name,
      artist: track.artists[0].name,
      reason: "Recommended by Spotify based on your selected tracks.",
      uri: track.uri,
      albumImage: track.album?.images?.[0]?.url
    }));
  } catch (error) {
    console.error('Error getting Spotify recommendations:', error);
    return [];
  }
}

module.exports = {
  validateAndResolveRecommendations,
  getSpotifyRecommendations,
  findBestMatch,
  normalizeString,
  stringSimilarity
};