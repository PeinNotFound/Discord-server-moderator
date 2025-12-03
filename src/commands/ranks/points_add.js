const rankSystem = require('../../modules/ranks.js');
const { EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'points_add',
    aliases: ['addpoints', 'point_add'],
    description: 'Add points to a user (Rank Admin only)',
    usage: '!points_add @user [points] [reason]',
    permission: 'rank_admin',
    
    async execute(message, args, client) {
        try {
            // Check if rank system is configured
            if (!client.config.trialStaffRoleId || client.config.trialStaffRoleId.includes('your_')) {
                return await safeReply(message, '⚠️ Rank system is not configured. Please set up rank role IDs in the configuration.');
            }
            
            // Get target user
            const targetMember = message.mentions.members.first();
            
            if (!targetMember) {
                return await safeReply(message, '❌ Please mention a user to add points to!');
            }
            
            // Get points amount
            const points = parseInt(args[1]);
            
            if (isNaN(points) || points <= 0) {
                return await safeReply(message, '❌ Please provide a valid positive number of points!');
            }
            
            // Get reason
            const reason = args.slice(2).join(' ') || 'No reason provided';
            
            // Add points
            const result = await rankSystem.addPoints(
                message.guild,
                targetMember.id,
                points,
                reason,
                message.member,
                client.config
            );
            
            // Build response embed
            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('✅ Points Added')
                .setThumbnail(targetMember.user.displayAvatarURL())
                .addFields(
                    { name: '👤 User', value: targetMember.user.tag, inline: true },
                    { name: '💎 Points Added', value: `+${points}`, inline: true },
                    { name: '📊 Total Points', value: `${result.newPoints}`, inline: true },
                    { name: '📝 Reason', value: reason, inline: false }
                );
            
            if (result.rankChanged) {
                embed.addFields({
                    name: '🎉 Rank Up!',
                    value: `${result.oldRank.emoji} ${result.oldRank.name} → ${result.newRank.emoji} ${result.newRank.name}`,
                    inline: false
                });
                embed.setColor('#f39c12');
            }
            
            embed.setFooter({ text: `Added by ${message.author.tag}` })
                .setTimestamp();
            
            await safeReply(message, { embeds: [embed] });
            
        } catch (error) {
            console.error('Error in points_add command:', error);
            await safeReply(message, '❌ An error occurred while adding points.');
        }
    }
};
