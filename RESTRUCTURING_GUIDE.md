# 🏗️ Bot Restructuring Guide

## Overview
The bot has been restructured from a monolithic 3314-line `bot.js` into a clean, modular architecture for better maintainability and scalability.

---

## 📁 New Directory Structure

```
src/
├── bot-new.js                      # ✅ CREATED - Clean main entry (129 lines)
├── config/
│   ├── config.example.js           # ✅ MOVED from src/
│   └── verification-config.example.js # ✅ MOVED from src/
├── utils/
│   ├── permissions.js              # ✅ CREATED - Permission management
│   ├── logger.js                   # ✅ CREATED - Centralized logging
│   └── dataManager.js              # ✅ CREATED - JSON data persistence
├── modules/
│   ├── ranks.js                    # ✅ MOVED from src/
│   ├── anti-raid.js                # ✅ MOVED from src/
│   └── verification.js             # ✅ MOVED from src/
├── events/                         # ⏳ TO CREATE
│   ├── ready.js
│   ├── messageCreate.js
│   ├── messageDelete.js
│   ├── voiceStateUpdate.js
│   ├── guildMemberAdd.js
│   ├── guildMemberRemove.js
│   └── guildMemberUpdate.js
├── commands/                       # ⏳ TO CREATE
│   ├── moderation/
│   │   ├── ban.js
│   │   ├── kick.js
│   │   ├── unban.js
│   │   ├── jail.js
│   │   ├── unjail.js
│   │   ├── warn.js
│   │   ├── unwarn.js
│   │   ├── warnings.js
│   │   ├── mute.js
│   │   ├── unmute.js
│   │   └── clear.js
│   ├── voice/
│   │   ├── move.js
│   │   ├── disconnect.js
│   │   ├── forcemuteall.js
│   │   ├── forceunmuteall.js
│   │   ├── soundboard.js
│   │   └── camera.js
│   ├── utility/
│   │   ├── help.js
│   │   ├── snipe.js
│   │   ├── debug.js
│   │   ├── backup.js
│   │   ├── backups.js
│   │   ├── restore.js
│   │   └── antiraid.js
│   ├── chat/
│   │   ├── lock.js  (sed command)
│   │   └── unlock.js (7el command)
│   └── ranks/
│       ├── points.js
│       ├── rank.js
│       ├── points_add.js
│       ├── points_minus.js
│       └── rank_help.js
└── handlers/                       # ⏳ TO CREATE (optional)
    ├── commandHandler.js
    └── eventHandler.js
```

---

## ✅ Completed Work

### 1. **Utils Created** (3 files)
- `utils/permissions.js` - Class-based permission management
- `utils/logger.js` - Centralized action logging + safeReply helper  
- `utils/dataManager.js` - JSON file persistence abstraction

### 2. **Files Moved**
- `config.example.js` → `config/config.example.js`
- `verification-config.example.js` → `config/verification-config.example.js`
- `ranks.js` → `modules/ranks.js`
- `anti-raid.js` → `modules/anti-raid.js`
- `verification.js` → `modules/verification.js`

### 3. **New Main Entry**
- `bot-new.js` created - Clean, event-driven architecture (129 lines vs 3314 lines)

---

## ⏳ Next Steps

### Step 1: Create Event Files
Each event file follows this pattern:

```javascript
// events/ready.js
const antiRaid = require('../modules/anti-raid.js');
const verification = require('../modules/verification.js');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`✅ ${client.user.tag} is online!`);
        console.log(`📊 Serving ${client.guilds.cache.size} servers`);
        client.user.setActivity('Moderating servers', { type: 'WATCHING' });
        
        // Initialize modules
        antiRaid.initAntiRaid(client, client.config);
        verification.initVerification(client, client.config);
    }
};
```

### Step 2: Create Command Files  
Each command file follows this pattern:

```javascript
// commands/moderation/ban.js
const { EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'ban',
    description: 'Ban a user from the server',
    permission: 'moderation',
    
    async execute(message, args, client) {
        if (!client.permissions.hasPermission(message.member, this.permission)) {
            return await safeReply(message, '❌ You don\'t have permission to use this command!');
        }

        // Command logic here
        let target = message.mentions.members.first();
        let userId = args[0];
        
        // ... (extract from bot.js lines 813-885)
    }
};
```

### Step 3: Update Module Requires
Update these files to use new paths:
- `modules/anti-raid.js` - Change `require('./config.js')` to `require('../config/config.js')`
- `modules/verification.js` - Same path updates
- `modules/ranks.js` - Same path updates

