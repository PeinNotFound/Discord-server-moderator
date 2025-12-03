const { checkClanCategory } = require('../../modules/clans.js');

module.exports = {
    name: 'add',
    description: '[Leader/Co-Leader] Add a user to your clan',
    usage: '&add <@user/id>',
    permission: 'member',
    
    async execute(message, args, client) {
        const guildConfig = client.getGuildConfig(message.guild.id);
        const categoryCheck = checkClanCategory(message, guildConfig);
        if (!categoryCheck.allowed) return message.reply(categoryCheck.message);

        const clanManager = client.clanManagers.get(message.guild.id);
        const clan = clanManager.getClanByMember(message.author.id);

        if (!clan) return message.reply('❌ You are not in a clan!');
        if (!clanManager.hasLeadership(clan.id, message.author.id)) {
            return message.reply('❌ Only leaders and co-leaders can add members!');
        }

        const targetMember = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!targetMember) return message.reply('❌ Please mention a member or provide their ID.');

        const result = await clanManager.addMember(message.guild, clan.id, targetMember.id);
        if (result.success) {
            return message.reply(`✅ ${targetMember.user.tag} has been added to the clan!`);
        } else {
            return message.reply(`❌ Failed: ${result.error}`);
        }
    }
};
