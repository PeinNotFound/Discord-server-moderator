const { EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'avatar',
    description: 'Display user avatar',
    usage: '[@user]',
    aliases: ['av', 'pfp'],

    async execute(message, args, client) {
        const target = message.mentions.users.first() || message.author;

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor || '#7289da')
            .setTitle(`Avatar for ${target.tag}`)
            .setImage(target.displayAvatarURL({ dynamic: true, size: 4096 }))
            .setFooter({ text: `Requested by ${message.author.tag}` })
            .setTimestamp();

        await safeReply(message, { embeds: [embed] });
    }
};
