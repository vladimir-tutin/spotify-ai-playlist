// Function to sanitize and extract JSON from AI responses

/**
 * Sanitizes an AI-generated JSON string and makes it parseable
 * 
 * @param {string} aiResponse - The raw response from the AI which should contain JSON
 * @returns {Object} The parsed JSON object, or null if parsing fails
 */
function sanitizeAndParseAIResponse(aiResponse) {
    try {
      // First, try to extract JSON content if it's wrapped in markdown code blocks
      let jsonContent = aiResponse;
      
      // Extract content from markdown code blocks if present
      const codeBlockMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        jsonContent = codeBlockMatch[1];
      }
      
      // Handle unescaped quotes within string values
      // This is a critical issue when AI puts quotes inside text like "similar to "Track Name""
      let sanitizedJson = '';
      let inString = false;
      let escapeNext = false;
      
      for (let i = 0; i < jsonContent.length; i++) {
        const char = jsonContent[i];
        const nextChar = i < jsonContent.length - 1 ? jsonContent[i + 1] : '';
        
        if (escapeNext) {
          sanitizedJson += char;
          escapeNext = false;
          continue;
        }
        
        if (char === '\\') {
          sanitizedJson += char;
          escapeNext = true;
          continue;
        }
        
        if (char === '"' && !inString) {
          inString = true;
          sanitizedJson += char;
          continue;
        }
        
        if (char === '"' && inString) {
          // Check if this quote is ending the string or is inside the string
          // If next char is :, , or }, it's likely ending the string
          if ([',', '}', ']', ':'].includes(nextChar) || /\s/.test(nextChar)) {
            inString = false;
            sanitizedJson += char;
          } else {
            // This is likely a quote inside a string, escape it
            sanitizedJson += '\\' + char;
          }
          continue;
        }
        
        sanitizedJson += char;
      }
      
      // Additional fixes for common issues
      
      // Fix missing commas after closing quotes in arrays/objects
      sanitizedJson = sanitizedJson.replace(/"\s*}\s*"/g, '"},{"');
      sanitizedJson = sanitizedJson.replace(/"\s*]\s*"/g, '"],"');
      
      // Remove trailing commas in arrays and objects (which are invalid in JSON)
      sanitizedJson = sanitizedJson.replace(/,\s*}/g, '}');
      sanitizedJson = sanitizedJson.replace(/,\s*]/g, ']');
      
      // Parse the sanitized JSON
      return JSON.parse(sanitizedJson);
    } catch (error) {
      console.error('Error sanitizing or parsing JSON:', error);
      
      // As a fallback, try a more aggressive approach:
      // Find anything that looks like a JSON object
      try {
        const possibleJsonMatch = aiResponse.match(/{[\s\S]*}/);
        if (possibleJsonMatch) {
          // Try to manually fix quotes in reasons which is a common problem area
          let extracted = possibleJsonMatch[0];
          
          // Use a regex to find all reason fields and properly escape quotes within them
          extracted = extracted.replace(/"reason":\s*"(.*?)(?<!\\)"/g, (match, p1) => {
            // Escape unescaped quotes in the reason text
            const escaped = p1.replace(/(?<!\\)"/g, '\\"');
            return `"reason":"${escaped}"`;
          });
          
          return JSON.parse(extracted);
        }
      } catch (fallbackError) {
        console.error('Fallback parsing also failed:', fallbackError);
        return null;
      }
      
      return null;
    }
  }
  
  export default sanitizeAndParseAIResponse;