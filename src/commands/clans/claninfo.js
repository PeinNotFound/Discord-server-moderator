const { EmbedBuilder } = require('discord.js');
const { checkClanCategory } = require('../../modules/clans.js');

module.exports = {
    name: 'claninfo',
    description: 'View information about your clan or another clan',
    usage: '&claninfo [clan name]',
    permission: 'member',
    
    async execute(message, args, client) {
        const guildConfig = client.getGuildConfig(message.guild.id);
        const categoryCheck = checkClanCategory(message, guildConfig);
        if (!categoryCheck.allowed) return message.reply(categoryCheck.message);

        const clanManager = client.clanManagers.get(message.guild.id);
        let clan;

        if (args.length > 0) {
            // Search for clan by name
            const clanName = args.join(' ').toLowerCase();
            const allClans = clanManager.getAllClans();
            clan = Object.values(allClans).find(c => c.name.toLowerCase() === clanName);
        } else {
            // Show user's clan
            clan = clanManager.getClanByMember(message.author.id);
        }

        if (!clan) {
            return message.reply('❌ Clan not found!');
        }

        // Get leader
        const leader = await message.guild.members.fetch(clan.leaderId).catch(() => null);
        
        // Get co-leaders
        const coLeaders = await Promise.all(
            clan.coLeaders.map(id => message.guild.members.fetch(id).catch(() => null))
        );
        const coLeaderList = coLeaders.filter(m => m).map(m => m.user.tag).join(', ') || 'None';

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`🏰 ${clan.name}`)
            .setDescription(clan.tag ? `Tag: **${clan.tag}**` : 'No tag set')
            .addFields(
                { name: '👑 Leader', value: leader ? leader.user.tag : 'Unknown', inline: true },
                { name: '👥 Members', value: `${clan.members.length}`, inline: true },
                { name: '⭐ Co-Leaders', value: coLeaderList, inline: false },
                { name: '💬 Text Channel', value: `<#${clan.textChannelId}>`, inline: true },
                { name: '🔊 Voice Channel', value: `<#${clan.voiceChannelId}>`, inline: true },
                { name: '📅 Created', value: `<t:${Math.floor(clan.createdAt / 1000)}:R>`, inline: false }
            )
            .setFooter({ text: `Clan ID: ${clan.id}` })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
