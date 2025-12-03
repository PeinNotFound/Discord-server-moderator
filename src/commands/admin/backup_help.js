const { safeReply } = require('../../utils/logger.js');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'backup_help',
    aliases: ['backuphelp'],
    description: 'Show backup & restore system guide (Admin only)',
    usage: '!backup_help',
    permission: 'admin',
    
    async execute(message, args, client) {
        if (!client.permissions.hasPermission(message.member, 'admin')) {
            return; // Silent fail - act as unknown command
        }
        
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('💾 Backup & Restore System Guide')
            .setDescription('**Complete guide to protecting your server**')
            .addFields(
                {
                    name: '📋 Creating Backups',
                    value: 
                        '**`!backup`** - Creates a complete server backup\n' +
                        '• Saves all channels (categories, text, voice)\n' +
                        '• Saves all roles (permissions, colors, positions)\n' +
                        '• Saves all emojis\n' +
                        '• Saves server settings\n' +
                        '• Stored locally in bot directory',
                    inline: false
                },
                {
                    name: '📁 Viewing Backups',
                    value: 
                        '**`!backups`** - Lists all available backups\n' +
                        '• Shows backup number, filename, size, and date\n' +
                        '• Most recent backups shown first\n' +
                        '• Use the number to restore',
                    inline: false
                },
                {
                    name: '🔄 Restoring from Backup',
                    value: 
                        '**`!restore [number]`** - Restores server from backup\n' +
                        '• Example: `!restore 1`\n' +
                        '• Requires confirmation (type "confirm")\n' +
                        '• 30-second timeout for safety\n' +
                        '• Only creates missing channels/roles\n' +
                        '• **Does NOT delete** existing items\n' +
                        '• Safe to use anytime',
                    inline: false
                },
                {
                    name: '⚠️ When to Use',
                    value: 
                        '**Create backups:**\n' +
                        '• Before giving admin perms to new staff\n' +
                        '• After major server updates\n' +
                        '• Daily/weekly for active servers\n\n' +
                        '**Restore backups when:**\n' +
                        '• Server gets raided (channels/roles deleted)\n' +
                        '• Bot gets kicked and rejoins\n' +
                        '• Need to recover deleted content\n' +
                        '• Accidental mass deletion',
                    inline: false
                },
                {
                    name: '🛡️ Anti-Raid Protection',
                    value: 
                        '**`!antiraid`** - View protection status\n' +
                        '• Auto-detects spam (5 msgs in 5s → 1min mute)\n' +
                        '• Auto-jails channel deleters (3 in 30s)\n' +
                        '• Auto-jails role deleters (3 in 30s)\n' +
                        '• Auto-jails ban wavers (5 in 60s)\n' +
                        '• All protection is automatic',
                    inline: false
                },
                {
                    name: '💡 Best Practices',
                    value: 
                        '• Create backups regularly\n' +
                        '• Keep multiple backup versions\n' +
                        '• Test restore in a test server first\n' +
                        '• Only give admin role to trusted members\n' +
                        '• Monitor anti-raid logs',
                    inline: false
                }
            )
            .setFooter({ text: 'These commands are admin-only for security' })
            .setTimestamp();
        
        await safeReply(message, { embeds: [embed] });
    }
};
