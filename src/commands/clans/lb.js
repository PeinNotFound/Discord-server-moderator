const { checkClanCategory } = require('../../modules/clans.js');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'lb',
    description: 'View clan leaderboard',
    usage: '&lb',
    permission: 'member',
    
    async execute(message, args, client) {
        const guildConfig = client.getGuildConfig(message.guild.id);
        const categoryCheck = checkClanCategory(message, guildConfig);
        if (!categoryCheck.allowed) return message.reply(categoryCheck.message);

        const clanManager = client.clanManagers.get(message.guild.id);
        const allClans = clanManager.getAllClans();

        if (Object.keys(allClans).length === 0) {
            return message.reply('❌ No clans have been created yet!');
        }

        // Sort clans by member count
        const sortedClans = Object.values(allClans).sort((a, b) => b.members.length - a.members.length);

        let leaderboard = '';
        const topClans = sortedClans.slice(0, 10); // Top 10 clans

        for (let i = 0; i < topClans.length; i++) {
            const clan = topClans[i];
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            const tag = clan.tag ? `[${clan.tag}]` : '';
            leaderboard += `${medal} **${clan.name}** ${tag} - ${clan.members.length} members\n`;
        }

        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('🏆 Clan Leaderboard')
            .setDescription(leaderboard || 'No clans available')
            .setFooter({ text: `Total Clans: ${Object.keys(allClans).length}` })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
