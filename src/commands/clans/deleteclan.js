const { checkClanCategory } = require('../../modules/clans.js');

module.exports = {
    name: 'deleteclan',
    description: '[Leader] Delete your clan permanently',
    usage: '&deleteclan',
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
            return message.reply('❌ Only the clan leader can delete the clan!');
        }

        // Confirmation mechanism
        if (!args[0] || args[0].toLowerCase() !== 'confirm') {
            return message.reply(`⚠️ **Are you sure you want to delete your clan "${clan.name}"?**
This will:
• Delete the clan role
• Delete the text and voice channels
• Remove all members from the clan
• Remove all clan data permanently

Type \`&deleteclan confirm\` to proceed.`);
        }

        try {
            const result = await clanManager.deleteClan(message.guild, clan.id);
            
            if (result.success) {
                return message.reply(`✅ Clan **${clan.name}** has been deleted permanently!`);
            } else {
                return message.reply(`❌ Failed to delete clan: ${result.error}`);
            }
        } catch (error) {
            console.error('Clan deletion error:', error);
            return message.reply('❌ An error occurred while deleting the clan.');
        }
    }
};