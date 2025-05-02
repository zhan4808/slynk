require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');

const KLING_API_KEY = process.env.KLING_API_KEY;
const KLING_API_SECRET = process.env.KLING_API_SECRET;
const KLING_API_URL = 'https://api.klingai.com';

// Generate JWT token for Kling API authentication
function generateKlingToken() {
  if (!KLING_API_KEY || !KLING_API_SECRET) {
    throw new Error('Kling API credentials are missing in environment variables');
  }
  
  const now = Math.floor(Date.now() / 1000);
  
  // Create JWT token with proper headers and payload format
  return jwt.sign(
    {
      iss: KLING_API_KEY,
      exp: now + 1800, // Valid for 30 minutes
      nbf: now - 5 // Valid from 5 seconds ago
    }, 
    KLING_API_SECRET,
    {
      header: {
        alg: "HS256",
        typ: "JWT"
      }
    }
  );
}

async function checkKlingConfig() {
  console.log('Checking Kling API configuration...');
  
  if (!KLING_API_KEY || !KLING_API_SECRET) {
    console.error('❌ Missing Kling API credentials in environment variables');
    console.log('Please add KLING_API_KEY and KLING_API_SECRET to your .env file');
    console.log('You can obtain these from your Kling AI account dashboard');
    return false;
  }
  
  try {
    // Generate token
    const token = generateKlingToken();
    console.log('✅ Successfully generated JWT token');
    console.log('Token:', token);
    
    // Try listing existing video tasks (should be a safer endpoint)
    const response = await axios.get(`${KLING_API_URL}/v1/videos/image2video`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params: {
        pageNum: 1,
        pageSize: 5
      }
    });
    
    if (response.status === 200) {
      console.log('✅ Kling API connection successful');
      console.log('Recent video tasks:');
      console.log(JSON.stringify(response.data, null, 2));
      return true;
    } else {
      console.error('❌ Kling API returned an unexpected response:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Error connecting to Kling API:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
    
    console.log('\nTroubleshooting tips:');
    console.log('1. Verify your API keys are correct');
    console.log('2. Check if your network can reach the Kling API servers');
    console.log('3. Contact Kling support if issues persist');
    console.log('4. Make sure your Kling account has permissions for the image2video API');
    
    return false;
  }
}

// Execute the check
checkKlingConfig()
  .then(success => {
    if (!success) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  }); 