const { EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'warnings',
    description: 'View warnings for a user',
    usage: '!warnings @user',
    permission: 'moderation',
    
    async execute(message, args, client) {
        if (!client.permissions.hasPermission(message.member, 'moderation')) {
            return await safeReply(message, '❌ You don\'t have permission to use this command!');
        }
        
        const target = message.mentions.members.first();
        if (!target) return await safeReply(message, '❌ Please mention a user to check warnings!');
        
        const data = client.dataManager.getAll();
        const userWarnings = data.warnedUsers && data.warnedUsers[target.id] ? data.warnedUsers[target.id] : [];
        
        if (userWarnings.length === 0) {
            return await safeReply(message, `✅ ${target.user.tag} has no warnings!`);
        }
        
        const embed = new EmbedBuilder()
            .setColor('#ffa500')
            .setTitle(`Warnings for ${target.user.tag}`)
            .setDescription(`Total warnings: ${userWarnings.length}`);
        
        userWarnings.forEach((warning, index) => {
            embed.addFields({
                name: `Warning ${index + 1}`,
                value: `**Reason:** ${warning.reason}\n**Time:** <t:${Math.floor(warning.timestamp / 1000)}:R>`,
                inline: false
            });
        });
        
        embed.setFooter({ text: '3 warnings = automatic 24h jail' })
            .setTimestamp();
        
        await safeReply(message, { embeds: [embed] });
    }
};
