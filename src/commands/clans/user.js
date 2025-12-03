const { checkClanCategory } = require('../../modules/clans.js');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'user',
    description: 'View your clan profile',
    usage: '&user [@member]',
    permission: 'member',
    
    async execute(message, args, client) {
        const guildConfig = client.getGuildConfig(message.guild.id);
        const categoryCheck = checkClanCategory(message, guildConfig);
        if (!categoryCheck.allowed) return message.reply(categoryCheck.message);

        const clanManager = client.clanManagers.get(message.guild.id);
        const targetMember = message.mentions.members.first() || message.member;
        const clan = clanManager.getClanByMember(targetMember.id);

        if (!clan) {
            return message.reply(`❌ ${targetMember.id === message.author.id ? 'You are' : 'That user is'} not in a clan!`);
        }

        const isLeader = clanManager.isLeader(clan.id, targetMember.id);
        const isCoLeader = clanManager.isCoLeader(clan.id, targetMember.id);
        
        let role = '👥 Member';
        if (isLeader) role = '👑 Leader';
        else if (isCoLeader) role = '⭐ Co-Leader';

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`${targetMember.user.tag}'s Profile`)
            .setThumbnail(targetMember.user.displayAvatarURL())
            .addFields(
                { name: '🏰 Clan', value: clan.name, inline: true },
                { name: '🏷️ Tag', value: clan.tag || 'None', inline: true },
                { name: '📊 Role', value: role, inline: true },
                { name: '📅 Joined Discord', value: `<t:${Math.floor(targetMember.user.createdTimestamp / 1000)}:R>`, inline: true }
            )
            .setFooter({ text: `Member ID: ${targetMember.id}` })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
