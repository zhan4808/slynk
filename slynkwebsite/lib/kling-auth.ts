import jwt from 'jsonwebtoken';

// Cached token and expiration
let cachedToken: string | null = null;
let tokenExpiration: number = 0;
const TOKEN_BUFFER_TIME = 60 * 5; // 5 minutes buffer before expiration

/**
 * Generate a JWT token for Kling API authentication
 * @returns Promise with the authentication token
 */
export async function getKlingAuthToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  // Return cached token if it's still valid
  if (cachedToken && tokenExpiration > (now + TOKEN_BUFFER_TIME)) {
    return cachedToken;
  }
  
  // Get API credentials from environment
  const apiKey = process.env.KLING_API_KEY;
  const apiSecret = process.env.KLING_API_SECRET;
  
  if (!apiKey || !apiSecret) {
    throw new Error('Kling API credentials are missing in environment variables');
  }
  
  try {
    // Set token expiration
    const exp = now + 1800; // 30 minutes
    
    // Create JWT token with proper headers
    const token = jwt.sign(
      {
        iss: apiKey,
        exp: exp,
        nbf: now - 5 // Valid from 5 seconds ago
      },
      apiSecret,
      {
        header: {
          alg: "HS256",
          typ: "JWT"
        }
      }
    );
    
    // Cache the token and its expiration
    cachedToken = token;
    tokenExpiration = exp;
    
    return token;
  } catch (error) {
    console.error('Failed to generate Kling API token:', error);
    throw new Error('Failed to authenticate with Kling API');
  }
}

/**
 * Check if Kling API credentials are configured
 * @returns boolean indicating if credentials are available
 */
export function isKlingConfigured(): boolean {
  return !!(process.env.KLING_API_KEY && process.env.KLING_API_SECRET);
}

/**
 * Force refresh the Kling API token
 * @returns Promise with the new authentication token
 */
export async function refreshKlingToken(): Promise<string> {
  // Reset cached values
  cachedToken = null;
  tokenExpiration = 0;
  
  // Generate a new token
  return getKlingAuthToken();
} 