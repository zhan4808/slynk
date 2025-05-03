/**
 * Script to generate Open Graph image for Slynk
 * 
 * This script uses Puppeteer to render an HTML template to a PNG image
 * for use as the Open Graph image for social media sharing.
 * 
 * Usage:
 * 1. Install dependencies: npm install puppeteer
 * 2. Run script: node scripts/generate-og-image.js
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function generateOGImage() {
  console.log('Generating Open Graph image...');
  
  // Create the browser instance
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Path to the template file and output image
  const templatePath = path.join(__dirname, '../public/og/template.html');
  const outputPath = path.join(__dirname, '../public/og/social-preview.png');
  
  // Set the viewport to match OG image dimensions
  await page.setViewport({
    width: 1200,
    height: 630,
    deviceScaleFactor: 1,
  });
  
  // Load the HTML template
  const templateHtml = fs.readFileSync(templatePath, 'utf8');
  await page.setContent(templateHtml, { waitUntil: 'networkidle0' });
  
  // Wait for any images to load
  await page.waitForSelector('img', { timeout: 5000 }).catch(() => {
    console.log('No images found or could not load images, continuing anyway');
  });
  
  // Add a small delay to ensure everything is rendered
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Take a screenshot and save it
  await page.screenshot({
    path: outputPath,
    type: 'png',
    fullPage: false
  });
  
  // Close the browser
  await browser.close();
  
  console.log(`Open Graph image generated at: ${outputPath}`);
}

// Run the function
generateOGImage().catch(error => {
  console.error('Error generating OG image:', error);
  process.exit(1);
}); 