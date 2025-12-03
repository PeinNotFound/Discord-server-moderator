# Discord Server Moderator Bot Setup Guide

## Prerequisites
- Node.js v16.0.0 or higher
- A Discord account
- A Discord server where you have administrator permissions

## Step 1: Create a Discord Application

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Give your application a name and click "Create"
4. On the left sidebar, click "Bot"
5. Click "Add Bot" and confirm
6. Under "Token", click "Reset Token" and copy the token (you'll need this later)
7. Under "Privileged Gateway Intents", enable:
   - PRESENCE INTENT
   - SERVER MEMBERS INTENT
   - MESSAGE CONTENT INTENT

## Step 2: Configure Environment Variables

1. In the root directory, you'll find a `.env` file
2. Open it with a text editor and replace the placeholder values:
   ```
   DISCORD_TOKEN=your_actual_bot_token_here
   CLIENT_ID=your_application_client_id_here
   SESSION_SECRET=generate_a_random_string_here
   DISCORD_CLIENT_SECRET=your_discord_client_secret_here
   ```

To find your CLIENT_ID:
1. Go back to your Discord application page
2. On the left sidebar, click "OAuth2" → "General"
3. Copy the "Client ID"

To get your DISCORD_CLIENT_SECRET:
1. On the same "OAuth2" → "General" page
2. Click "Reset Secret" under "Client Secret" and copy it

## Step 3: Configure Bot Permissions

1. In your Discord application page, go to "OAuth2" → "URL Generator"
2. Under "Scopes", select:
   - bot
   - applications.commands
3. Under "Bot Permissions", select:
   - Administrator (recommended) OR
   - Specific permissions including:
     - View Channels
     - Send Messages
     - Manage Messages
     - Ban Members
     - Kick Members
     - Manage Roles
     - View Audit Log
     - Connect
     - Speak
     - Move Members
4. Copy the generated URL and paste it in your browser to invite the bot to your server

## Step 4: Configure Bot Settings

1. Edit `src/config/config.js` to set up your roles, channels, and other settings
2. If using verification, edit `src/config/verification-config.js`

## Step 5: Install Dependencies

```bash
npm install
```

## Step 6: Start the Bot

```bash
npm start
```

Or on Windows:
```bash
start.bat
```

## Starting the Dashboard

1. Navigate to the dashboard directory:
   ```bash
   cd dashboard
   ```
2. Start the dashboard server:
   ```bash
   node server.js
   ```
3. Open your browser and go to `http://localhost:3000`

## Troubleshooting

### "Invalid Token" Error
- Make sure you copied the correct bot token from the Discord Developer Portal
- Ensure there are no extra spaces or characters in your DISCORD_TOKEN value
- Verify that your bot token hasn't expired (tokens expire if you reset them)

### Bot Not Responding
- Check that the bot has the required permissions in your server
- Verify that the bot is actually online (check the Discord client)
- Make sure you're using the correct prefix (default is `!`)

### Dashboard Not Loading
- Ensure all environment variables are correctly set
- Check that the dashboard server is running on the correct port
- Verify that your Discord application is configured with the correct OAuth2 settings