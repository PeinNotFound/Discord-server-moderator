const { checkClanCategory } = require('../../modules/clans.js');

module.exports = {
    name: 'createclan',
    description: 'Create a new clan',
    usage: '&createclan <clan name>',
    permission: 'member',
    
    async execute(message, args, client) {
        const guildConfig = client.getGuildConfig(message.guild.id);
        
        // Check category restriction
        const categoryCheck = checkClanCategory(message, guildConfig);
        if (!categoryCheck.allowed) {
            return message.reply(categoryCheck.message);
        }

        if (!args[0]) {
            return message.reply('❌ Please provide a clan name. Usage: `&createclan <clan name>`');
        }

        const clanName = args.join(' ');
        const clanManager = client.clanManagers.get(message.guild.id);

        // Check if user is already in a clan
        const existingClan = clanManager.getClanByMember(message.author.id);
        if (existingClan) {
            return message.reply('❌ You are already in a clan! Leave your current clan first with `&leaveclan`');
        }

        // Create the clan
        const result = await clanManager.createClan(message.guild, message.member, clanName, guildConfig);

        if (result.success) {
            return message.reply(`✅ Clan **${clanName}** has been created! You are now the leader. 🏰\nText Channel: <#${result.clan.textChannelId}>\nVoice Channel: <#${result.clan.voiceChannelId}>`);
        } else {
            return message.reply(`❌ Failed to create clan: ${result.error}`);
        }
    }
};
