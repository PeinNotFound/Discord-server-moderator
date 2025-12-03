@echo off
echo Starting Discord Server Moderator Bot...
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

echo Make sure you have:
echo 1. Configured your .env file with your Discord bot token
echo 2. Set up your bot configuration in src/config.js
echo 3. Set up proper bot permissions in Discord
echo.

node index.js
pause