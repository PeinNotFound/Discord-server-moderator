const { checkClanCategory } = require('../../modules/clans.js');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'unmute',
    description: '[Leader/Co-Leader] Unmute a member in clan chat',
    usage: '&unmute <@member>',
    permission: 'member',
    
    async execute(message, args, client) {
        const guildConfig = client.getGuildConfig(message.guild.id);
        const categoryCheck = checkClanCategory(message, guildConfig);
        if (!categoryCheck.allowed) return message.reply(categoryCheck.message);

        const clanManager = client.clanManagers.get(message.guild.id);
        const clan = clanManager.getClanByMember(message.author.id);

        if (!clan) return message.reply('❌ You are not in a clan!');
        if (!clanManager.hasLeadership(clan.id, message.author.id)) {
            return message.reply('❌ Only leaders and co-leaders can unmute members!');
        }

        const targetMember = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!targetMember) return message.reply('❌ Please mention a member or provide their ID.');

        if (!clan.members.includes(targetMember.id)) {
            return message.reply('❌ That user is not in your clan!');
        }

        try {
            const textChannel = await message.guild.channels.fetch(clan.textChannelId);

            await textChannel.permissionOverwrites.create(targetMember.id, {
                [PermissionFlagsBits.SendMessages]: true
            });

            return message.reply(`🔊 Unmuted **${targetMember.user.tag}** in clan chat!`);
        } catch (error) {
            console.error('Unmute error:', error);
            return message.reply('❌ Failed to unmute member.');
        }
    }
};
