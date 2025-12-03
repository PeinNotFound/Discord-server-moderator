# Discord Bot Dashboard

## Setup Instructions

1. **Configure Environment Variables**:
   - Copy the `.env.example` file to `.env` in the root directory
   - Fill in your Discord bot token and other required values

2. **Start the Dashboard**:
   ```bash
   cd dashboard
   node server.js
   ```

3. **Access the Dashboard**:
   - Open your browser and go to `http://localhost:3000`

## Environment Variables

The following environment variables are required:

- `DISCORD_TOKEN`: Your Discord bot token
- `CLIENT_ID`: Your Discord application client ID
- `SESSION_SECRET`: Secret key for session management
- `DISCORD_CLIENT_SECRET`: Your Discord application client secret
- `CALLBACK_URL`: OAuth callback URL (default: http://localhost:3000/callback)
- `USE_AUTH`: Enable/disable Discord OAuth (true/false)

## Configuration Files

The dashboard allows you to edit all bot configuration variables through the web interface:
- Main configuration (`src/config/config.js`)
- Verification configuration (`src/config/verification-config.js`)

Changes made through the dashboard are saved directly to these files.