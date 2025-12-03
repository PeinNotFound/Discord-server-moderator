const { checkClanCategory } = require('../../modules/clans.js');

module.exports = {
    name: 'clanmembers',
    description: '[Leader/Co-Leader] Get a list of clan members in DM',
    usage: '&clanmembers',
    permission: 'member',
    
    async execute(message, args, client) {
        const guildConfig = client.getGuildConfig(message.guild.id);
        const categoryCheck = checkClanCategory(message, guildConfig);
        if (!categoryCheck.allowed) return message.reply(categoryCheck.message);

        const clanManager = client.clanManagers.get(message.guild.id);
        const clan = clanManager.getClanByMember(message.author.id);

        if (!clan) return message.reply('❌ You are not in a clan!');
        if (!clanManager.hasLeadership(clan.id, message.author.id)) {
            return message.reply('❌ Only leaders and co-leaders can view the member list!');
        }

        try {
            let memberList = `**${clan.name} Members (${clan.members.length})**\n\n`;

            // Leader
            const leader = await message.guild.members.fetch(clan.leaderId).catch(() => null);
            memberList += `👑 **Leader:**\n${leader ? leader.user.tag : 'Unknown'}\n\n`;

            // Co-leaders
            if (clan.coLeaders.length > 0) {
                memberList += `⭐ **Co-Leaders (${clan.coLeaders.length}):**\n`;
                for (const coLeaderId of clan.coLeaders) {
                    const coLeader = await message.guild.members.fetch(coLeaderId).catch(() => null);
                    memberList += `• ${coLeader ? coLeader.user.tag : 'Unknown'}\n`;
                }
                memberList += '\n';
            }

            // Regular members
            const regularMembers = clan.members.filter(id => id !== clan.leaderId && !clan.coLeaders.includes(id));
            if (regularMembers.length > 0) {
                memberList += `👥 **Members (${regularMembers.length}):**\n`;
                for (const memberId of regularMembers) {
                    const member = await message.guild.members.fetch(memberId).catch(() => null);
                    memberList += `• ${member ? member.user.tag : 'Unknown'}\n`;
                }
            }

            await message.author.send(memberList);
            return message.reply('✅ Member list sent to your DMs!');
        } catch (error) {
            return message.reply('❌ Failed to send DM. Please enable DMs from server members.');
        }
    }
};
