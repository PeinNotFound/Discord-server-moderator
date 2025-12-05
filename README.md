# Discord Server Moderator Bot - v1.0

A comprehensive, feature-rich Discord moderation bot with advanced anti-raid protection, rank system, and server backup capabilities.

![Version](https://img.shields.io/badge/version-1.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)
![Discord.js](https://img.shields.io/badge/discord.js-v14-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## 🌟 Features

### 🔨 Moderation Commands
- **Ban/Kick** - Remove users with reason logging
- **Jail System** - Temporary punishment with auto-unjail
- **Warning System** - 3 warnings = automatic 24h jail
- **Mute System** - Text & voice mute with auto-unmute (1-30 minutes)
- **Message Management** - Clear up to 1000 messages
- **Snipe** - View last deleted message
- **Disconnect** - Remove users from voice channels

### 🎤 Voice Moderation
- **Move Users** - Transfer between voice channels
- **Force Mute/Unmute** - Control entire voice channels
- **Soundboard Control** - Enable/disable for entire channels (admin only)
- **Camera/Stream Control** - Manage video permissions (admin only)
- **Voice Tracking** - Log mute, deafen, and move actions with moderator info

### 🔒 Chat Control
- **Lock/Unlock** - `sed` and `7el` commands (no prefix needed)
- **Permission-based** - Prevents @everyone from typing
- **Quick Access** - Instant channel control

### ✅ Verification System
- **Role-based Verification** - `!vb` and `!vg` commands for verified roles
- **Automatic Unverified Assignment** - New members get unverified role
- **Verification Rooms** - Alerts verificators when unverified members join
- **Hourly Pings** - Automatic @unverified role pings in verification chat
- **Comprehensive Logging** - All verification actions logged
- **Permission Control** - Only verificators and admins can verify users
- **Hidden Commands** - Unauthorized users see "Unknown command"

### ⭐ Staff Rank System
- **7 Rank Tiers** - Trial Staff → Administrator
- **Point-based Progression** - Earn points for better ranks
- **Auto Role Assignment** - Automatic role updates on rank change
- **Admin Management** - Add/remove points with reasons
- **Progress Tracking** - View current rank and next tier requirements
- **Private Notifications** - DM alerts for point/rank changes
- **Comprehensive Logging** - All changes tracked

**Rank Tiers:**
1. 🔰 Trial Staff (0 pts) - Basic mute power
2. 👮 Staff (5 pts) - Mute, deafen, move, nickname changes
3. 🛡️ Moderator (150 pts) - Delete messages, view logs, audit logs
4. ⚔️ Head Moderator (250 pts) - View channels, server insights, manage expressions
5. 👑 Manager (350 pts) - Jail/kick members, mention everyone
6. 💎 Head Manager (650 pts) - Unjail, ban, manage roles/channels
7. ⚡ Administrator (2000 pts) - Full administrator privileges

### 🛡️ Anti-Raid Protection
- **Spam Detection** - Auto-mute spammers (5 messages in 5 seconds)
- **Channel Deletion Protection** - Auto-jail users deleting 3+ channels in 30s
- **Role Deletion Protection** - Auto-jail users deleting 3+ roles in 30s
- **Ban Wave Protection** - Auto-jail users banning 5+ members in 60s
- **Automatic Response** - No manual intervention needed
- **Excludes Admins** - Protection only applies to non-admin users

### 💾 Server Backup System
- **Complete Backups** - Channels, roles, emojis, and settings
- **Easy Restore** - One-command server recovery
- **Multiple Versions** - Keep historical backups
- **Confirmation Required** - Safety system prevents accidents
- **Non-destructive** - Only creates missing items, never deletes

### 📊 Logging System
- **Separate Log Channels** - Dedicated channels for each action type
- **Modern Embeds** - Beautiful, organized log messages
- **Detailed Information** - User, moderator, timestamp, reason
- **Audit Log Integration** - Tracks who performed actions
- **Member Leave Tracking** - Distinguishes kicks/bans from voluntary leaves
- **Nickname Change Tracking** - Logs old/new names with staff member info

---

## 📋 Commands

### Moderation
| Command | Description | Permission |
|---------|-------------|------------|
| `!ban @user [reason]` | Ban a user | Moderator |
| `!kick @user [reason]` | Kick a user | Moderator |
| `!jail @user [time] [reason]` | Jail a user temporarily | Moderator |
| `!unjail @user` | Release from jail | Moderator |
| `!warn @user [reason]` | Warn a user | Moderator |
| `!unwarn @user [#]` | Remove warning | Moderator |
| `!warnings @user` | Check warnings | Moderator |
| `!clear [1-1000]` | Clear messages | Moderator |
| `!snipe` | Show deleted message | Moderator |

### Voice Control
| Command | Description | Permission |
|---------|-------------|------------|
| `!mute @user [1-30]` | Mute user (default 10min) | Voice Mod |
| `!unmute @user` | Unmute user | Voice Mod |
| `!forcemuteall` | Mute all in VC | Voice Mod |
| `!forceunmuteall` | Unmute all in VC | Voice Mod |
| `!move @user [channel_id]` | Move to VC | Voice Mod |
| `!disconnect @user` | Disconnect from VC | Voice Mod |
| `!sb enable/disable` | Control soundboard | Admin |
| `!cam enable/disable` | Control camera/stream | Admin |

### Chat Control
| Command | Description | Permission |
|---------|-------------|------------|
| `sed` | Lock chat | Moderator |
| `7el` | Unlock chat | Moderator |

### Rank System
| Command | Description | Permission |
|---------|-------------|------------|
| `!points` | View your rank | Staff |
| `!rank @user` | View user rank | Rank Admin |
| `!points_add @user [pts] [reason]` | Add points | Rank Admin |
| `!points_minus @user [pts] [reason]` | Remove points | Rank Admin |
| `!rank_help` | Rank system guide | Staff |

### Anti-Raid & Backup
| Command | Description | Permission |
|---------|-------------|------------|
| `!backup` | Create server backup | Admin |
| `!backups` | List backups | Admin |
| `!restore [number]` | Restore from backup | Admin |
| `!antiraid` | View protection status | Admin |
| `!backup_help` | Backup system guide | Admin |

### Premium Role Management
| Command | Description | Permission |
|---------|-------------|------------|
| `!pr_owner @user @role` | Assign user as premium role owner | Admin |
| `!pr_add @user` | Give your managed role to member | Premium Role Owner |
| `!pr_remove @user` | Remove your managed role from member | Premium Role Owner |

### Verification
| Command | Description | Permission |
|---------|-------------|------------|
| `!vb @user` | Verify user (male/neutral) | Verificator/Admin |
| `!vg @user` | Verify user (female) | Verificator/Admin |
| `!vhelp` | Verification help | Everyone |

### Utility
| Command | Description | Permission |
|---------|-------------|------------|
| `!help` | Show commands (3 pages) | Everyone |
| `!debug` | Debug permissions | Everyone |
| `@BotName` | Get help hint | Everyone |

---

## 🚀 Setup

### Prerequisites
- Node.js v16.0.0 or higher
- Discord Bot Token
- Server with Administrator permission for bot

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/discord-server-moderator.git
   cd discord-server-moderator
   ```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure the bot:**
   ```bash
   # Copy example config
   cp src/config.example.js src/config.js
   
   # Copy verification config (optional - for verification system)
   cp src/verification-config.example.js src/verification-config.js
   
   # Edit both config files with your settings
   ```

4. **Required Configuration:**
   
   **Main Config (`src/config.js`):**
   - `DISCORD_TOKEN` - Your bot token
   - `CLIENT_ID` - Your bot's client ID
   - `MODERATOR_ROLES` - Role IDs (comma-separated)
   - `ADMIN_ROLES` - Role IDs (comma-separated)
   - `VOICE_MODERATOR_ROLES` - Role IDs (comma-separated)
   - `RANK_ADMIN_ROLES` - Role IDs (comma-separated)
   - All log channel IDs
   - Role IDs (warn, jail, muted, rank tiers)
   
   **Verification Config (`src/verification-config.js`):**
   - `VERIFIED_ROLE_ID` - Verified role (male/neutral)
   - `VERIFIED_FEMALE_ROLE_ID` - Verified female role
   - `UNVERIFIED_ROLE_ID` - Unverified role
   - `VERIFICATOR_ROLE_ID` - Role that can verify users
   - `VERIFICATION_CMD_CHANNEL_ID` - Channel where commands work
   - `VERIFICATION_CHAT_CHANNEL_ID` - Channel for hourly pings
   - `VERIFICATION_LOG_CHANNEL_ID` - Channel for logs
   - `VERIFICATION_ROOMS` - Array of voice channel IDs
   - `PING_UNVERIFIED_INTERVAL` - Ping interval (default: 3600000ms)

5. **Create required roles:**
   - Warned
   - Jailed
   - Muted
   - Trial Staff → Administrator (7 rank roles)

6. **Create log channels:**
   - jail-logs
   - warn-logs
   - mute-logs
   - ban-logs
   - kick-logs
   - nickname-logs
   - voice-mod-logs
   - move-logs
   - member-leave-logs
   - rank-logs
   - verification-logs (if using verification system)

7. **Create verification roles (if using verification system):**
   - Verified (male/neutral)
   - Verified Female
   - Unverified
   - Verificator

8. **Start the bot:**
```bash
npm start
```

   Or for development:
```bash
npm run dev
```

   Or on Windows:
   ```bash
   start.bat
   ```

   Or run standalone (from this folder):
   ```bash
   node index.js
   ```

---

## 🔧 Bot Permissions

The bot requires these Discord permissions:
- Administrator (recommended)

Or individually:
- Manage Roles
- Manage Channels
- Kick Members
- Ban Members
- Manage Messages
- Read Message History
- Send Messages
- Embed Links
- Attach Files
- Manage Nicknames
- Move Members
- Mute Members
- Deafen Members
- View Audit Log

---

## 📁 Project Structure

```
Discord-server-moderator/
├── index.js                  # Standalone entry point (sets NODE_PATH)
├── src/
│   ├── bot.js                # Main bot file
│   ├── config.js             # Main configuration (not in git)
│   ├── config.example.js     # Main configuration template
│   ├── verification-config.js        # Verification config (not in git)
│   ├── verification-config.example.js # Verification config template
│   ├── ranks.js             # Rank system module
│   ├── anti-raid.js         # Anti-raid protection module
│   ├── verification.js      # Verification system module
│   ├── moderation-data.json # Moderation data (auto-generated)
│   ├── ranks-data.json      # Rank data (auto-generated)
│   └── backups/             # Server backups (auto-created)
├── package.json              # Project metadata
├── start.bat                 # Windows startup script
└── README.md                 # This file
```

---

## 💡 Usage Examples

### Creating a Backup
```
Admin: !backup
Bot: ⏳ Creating server backup...
Bot: ✅ Server Backup Created
     📁 Filename: backup_ServerName_2025-10-29.json
     📊 Total Backups: 3
```

### Restoring from Backup
```
Admin: !backups
Bot: [Shows list of backups]

Admin: !restore 1
Bot: [Shows confirmation]

Admin: confirm
Bot: ⏳ Restoring server from backup...
Bot: ✅ Server Restored Successfully
```

### Adding Points
```
Admin: !points_add @Staff 10 Great moderation work
Bot: [Modern embed showing point addition]
Staff: [Receives DM notification]
```

### Warning System
```
Mod: !warn @User Spamming in chat
Bot: ✅ Warned User | Total Warnings: 1/3

Mod: !warn @User Disrespectful behavior
Bot: ✅ Warned User | Total Warnings: 2/3

Mod: !warn @User Ignoring moderators
Bot: ⚠️ User has been auto-jailed for 24 hours (3 warnings)
```

---

## 🛡️ Security Features

- ✅ **Admin-only Commands** - Backup/restore hidden from non-admins
- ✅ **Confirmation Required** - Destructive actions need confirmation
- ✅ **Audit Logging** - All actions tracked with moderator info
- ✅ **Role Hierarchy** - Respects Discord role permissions
- ✅ **Rate Limiting** - Built-in protection against spam
- ✅ **Auto-cleanup** - Old tracking data automatically removed
- ✅ **Silent Fails** - Admin commands invisible to regular users

---

## 📊 Performance

### Capacity
- **Small Server** (100-500 members): ⚡ Excellent
- **Medium Server** (500-2K members): ✅ Great
- **Large Server** (2K-5K members): ✅ Good
- **Very Large** (5K-10K members): ⚠️ Fair (voice tracking may lag)

### Resource Usage
- **RAM:** 50-100 MB
- **Storage:** < 20 MB (for 10K members)
- **CPU:** Minimal (< 5% on modern hardware)

---

## 🔄 Version History

### v1.0 (Current)
- ✅ Complete moderation suite
- ✅ Staff rank system with 7 tiers
- ✅ Anti-raid protection (spam, deletion, ban waves)
- ✅ Server backup and restore system
- ✅ Comprehensive logging system
- ✅ Voice moderation and tracking
- ✅ Modern embeds and user tagging
- ✅ Clean, optimized code for production

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🆘 Support

If you need help:
1. Check the `!help` command in Discord
2. Use `!backup_help` for backup system guide
3. Use `!rank_help` for rank system guide
4. Review this README
5. Check the issues on GitHub

---

## ⚠️ Disclaimer

This bot is provided as-is. Always test in a development server before deploying to production. Keep your bot token and config.js file secure and never commit them to public repositories.

---

## 🎯 Roadmap

Future features being considered:
- [ ] Web dashboard
- [ ] Database support (MongoDB/PostgreSQL)
- [ ] Advanced analytics
- [ ] Custom command creation
- [ ] Ticket system
- [ ] Welcome/goodbye messages
- [ ] Auto-moderation rules
- [ ] Reaction roles

---

**Made with ❤️ for Discord server moderation**

*Version 1.0 - Ready for production use*
