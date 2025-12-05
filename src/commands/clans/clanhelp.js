const { EmbedBuilder } = require('discord.js');
const { checkClanCategory } = require('../../modules/clans.js');

module.exports = {
    name: 'clanhelp',
    description: 'Display help information for clan commands',
    usage: '&clanhelp',
    permission: 'member',
    
    async execute(message, args, client) {
        const guildConfig = client.getGuildConfig(message.guild.id);
        const categoryCheck = checkClanCategory(message, guildConfig);
        if (!categoryCheck.allowed) return message.reply(categoryCheck.message);

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🏰 Clan Commands Help')
            .setDescription('Here are all available clan commands:')
            .addFields(
                {
                    name: '👑 Leader Commands',
                    value: '`&createclan <name> <@user>` - Create clan (Admin only)\n`&settag <tag>` - Set clan tag\n`&deleteclan` - Delete your clan\n`&addtag <@member>` - Add tag to nickname\n`&addcoleader <@member>` - Add co-leader\n`&removeleader <@member>` - Remove co-leader\n`&nick <@member> <name>` - Change nickname\n`&add <@user/id>` - Add member\n`&remove <@user/id>` - Remove member\n`&dmclan <message>` - DM all members\n`&moveclan` - Move all to your VC\n`&clanmembers` - Get member list (DM)',
                    inline: false
                },
                {
                    name: '⭐ Co-Leader Commands',
                    value: '`&addtag <@member>` - Add tag to nickname\n`&nick <@member> <name>` - Change nickname\n`&add <@user/id>` - Add member\n`&remove <@user/id>` - Remove member\n`&clanmembers` - Get member list (DM)\n`&allow <user/role/leader> <@/id>` - Grant permissions\n`&deny <user/role/leader> <@/id>` - Remove permissions\n`&lock` / `&unlock` - Lock/unlock chat\n`&mute <@member>` / `&unmute` - Mute/unmute\n`&reset <@member>` - Reset permissions',
                    inline: false
                },
                {
                    name: '👥 Member Commands',
                    value: '`&claninfo [name]` - View clan info\n`&user [@member]` - View profile\n`&stats` - Clan statistics\n`&lb` - Clan leaderboard\n`&leaveclan` - Leave clan',
                    inline: false
                }
            )
            .setFooter({ text: 'All clan commands must be used within designated clan categories.' });

        return message.reply({ embeds: [embed] });
    }
};