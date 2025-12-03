const rankSystem = require('../../modules/ranks.js');
const { EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'points',
    description: 'View your own rank and points',
    usage: '!points',
    permission: null,
    
    async execute(message, args, client) {
        const target = message.member;
        
        // Check if user is staff member
        const staffRoleIds = [
            client.config.trialStaffRoleId,
            client.config.staffRoleId,
            client.config.moderatorRoleId,
            client.config.headModeratorRoleId,
            client.config.managerRoleId,
            client.config.headManagerRoleId,
            client.config.administratorRoleId
        ].filter(id => id && !id.includes('your_'));
        
        const isStaff = target.roles.cache.some(role => staffRoleIds.includes(role.id));
        
        if (!isStaff) {
            const embed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('❌ Not a Staff Member')
                .setDescription(`**${target.user.tag}** is not part of the staff team!`)
                .addFields({
                    name: '📋 Note',
                    value: 'The rank system is only available for staff members.',
                    inline: false
                })
                .setThumbnail(target.user.displayAvatarURL())
                .setTimestamp();
            
            return await safeReply(message, { embeds: [embed] });
        }
        
        const userData = rankSystem.getUserData(target.id);
        const currentRank = rankSystem.getRankFromPoints(userData.points);
        const nextRank = rankSystem.getNextRank(currentRank.points);
        
        const embed = new EmbedBuilder()
            .setColor(currentRank.color)
            .setTitle(`${currentRank.emoji} Points Overview`)
            .setDescription(`**${target.user.tag}**'s rank information`)
            .addFields(
                { name: '💰 Total Points', value: `${userData.points} points`, inline: true },
                { name: '🎯 Current Rank', value: `${currentRank.emoji} **${currentRank.name}**`, inline: true },
                { name: '📋 Permissions', value: currentRank.description, inline: false }
            )
            .setThumbnail(target.user.displayAvatarURL())
            .setTimestamp();
        
        if (nextRank) {
            const pointsNeeded = nextRank.points - userData.points;
            embed.addFields(
                { name: '⏭️ Next Rank', value: `${nextRank.emoji} **${nextRank.name}**`, inline: true },
                { name: '📈 Points Needed', value: `${pointsNeeded} points`, inline: true }
            );
        } else {
            embed.addFields({ name: '👑 Maximum Rank', value: 'You have reached the highest rank!', inline: false });
        }
        
        await safeReply(message, { embeds: [embed] });
    }
};
