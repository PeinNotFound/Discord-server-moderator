# 🚀 Deployment Guide - Version 1.0

## Quick Start for GitHub

### First Time Setup

1. **Initialize Git (if not already done):**
   ```bash
   git init
   ```

2. **Add all files:**
   ```bash
   git add .
   ```

3. **Create initial commit:**
   ```bash
   git commit -m "Initial commit - v1.0 - Complete Discord moderation bot"
   ```

4. **Create GitHub repository:**
   - Go to https://github.com/new
   - Name: `discord-server-moderator` (or your choice)
   - Description: "A comprehensive Discord moderation bot with anti-raid protection, rank system, and backup capabilities"
   - Keep it **Public** or **Private** (your choice)
   - **DO NOT** initialize with README (you already have one)
   - Click "Create repository"

5. **Link to GitHub:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/discord-server-moderator.git
   git branch -M main
   git push -u origin main
   ```

### Important Notes

⚠️ **Files NOT pushed to GitHub (protected by .gitignore):**
- `src/config.js` - Your bot token and settings
- `node_modules/` - Dependencies (users install via npm)
- `src/moderation-data.json` - Server-specific data
- `src/ranks-data.json` - Server-specific data
- `src/backups/` - Server backups

✅ **Files pushed to GitHub:**
- `src/config.example.js` - Template for users
- All code files
- README.md
- LICENSE
- .gitignore
- package.json

---

## Updating Your Repository

After making changes:

```bash
# Check what changed
git status

# Add changed files
git add .

# Commit with message
git commit -m "Description of changes"

# Push to GitHub
git push
```

---

## Version Tags

To tag releases:

```bash
# Create version tag
git tag -a v1.0 -m "Version 1.0 - Initial Release"

# Push tags
git push --tags
```

---

## Deployment to Server

### Using VPS (Ubuntu/Debian)

1. **Install Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Clone repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/discord-server-moderator.git
   cd discord-server-moderator
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Configure:**
   ```bash
   cp src/config.example.js src/config.js
   nano src/config.js
   # Fill in your settings
   ```

5. **Run with PM2 (keeps bot alive):**
   ```bash
   npm install -g pm2
   pm2 start src/index.js --name discord-bot
   pm2 save
   pm2 startup
   ```

### Using Windows Server

1. **Install Node.js:**
   - Download from https://nodejs.org/
   - Install with default settings

2. **Clone repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/discord-server-moderator.git
   cd discord-server-moderator
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Configure:**
   ```bash
   copy src\config.example.js src\config.js
   notepad src\config.js
   # Fill in your settings
   ```

5. **Run:**
   ```bash
   start.bat
   ```

   Or use Task Scheduler to run on startup.

---

## Keeping Bot Updated

### Pull latest changes:
```bash
git pull origin main
npm install  # Update dependencies if needed
pm2 restart discord-bot  # Restart bot
```

---

## Environment Variables (Alternative to config.js)

For added security, you can use environment variables:

1. **Create `.env` file:**
   ```env
   DISCORD_TOKEN=your_token_here
   CLIENT_ID=your_client_id
   ```

2. **Install dotenv:**
   ```bash
   npm install dotenv
   ```

3. **Modify src/index.js:**
   ```javascript
   require('dotenv').config();
   // Use process.env.DISCORD_TOKEN instead of config.DISCORD_TOKEN
   ```

---

## Backup Important Files

Always backup:
- `src/config.js` (your settings)
- `src/moderation-data.json` (warnings, jails)
- `src/ranks-data.json` (staff points)
- `src/backups/` folder (server backups)

Store these securely, separate from the public repository!

---

## Troubleshooting

### Bot won't start:
- Check `src/config.js` exists
- Verify bot token is correct
- Ensure all role IDs are valid
- Check Node.js version (must be 16+)

### Commands not working:
- Verify bot has Administrator permission
- Check role IDs in config match your server
- Ensure bot is online
- Use `!debug` command to check permissions

### Push to GitHub fails:
- Check remote URL: `git remote -v`
- Verify GitHub credentials
- Try: `git push -f origin main` (force push, use carefully)

---

## Security Checklist

Before pushing to GitHub:

- [ ] `src/config.js` is in `.gitignore`
- [ ] No bot token in any committed files
- [ ] No sensitive server data committed
- [ ] `.env` file (if used) is in `.gitignore`
- [ ] README doesn't contain real tokens/IDs

---

## Support

Need help deploying?
1. Check GitHub Issues
2. Review error logs: `pm2 logs` or console output
3. Verify all configuration steps completed

---

**Ready to deploy! 🚀**

Version 1.0 - Production Ready

