const { EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'snipe',
    description: 'View the last deleted message in the current channel',
    usage: '!snipe',
    permission: null, // Anyone can use
    
    async execute(message, args, client) {
        const snipeData = client.deletedMessages.get(message.channel.id);
        
        if (!snipeData) {
            return await safeReply(message, '❌ No deleted message found in this channel!');
        }
        
        const embed = new EmbedBuilder()
            .setColor('#ff6b6b')
            .setTitle('💬 Sniped Message')
            .setDescription(snipeData.content || '*No text content*')
            .addFields(
                { name: '👤 Author', value: `${snipeData.author.tag}`, inline: true },
                { name: '⏰ Deleted', value: `<t:${Math.floor(snipeData.timestamp / 1000)}:R>`, inline: true }
            )
            .setTimestamp();
        
        if (snipeData.attachments.length > 0) {
            embed.addFields({
                name: '📎 Attachments',
                value: snipeData.attachments.map(att => `[${att.name}](${att.url})`).join('\n'),
                inline: false
            });
        }
        
        await safeReply(message, { embeds: [embed] });
    }
};
