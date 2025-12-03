const { checkClanCategory } = require('../../modules/clans.js');

module.exports = {
    name: 'removeleader',
    description: '[Leader] Remove a co-leader from your clan',
    usage: '&removeleader <@member>',
    permission: 'member',
    
    async execute(message, args, client) {
        const guildConfig = client.getGuildConfig(message.guild.id);
        const categoryCheck = checkClanCategory(message, guildConfig);
        if (!categoryCheck.allowed) return message.reply(categoryCheck.message);

        const clanManager = client.clanManagers.get(message.guild.id);
        const clan = clanManager.getClanByMember(message.author.id);

        if (!clan) return message.reply('❌ You are not in a clan!');
        if (!clanManager.isLeader(clan.id, message.author.id)) {
            return message.reply('❌ Only the clan leader can remove co-leaders!');
        }

        const targetMember = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!targetMember) return message.reply('❌ Please mention a member or provide their ID.');

        const result = clanManager.removeCoLeader(clan.id, targetMember.id);
        if (result.success) {
            return message.reply(`✅ ${targetMember.user.tag} is no longer a co-leader!`);
        } else {
            return message.reply(`❌ Failed: ${result.error}`);
        }
    }
};
