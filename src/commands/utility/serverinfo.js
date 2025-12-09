const { EmbedBuilder, ChannelType } = require('discord.js');
const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'serverinfo',
    description: 'Display server information',
    aliases: ['server', 'sinfo'],

    async execute(message, args, client) {
        const guild = message.guild;
        const owner = await guild.fetchOwner();

        const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
        const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
        const roles = guild.roles.cache.size;
        const emojis = guild.emojis.cache.size;

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor || '#7289da')
            .setTitle(`Server Info: ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .addFields(
                { name: '👑 Owner', value: `${owner.user.tag}`, inline: true },
                { name: '🆔 Server ID', value: `${guild.id}`, inline: true },
                { name: '📅 Created On', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
                { name: '👥 Members', value: `${guild.memberCount}`, inline: true },
                { name: '💬 Channels', value: `Text: ${textChannels} | Voice: ${voiceChannels} | Cat: ${categories}`, inline: false },
                { name: '🎭 Roles', value: `${roles}`, inline: true },
                { name: '😀 Emojis', value: `${emojis}`, inline: true },
                { name: '🚀 Boosts', value: `${guild.premiumSubscriptionCount || 0} (Level ${guild.premiumTier})`, inline: true }
            )
            .setFooter({ text: `Requested by ${message.author.tag}` })
            .setTimestamp();

        if (guild.bannerURL()) {
            embed.setImage(guild.bannerURL({ size: 1024 }));
        }

        await safeReply(message, { embeds: [embed] });
    }
};
