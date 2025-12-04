const { checkClanCategory } = require('../../modules/clans.js');

module.exports = {
    name: 'createclan',
    description: 'Create a new clan and assign a leader',
    usage: '&createclan <clan name> <@user/userID>',
    permission: 'member',
    
    async execute(message, args, client) {
        // Check if user has admin permissions or is a clan leader
        const isAdmin = client.permissions.hasPermission(message.member, 'admin');
        let isClanLeader = false;
        
        // Check if user is leader of any clan
        const clanManager = client.clanManagers.get(message.guild.id);
        const allClans = clanManager.getAllClans();
        for (const clanId in allClans) {
            if (clanManager.isLeader(clanId, message.author.id)) {
                isClanLeader = true;
                break;
            }
        }
        
        if (!isAdmin && !isClanLeader) {
            return message.reply('❌ Only administrators or clan leaders can create clans!');
        }

        const guildConfig = client.getGuildConfig(message.guild.id);
        
        // Check category restriction
        const categoryCheck = checkClanCategory(message, guildConfig);
        if (!categoryCheck.allowed) {
            return message.reply(categoryCheck.message);
        }

        if (args.length < 2) {
            return message.reply('❌ Please provide a clan name and leader. Usage: `&createclan <clan name> <@user/userID>`');
        }

        // Get clan name (everything except last argument)
        const clanName = args.slice(0, -1).join(' ');
        
        // Get leader (last argument)
        const leaderArg = args[args.length - 1];
        let leaderMember;

        try {
            if (message.mentions.members.first()) {
                leaderMember = message.mentions.members.first();
            } else {
                const userId = leaderArg.replace(/[<@!>]/g, '');
                leaderMember = await message.guild.members.fetch(userId);
            }
        } catch (error) {
            return message.reply('❌ Invalid user ID or user not found in server!');
        }

        // Check if leader is already in a clan
        const existingClan = clanManager.getClanByMember(leaderMember.id);
        if (existingClan) {
            return message.reply(`❌ ${leaderMember.user.tag} is already in a clan!`);
        }

        // Create the clan with specified leader
        const result = await clanManager.createClan(message.guild, leaderMember, clanName, guildConfig);

        if (result.success) {
            return message.reply(`✅ Clan **${clanName}** has been created! ${leaderMember.user.tag} is now the leader. 🏰\nText Channel: <#${result.clan.textChannelId}>\nVoice Channel: <#${result.clan.voiceChannelId}>`);
        } else {
            return message.reply(`❌ Failed to create clan: ${result.error}`);
        }
    }
};
