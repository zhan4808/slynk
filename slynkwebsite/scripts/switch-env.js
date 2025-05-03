#!/usr/bin/env node

/**
 * Database Environment Switcher
 * This script switches between preview and production database environments
 * by generating the appropriate .env files
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Paths to environment files
const envLocalPath = path.join(process.cwd(), '.env.local');
const envPreviewPath = path.join(process.cwd(), '.env.preview');
const envProductionPath = path.join(process.cwd(), '.env.production');

// Template for preview environment
const createPreviewEnvTemplate = (answers) => {
  return `# Preview Environment Database Configuration
DATABASE_URL="${answers.previewDatabaseUrl}"
DIRECT_URL="${answers.previewDatabaseUrl}"
DATABASE_ENV="preview"
`;
};

// Template for production environment
const createProductionEnvTemplate = (answers) => {
  return `# Production Environment Database Configuration
DATABASE_URL="${answers.productionDatabaseUrl}"
DIRECT_URL="${answers.productionDatabaseUrl}"
DATABASE_ENV="production"
`;
};

// Ask questions for both environments
const askQuestions = async () => {
  const answers = {};
  
  console.log('\n=== Preview Database Configuration ===');
  await new Promise(resolve => {
    rl.question('Preview Database URL (postgresql://username:password@host:port/preview_db): ', (answer) => {
      answers.previewDatabaseUrl = answer.trim();
      resolve();
    });
  });
  
  console.log('\n=== Production Database Configuration ===');
  await new Promise(resolve => {
    rl.question('Production Database URL (postgresql://username:password@host:port/production_db): ', (answer) => {
      answers.productionDatabaseUrl = answer.trim();
      resolve();
    });
  });
  
  return answers;
};

// Set active environment
const setActiveEnvironment = async (envType) => {
  const sourcePath = envType === 'preview' ? envPreviewPath : envProductionPath;
  
  if (!fs.existsSync(sourcePath)) {
    console.log(`\n❌ ${envType === 'preview' ? '.env.preview' : '.env.production'} does not exist. Run setup first.`);
    return false;
  }
  
  // Read the source env file
  const envContent = fs.readFileSync(sourcePath, 'utf8');
  
  // Write to .env.local to activate this environment
  fs.writeFileSync(envLocalPath, envContent);
  
  console.log(`\n✅ Switched to ${envType} database environment!`);
  return true;
};

// Main function
const main = async () => {
  console.log('=== Slynk AI Database Environment Manager ===');
  
  // Check for command line arguments
  const option = process.argv[2];
  
  if (option === '2') {
    // Automatically switch to preview
    await setActiveEnvironment('preview');
    rl.close();
    return;
  } else if (option === '3') {
    // Automatically switch to production
    await setActiveEnvironment('production');
    rl.close();
    return;
  }
  
  // Interactive mode
  await new Promise(resolve => {
    console.log('\nSelect an option:');
    console.log('1. Set up both preview and production database environments');
    console.log('2. Switch to preview database');
    console.log('3. Switch to production database');
    
    rl.question('Enter option (1-3): ', async (answer) => {
      switch (answer.trim()) {
        case '1':
          const answers = await askQuestions();
          
          // Create preview env file
          fs.writeFileSync(envPreviewPath, createPreviewEnvTemplate(answers));
          console.log('\n✅ .env.preview file created!');
          
          // Create production env file
          fs.writeFileSync(envProductionPath, createProductionEnvTemplate(answers));
          console.log('✅ .env.production file created!');
          
          // Ask which environment to activate
          rl.question('\nWhich environment do you want to activate now? (preview/production): ', async (env) => {
            if (env.toLowerCase() === 'preview' || env.toLowerCase() === 'production') {
              await setActiveEnvironment(env.toLowerCase());
            } else {
              console.log('\n❌ Invalid option. No environment activated.');
            }
            resolve();
          });
          break;
          
        case '2':
          await setActiveEnvironment('preview');
          resolve();
          break;
          
        case '3':
          await setActiveEnvironment('production');
          resolve();
          break;
          
        default:
          console.log('\n❌ Invalid option.');
          resolve();
          break;
      }
    });
  });
  
  console.log('\n=== Next Steps ===');
  console.log('1. Run prisma db push to apply any schema changes to the active database');
  console.log('2. Use "pnpm switch-db" to switch between environments as needed');
  console.log('3. Use "pnpm db-preview" or "pnpm db-production" to quickly switch and sync schema');
  
  rl.close();
};

main().catch(err => {
  console.error('Error:', err);
  rl.close();
}); 