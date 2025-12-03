const { checkClanCategory } = require('../../modules/clans.js');

module.exports = {
    name: 'nick',
    description: '[Leader/Co-Leader] Change a clan member\'s nickname',
    usage: '&nick <@member> <new nickname>',
    permission: 'member',
    
    async execute(message, args, client) {
        const guildConfig = client.getGuildConfig(message.guild.id);
        const categoryCheck = checkClanCategory(message, guildConfig);
        if (!categoryCheck.allowed) return message.reply(categoryCheck.message);

        const clanManager = client.clanManagers.get(message.guild.id);
        const clan = clanManager.getClanByMember(message.author.id);

        if (!clan) return message.reply('❌ You are not in a clan!');
        if (!clanManager.hasLeadership(clan.id, message.author.id)) {
            return message.reply('❌ Only leaders and co-leaders can change nicknames!');
        }

        const targetMember = message.mentions.members.first();
        if (!targetMember) return message.reply('❌ Please mention a member.');

        if (!clan.members.includes(targetMember.id)) {
            return message.reply('❌ That user is not in your clan!');
        }

        const newNick = args.slice(1).join(' ');
        if (!newNick) return message.reply('❌ Please provide a new nickname.');

        try {
            await targetMember.setNickname(newNick);
            return message.reply(`✅ Changed ${targetMember.user.tag}'s nickname to **${newNick}**!`);
        } catch (error) {
            return message.reply('❌ Failed to change nickname. Make sure I have permission and the member\'s role is below mine.');
        }
    }
};
