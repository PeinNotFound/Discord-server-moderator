const { EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'userinfo',
    description: 'Display user information',
    usage: '[@user]',
    aliases: ['whois', 'uinfo', 'user'],

    async execute(message, args, client) {
        const targetMember = message.mentions.members.first() || message.member;
        const user = targetMember.user;

        // Get roles (exclude @everyone)
        const roles = targetMember.roles.cache
            .filter(r => r.name !== '@everyone')
            .sort((a, b) => b.position - a.position)
            .map(r => r)
            .slice(0, 10); // Limit to top 10

        const rolesDisplay = roles.length > 0 ? roles.join(', ') : 'None';
        const roleCount = targetMember.roles.cache.size - 1; // Subtract everyone

        const embed = new EmbedBuilder()
            .setColor(targetMember.displayHexColor === '#000000' ? '#7289da' : targetMember.displayHexColor)
            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '🆔 User ID', value: `${user.id}`, inline: true },
                { name: '🏷️ Nickname', value: targetMember.nickname || 'None', inline: true },
                { name: '🤖 Bot', value: user.bot ? 'Yes' : 'No', inline: true },
                { name: '📅 Joined Server', value: `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: '📅 Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '🎭 Roles', value: `${rolesDisplay}${roleCount > 10 ? ` ...and ${roleCount - 10} more` : ''}`, inline: false }
            )
            .setFooter({ text: `Requested by ${message.author.tag}` })
            .setTimestamp();

        await safeReply(message, { embeds: [embed] });
    }
};
