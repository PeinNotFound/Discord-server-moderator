const rankSystem = require('../../modules/ranks.js');
const { EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'points_minus',
    aliases: ['removepoints', 'minuspoints', 'point_minus'],
    description: 'Remove points from a user (Rank Admin only)',
    usage: '!points_minus @user [points] [reason]',
    permission: 'rank_admin',

    async execute(message, args, client) {
        try {
            // Check if rank system is configured
            if (!client.config.trialStaffRoleId || client.config.trialStaffRoleId.includes('your_')) {
                return await safeReply(message, '⚠️ Rank system is not configured. Please set up rank role IDs in the configuration.');
            }

            // Get target user
            let targetMember = message.mentions.members.first();

            // Support finding by ID if not mentioned
            if (!targetMember && args[0]) {
                try {
                    targetMember = await message.guild.members.fetch(args[0]);
                } catch (err) {
                    // Ignore error
                }
            }

            if (!targetMember) {
                return await safeReply(message, '❌ Please mention a user or provide a valid User ID to remove points from!');
            }

            // Get points amount
            const points = parseInt(args[1]);

            if (isNaN(points) || points <= 0) {
                return await safeReply(message, '❌ Please provide a valid positive number of points!');
            }

            // Get reason
            const reason = args.slice(2).join(' ') || 'No reason provided';

            // Remove points
            const result = await rankSystem.removePoints(
                message.guild,
                targetMember.id,
                points,
                reason,
                message.member,
                client.config
            );

            // Update role if rank changed
            if (result.rankChanged) {
                await rankSystem.updateUserRole(
                    message.guild,
                    targetMember,
                    result.newRank,
                    client.config
                );

                // Log rank change
                await rankSystem.logRankChange(
                    message.guild,
                    targetMember,
                    result.oldRank,
                    result.newRank,
                    result.newPoints,
                    client.config.rankLogChannelId
                );

                // DM user about rank change
                await rankSystem.sendRankChangeDM(
                    targetMember,
                    result.oldRank,
                    result.newRank,
                    result.newPoints
                );
            }

            // Log points change
            await rankSystem.logPointsChange(
                message.guild,
                targetMember,
                -points, // Negative for removal
                reason,
                message.member,
                result.oldPoints,
                result.newPoints,
                client.config.rankLogChannelId
            );

            // Send DM about points
            await rankSystem.sendPointsChangeDM(
                targetMember,
                -points, // Negative for removal
                reason,
                result.oldPoints,
                result.newPoints
            );

            // Build response embed
            const embed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('⚠️ Points Removed')
                .setThumbnail(targetMember.user.displayAvatarURL())
                .addFields(
                    { name: '👤 User', value: targetMember.user.tag, inline: true },
                    { name: '💎 Points Removed', value: `-${points}`, inline: true },
                    { name: '📊 Total Points', value: `${result.newPoints}`, inline: true },
                    { name: '📝 Reason', value: reason, inline: false }
                );

            if (result.rankChanged) {
                embed.addFields({
                    name: '📉 Rank Down',
                    value: `${result.oldRank.emoji} ${result.oldRank.name} → ${result.newRank.emoji} ${result.newRank.name}`,
                    inline: false
                });
            }

            embed.setFooter({ text: `Removed by ${message.author.tag}` })
                .setTimestamp();

            await safeReply(message, { embeds: [embed] });

        } catch (error) {
            console.error('Error in points_minus command:', error);
            await safeReply(message, '❌ An error occurred while removing points.');
        }
    }
};
