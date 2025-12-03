const { checkClanCategory } = require('../../modules/clans.js');

module.exports = {
    name: 'leaveclan',
    description: 'Leave your current clan',
    usage: '&leaveclan',
    permission: 'member',
    
    async execute(message, args, client) {
        const guildConfig = client.getGuildConfig(message.guild.id);
        const categoryCheck = checkClanCategory(message, guildConfig);
        if (!categoryCheck.allowed) return message.reply(categoryCheck.message);

        const clanManager = client.clanManagers.get(message.guild.id);
        const clan = clanManager.getClanByMember(message.author.id);

        if (!clan) {
            return message.reply('❌ You are not in a clan!');
        }

        if (clan.leaderId === message.author.id) {
            return message.reply('❌ Clan leaders cannot leave! Transfer leadership or delete the clan first.');
        }

        const result = await clanManager.removeMember(message.guild, clan.id, message.author.id);
        if (result.success) {
            return message.reply(`✅ You have left **${clan.name}**!`);
        } else {
            return message.reply(`❌ Failed: ${result.error}`);
        }
    }
};
