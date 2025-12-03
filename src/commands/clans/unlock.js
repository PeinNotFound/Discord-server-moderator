const { checkClanCategory } = require('../../modules/clans.js');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'unlock',
    description: '[Leader/Co-Leader] Unlock the clan chat',
    usage: '&unlock',
    permission: 'member',
    
    async execute(message, args, client) {
        const guildConfig = client.getGuildConfig(message.guild.id);
        const categoryCheck = checkClanCategory(message, guildConfig);
        if (!categoryCheck.allowed) return message.reply(categoryCheck.message);

        const clanManager = client.clanManagers.get(message.guild.id);
        const clan = clanManager.getClanByMember(message.author.id);

        if (!clan) return message.reply('❌ You are not in a clan!');
        if (!clanManager.hasLeadership(clan.id, message.author.id)) {
            return message.reply('❌ Only leaders and co-leaders can unlock the chat!');
        }

        try {
            const textChannel = await message.guild.channels.fetch(clan.textChannelId);
            const clanRole = await message.guild.roles.fetch(clan.roleId);

            await textChannel.permissionOverwrites.edit(clanRole.id, {
                [PermissionFlagsBits.SendMessages]: true
            });

            return message.reply('🔓 Clan chat has been unlocked!');
        } catch (error) {
            console.error('Unlock error:', error);
            return message.reply('❌ Failed to unlock the chat.');
        }
    }
};
