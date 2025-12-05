const antiRaid = require('../../modules/anti-raid.js');
const { safeReply } = require('../../utils/logger.js');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'antiraid',
    aliases: ['raidstatus'],
    description: 'Show anti-raid protection status (Admin only)',
    usage: '!antiraid',
    permission: 'admin',
    
    async execute(message, args, client) {
        if (!client.permissions.hasPermission(message.member, 'admin')) {
            return; // Silent fail - act as unknown command
        }
        
        const stats = antiRaid.getBackupStats(message.guild.id);
        const config = antiRaid.ANTI_RAID_CONFIG;
        
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('🛡️ Anti-Raid Protection Status')
            .setDescription('**Current Protection Settings**')
            .addFields(
                { 
                    name: '🚫 Spam Detection', 
                    value: `• ${config.SPAM_MESSAGE_COUNT} messages in ${config.SPAM_TIME_WINDOW / 1000}s → Mute ${config.SPAM_MUTE_DURATION} min\n• Status: ✅ Active`,
                    inline: false 
                },
                { 
                    name: '🗑️ Channel Deletion Protection', 
                    value: `• ${config.CHANNEL_DELETE_COUNT} deletions in ${config.CHANNEL_DELETE_TIME_WINDOW / 1000}s → Jail\n• Status: ✅ Active`,
                    inline: false 
                },
                { 
                    name: '🎭 Role Deletion Protection', 
                    value: `• ${config.ROLE_DELETE_COUNT} deletions in ${config.ROLE_DELETE_TIME_WINDOW / 1000}s → Jail\n• Status: ✅ Active`,
                    inline: false 
                },
                { 
                    name: '🔨 Ban Wave Protection', 
                    value: `• ${config.BAN_COUNT} bans in ${config.BAN_TIME_WINDOW / 1000}s → Jail\n• Status: ✅ Active`,
                    inline: false 
                },
                {
                    name: '💾 Server Backups',
                    value: `• Total backups: ${stats.count}\n• Last backup: ${stats.backups[0] ? stats.backups[0].created.toLocaleString() : 'None'}`,
                    inline: false
                }
            )
            .setFooter({ text: 'Use !backup to create a new server backup' })
            .setTimestamp();
        
        await safeReply(message, { embeds: [embed] });
    }
};
