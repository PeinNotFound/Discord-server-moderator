const rankSystem = require('../../modules/ranks.js');
const { EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'rank',
    description: 'View rank and progress for any user (Rank Admin only)',
    usage: '!rank @user',
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

            // Default to author if no user specified
            if (!targetMember && !args[0]) {
                targetMember = message.member;
            }

            if (!targetMember) {
                return await safeReply(message, '❌ Please mention a valid user or provide a User ID!');
            }

            // Get user data
            const userData = rankSystem.getUserData(targetMember.id);
            const currentRank = rankSystem.getRankFromPoints(userData.points);
            const nextRank = rankSystem.getNextRank(currentRank.points);

            // Build rank embed
            const embed = new EmbedBuilder()
                .setColor(currentRank.color)
                .setTitle(`${currentRank.emoji} Rank Information`)
                .setThumbnail(targetMember.user.displayAvatarURL())
                .addFields(
                    { name: '👤 User', value: targetMember.user.tag, inline: true },
                    { name: '🎯 Current Rank', value: `${currentRank.emoji} ${currentRank.name}`, inline: true },
                    { name: '💎 Points', value: `${userData.points}`, inline: true }
                );

            if (nextRank) {
                const pointsNeeded = nextRank.points - userData.points;
                const progress = Math.floor((userData.points / nextRank.points) * 100);
                const progressBar = generateProgressBar(progress);

                embed.addFields(
                    { name: '📈 Progress to Next Rank', value: progressBar, inline: false },
                    { name: '🎖️ Next Rank', value: `${nextRank.emoji} ${nextRank.name}`, inline: true },
                    { name: '🔹 Points Needed', value: `${pointsNeeded}`, inline: true }
                );
            } else {
                embed.addFields({ name: '🏆 Status', value: 'Maximum rank achieved!', inline: false });
            }

            embed.setFooter({ text: `Rank System • Requested by ${message.author.tag}` })
                .setTimestamp();

            await safeReply(message, { embeds: [embed] });

        } catch (error) {
            console.error('Error in rank command:', error);
            await safeReply(message, '❌ An error occurred while fetching rank information.');
        }
    }
};

function generateProgressBar(percentage) {
    const filled = Math.floor(percentage / 10);
    const empty = 10 - filled;
    return `${'🟦'.repeat(filled)}${'⬜'.repeat(empty)} ${percentage}%`;
}
