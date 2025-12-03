const { checkClanCategory } = require('../../modules/clans.js');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'stats',
    description: 'View clan statistics',
    usage: '&stats',
    permission: 'member',
    
    async execute(message, args, client) {
        const guildConfig = client.getGuildConfig(message.guild.id);
        const categoryCheck = checkClanCategory(message, guildConfig);
        if (!categoryCheck.allowed) return message.reply(categoryCheck.message);

        const clanManager = client.clanManagers.get(message.guild.id);
        const clan = clanManager.getClanByMember(message.author.id);

        if (!clan) return message.reply('❌ You are not in a clan!');

        const leader = await message.guild.members.fetch(clan.leaderId).catch(() => null);
        const createdDate = new Date(clan.createdAt);

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`📊 ${clan.name} Statistics`)
            .setDescription(clan.tag ? `**Tag:** ${clan.tag}` : 'No tag set')
            .addFields(
                { name: '👑 Leader', value: leader ? leader.user.tag : 'Unknown', inline: true },
                { name: '⭐ Co-Leaders', value: `${clan.coLeaders.length}`, inline: true },
                { name: '👥 Total Members', value: `${clan.members.length}`, inline: true },
                { name: '📅 Created', value: `<t:${Math.floor(clan.createdAt / 1000)}:R>`, inline: true },
                { name: '💬 Text Channel', value: `<#${clan.textChannelId}>`, inline: true },
                { name: '🔊 Voice Channel', value: `<#${clan.voiceChannelId}>`, inline: true }
            )
            .setFooter({ text: `Clan ID: ${clan.id}` })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
