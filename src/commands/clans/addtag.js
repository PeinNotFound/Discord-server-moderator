const { checkClanCategory } = require('../../modules/clans.js');

module.exports = {
    name: 'addtag',
    description: '[Leader/Co-Leader] Add clan tag to a member\'s nickname',
    usage: '&addtag <@member>',
    permission: 'member',
    
    async execute(message, args, client) {
        const guildConfig = client.getGuildConfig(message.guild.id);
        const categoryCheck = checkClanCategory(message, guildConfig);
        if (!categoryCheck.allowed) return message.reply(categoryCheck.message);

        const clanManager = client.clanManagers.get(message.guild.id);
        const clan = clanManager.getClanByMember(message.author.id);

        if (!clan) return message.reply('❌ You are not in a clan!');
        if (!clanManager.hasLeadership(clan.id, message.author.id)) {
            return message.reply('❌ Only leaders and co-leaders can add tags!');
        }

        if (!clan.tag) {
            return message.reply('❌ Your clan doesn\'t have a tag set! Use `&settag <tag>` first.');
        }

        const targetMember = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!targetMember) return message.reply('❌ Please mention a member or provide their ID.');

        if (!clan.members.includes(targetMember.id)) {
            return message.reply('❌ That user is not in your clan!');
        }

        try {
            const currentNick = targetMember.displayName;
            const tagPrefix = `[${clan.tag}] `;
            
            // Check if already has tag
            if (currentNick.startsWith(tagPrefix)) {
                return message.reply('❌ This member already has the clan tag!');
            }

            const newNick = tagPrefix + currentNick;
            await targetMember.setNickname(newNick);
            return message.reply(`✅ Added clan tag to ${targetMember.user.tag}'s nickname!`);
        } catch (error) {
            return message.reply('❌ Failed to change nickname. Make sure I have permission and the member\'s role is below mine.');
        }
    }
};
