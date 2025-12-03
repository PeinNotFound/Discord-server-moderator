const rankSystem = require('../../modules/ranks.js');
const { EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'rank_help',
    aliases: ['rankhelp'],
    description: 'Show complete rank system guide',
    usage: '!rank_help',
    permission: null,
    
    async execute(message, args, client) {
        try {
            // Check if rank system is configured
            if (!client.config.trialStaffRoleId || client.config.trialStaffRoleId.includes('your_')) {
                return await safeReply(message, '⚠️ Rank system is not configured. Please set up rank role IDs in the configuration.');
            }
            
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🏆 Staff Rank System Guide')
                .setDescription('Complete guide to the rank progression system and point earning')
                .addFields(
                    {
                        name: '🔰 Rank Tiers',
                        value: `
🔰 **Trial Staff** (0 pts) - Mute power
👮 **Staff** (5 pts) - Mute, Deafen, Move, Change nickname
🛡️ **Moderator** (150 pts) - All Staff perms + Delete messages + Logs
⚔️ **Head Moderator** (250 pts) - All Mod perms + View channels + Insights
👑 **Manager** (350 pts) - All Head Mod perms + Jail + Kick + Mention @everyone
💎 **Head Manager** (650 pts) - All Manager perms + Unjail + Ban + Manage roles/channels
⚡ **Administrator** (2000 pts) - Administrator privilege
                        `,
                        inline: false
                    },
                    {
                        name: '📊 How to Earn Points',
                        value: 'Points are awarded by Rank Admins for:Moderation actions\n• Helping members\n• Server contributions\n• Event participation\n• Consistent activity',
                        inline: true
                    },
                    {
                        name: '🛠️ Commands',
                        value: '`!points` - View your points\n`!rank @user` - View user rank\n`!points_add` - Add points (Admin)\n`!points_minus` - Remove points (Admin)',
                        inline: true
                    }
                )
                .setFooter({ text: 'Work hard, climb ranks, and contribute to the community!' })
                .setTimestamp();
            
            await safeReply(message, { embeds: [embed] });
            
        } catch (error) {
            console.error('Error in rank_help command:', error);
            await safeReply(message, '❌ An error occurred while showing rank help.');
        }
    }
};
