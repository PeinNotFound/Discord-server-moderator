const { checkClanCategory } = require('../../modules/clans.js');

module.exports = {
    name: 'dmclan',
    description: '[Leader] Send a DM to all clan members',
    usage: '&dmclan <message>',
    permission: 'member',
    
    async execute(message, args, client) {
        const guildConfig = client.getGuildConfig(message.guild.id);
        const categoryCheck = checkClanCategory(message, guildConfig);
        if (!categoryCheck.allowed) return message.reply(categoryCheck.message);

        const clanManager = client.clanManagers.get(message.guild.id);
        const clan = clanManager.getClanByMember(message.author.id);

        if (!clan) return message.reply('❌ You are not in a clan!');
        if (!clanManager.isLeader(clan.id, message.author.id)) {
            return message.reply('❌ Only the clan leader can send DMs to all members!');
        }

        const dmMessage = args.join(' ');
        if (!dmMessage) return message.reply('❌ Please provide a message to send.');

        const sentTo = [];
        const failed = [];

        for (const memberId of clan.members) {
            try {
                const member = await message.guild.members.fetch(memberId);
                await member.send(`📢 **Message from ${clan.name} Leader:**\n\n${dmMessage}`);
                sentTo.push(member.user.tag);
            } catch (error) {
                failed.push(memberId);
            }
        }

        let reply = `✅ Message sent to **${sentTo.length}** members!`;
        if (failed.length > 0) {
            reply += `\n⚠️ Failed to send to ${failed.length} members (DMs disabled or blocked).`;
        }

        return message.reply(reply);
    }
};
