// Simple index.js to run the moderator bot locally
// This file sets up NODE_PATH to use root node_modules and starts the bot

const path = require('path');
const fs = require('fs');

// Load environment variables from .env file
require('dotenv').config();

// Set up environment to use root node_modules (or local if they exist)
const rootNodeModules = path.join(__dirname, '..', 'node_modules');
const localNodeModules = path.join(__dirname, 'node_modules');

// Check if root node_modules exists, otherwise use local
const nodeModulesPath = fs.existsSync(rootNodeModules) 
    ? rootNodeModules 
    : localNodeModules;

// Set NODE_PATH environment variable
process.env.NODE_PATH = nodeModulesPath;

// Ensure NODE_PATH is recognized by require
require('module').Module._initPaths();

console.log('🚀 Starting Discord Server Moderator Bot...');
console.log(`📦 Using node_modules from: ${nodeModulesPath}\n`);

// Start the bot
try {
    require('./src/bot.js');
} catch (error) {
    console.error('❌ Error starting bot:', error);
    process.exit(1);
}

// Handle cleanup on exit
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down bot...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down bot...');
    process.exit(0);
});