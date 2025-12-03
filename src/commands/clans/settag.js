const { checkClanCategory } = require('../../modules/clans.js');

module.exports = {
    name: 'settag',
    description: '[Leader] Set a tag for your clan',
    usage: '&settag <tag>',
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

        if (!clanManager.isLeader(clan.id, message.author.id)) {
            return message.reply('❌ Only the clan leader can set the clan tag!');
        }

        if (!args[0]) {
            return message.reply('❌ Please provide a tag. Usage: `&settag <tag>`');
        }

        const tag = args[0].toUpperCase();
        const result = clanManager.setClanTag(clan.id, tag);

        if (result.success) {
            return message.reply(`✅ Clan tag set to **${tag}**`);
        } else {
            return message.reply(`❌ Failed to set tag: ${result.error}`);
        }
    }
};