### Step 4: Create Config File
User needs to copy:
```bash
cp src/config/config.example.js src/config/config.js
cp src/config/verification-config.example.js src/config/verification-config.js
```

### Step 5: Update package.json
```json
{
  "main": "src/bot-new.js",
  "scripts": {
    "start": "node src/bot-new.js",
    "dev": "nodemon src/bot-new.js"
  }
}
```

---

## 🎯 Benefits of New Structure

### Before (Monolithic)
- ❌ Single file: 3,314 lines
- ❌ Mixed concerns (commands, events, utils)
- ❌ Hard to maintain/debug
- ❌ Difficult to test
- ❌ No code reusability

### After (Modular)
- ✅ Main entry: 129 lines
- ✅ Separated concerns
- ✅ Easy to find/fix bugs
- ✅ Individual file testing
- ✅ Reusable utilities
- ✅ Scalable architecture
- ✅ Team-friendly structure

---

## 📝 Command Template

Use this template for creating new command files:

```javascript
const { EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'commandname',
    description: 'Command description',
    usage: '!commandname [args]',
    permission: 'moderation', // 'moderation', 'voice', 'admin', 'rank_admin', or null
    aliases: ['alias1', 'alias2'],
    
    async execute(message, args, client) {
        // Permission check
        if (this.permission && !client.permissions.hasPermission(message.member, this.permission)) {
            return await safeReply(message, '❌ You don\'t have permission!');
        }

        // Command logic here
        try {
            // Your code
            
            // Log action if needed
            await client.logger.logAction(
                message.guild,
                'ACTION_TYPE',
                message.member,
                target,
                reason
            );
            
            // Save data if needed
            client.dataManager.set('key', value);
            
        } catch (error) {
            await safeReply(message, `❌ Error: ${error.message}`);
        }
    }
};
```

---

## 📝 Event Template

```javascript
module.exports = {
    name: 'eventName',
    once: false, // or true for one-time events like 'ready'
    
    async execute(...args) {
        const client = args[args.length - 1]; // Client is always last arg
        
        // Event logic here
    }
};
```

---

## 🔄 Migration Strategy

### Option 1: Gradual Migration (Recommended)
1. Keep `bot.js` as backup (`bot-old.js`)
2. Test `bot-new.js` with a few commands
3. Gradually extract commands from `bot-old.js` to new structure
4. Once stable, delete `bot-old.js`

### Option 2: Complete Rewrite  
1. Extract all command logic from `bot.js`  
2. Create all command/event files at once
3. Test thoroughly
4. Switch to `bot-new.js`

---

## 🧪 Testing Checklist

- [ ] Bot starts successfully
- [ ] Config loads correctly
- [ ] Events fire properly
- [ ] Commands execute
- [ ] Permissions work
- [ ] Logging functions
- [ ] Data persists
- [ ] Modules initialize
- [ ] Error handling works
- [ ] Old data migrates

---

## 🚀 Running the New Structure

```bash
# Install dependencies (if needed)
npm install

# Start with new structure
node src/bot-new.js

# Or use npm script (after updating package.json)
npm start
```

---

## 📚 File Organization Rules

1. **Commands** - One command per file, grouped by category
2. **Events** - One event per file
3. **Utils** - Reusable functions/classes
4. **Modules** - Large feature systems (ranks, verification, anti-raid)
5. **Config** - Configuration files only

---

## 🛠️ Maintenance Tips

1. **Adding New Command**: Create file in appropriate `commands/` folder
2. **Adding New Event**: Create file in `events/` folder
3. **Adding Utility**: Add to existing or create new file in `utils/`
4. **Modifying Module**: Edit in `modules/` folder
5. **Auto-loading**: Bot automatically loads all commands/events on startup

---

## ⚠️ Important Notes

1. **Don't delete `bot.js` yet** - Keep as reference until migration complete
2. **Update all requires** - Check relative paths in moved files
3. **Test incrementally** - Don't migrate everything at once
4. **Backup data** - Copy `moderation-data.json` and `ranks-data.json` before testing
5. **Check imports** - Ensure all modules import correctly from new locations

---

## 📞 Help & Support

If you encounter issues during restructuring:
1. Check file paths in require() statements
2. Verify all files are in correct directories
3. Ensure config files exist (not just .example files)
4. Check console for detailed error messages
5. Test one command at a time

---

**Status**: 🟡 IN PROGRESS - Core structure created, commands need extraction

**Next Action**: Extract commands from `bot.js` into individual command files

**Estimated Work**: 30-40 command files + 7 event files = ~2-3 hours
