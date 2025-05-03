#!/usr/bin/env node

/**
 * Database Migration Manager
 * This script manages migrations for both preview and production databases
 */

const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Paths to environment files
const envPreviewPath = path.join(process.cwd(), '.env.preview');
const envProductionPath = path.join(process.cwd(), '.env.production');

// Check if environment files exist
const checkEnvFiles = () => {
  const previewExists = fs.existsSync(envPreviewPath);
  const productionExists = fs.existsSync(envProductionPath);
  
  if (!previewExists || !productionExists) {
    console.log('\n❌ Environment files missing. Please run "pnpm setup-db" first.');
    return false;
  }
  
  return true;
};

// Execute a command and return its output
const runCommand = (command) => {
  try {
    return execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    throw error;
  }
};

// Generate migration for a specific environment
const generateMigration = async (env, name) => {
  console.log(`\n=== Generating migration for ${env} database ===`);
  
  // Switch to the specified environment
  runCommand(`node scripts/switch-env.js ${env === 'preview' ? '2' : '3'}`);
  
  // Generate the migration
  runCommand(`npx prisma migrate dev --name ${name}`);
  
  console.log(`\n✅ Migration generated for ${env} database`);
};

// Apply migrations to both environments
const applyMigrations = async () => {
  // Preview database
  console.log('\n=== Applying migrations to preview database ===');
  runCommand('node scripts/switch-env.js 2');
  runCommand('npx prisma migrate deploy');
  
  // Production database
  console.log('\n=== Applying migrations to production database ===');
  runCommand('node scripts/switch-env.js 3');
  runCommand('npx prisma migrate deploy');
  
  console.log('\n✅ Migrations applied to both databases');
};

// Main function
const main = async () => {
  console.log('=== Slynk AI Database Migration Manager ===');
  
  if (!checkEnvFiles()) {
    rl.close();
    return;
  }
  
  // Check for command line arguments
  const option = process.argv[2];
  
  if (option === '2') {
    // Direct deploy mode
    try {
      await applyMigrations();
    } catch (error) {
      console.error('Error applying migrations:', error);
    }
    rl.close();
    return;
  }
  
  // Interactive mode
  await new Promise(resolve => {
    console.log('\nSelect an option:');
    console.log('1. Generate new migration for both databases');
    console.log('2. Apply existing migrations to both databases');
    
    rl.question('Enter option (1-2): ', async (answer) => {
      switch (answer.trim()) {
        case '1':
          rl.question('\nEnter migration name (e.g., add_user_fields): ', async (name) => {
            if (!name) {
              console.log('\n❌ Migration name is required');
              resolve();
              return;
            }
            
            try {
              // Generate migrations for both environments
              await generateMigration('preview', name);
              await generateMigration('production', name);
              console.log('\n✅ Migrations generated for both databases');
            } catch (error) {
              console.error('Error generating migrations:', error);
            }
            
            resolve();
          });
          break;
          
        case '2':
          try {
            await applyMigrations();
          } catch (error) {
            console.error('Error applying migrations:', error);
          }
          resolve();
          break;
          
        default:
          console.log('\n❌ Invalid option');
          resolve();
          break;
      }
    });
  });
  
  console.log('\n=== Migration Complete ===');
  rl.close();
};

main().catch(err => {
  console.error('Error:', err);
  rl.close();
}); 