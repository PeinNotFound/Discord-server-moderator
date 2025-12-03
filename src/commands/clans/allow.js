const { checkClanCategory } = require('../../modules/clans.js');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'allow',
    description: '[Leader/Co-Leader] Give permissions to users/roles',
    usage: '&allow <user/role/leader> <@user/@role/id>',
    permission: 'member',
    
    async execute(message, args, client) {
        const guildConfig = client.getGuildConfig(message.guild.id);
        const categoryCheck = checkClanCategory(message, guildConfig);
        if (!categoryCheck.allowed) return message.reply(categoryCheck.message);

        const clanManager = client.clanManagers.get(message.guild.id);
        const clan = clanManager.getClanByMember(message.author.id);

        if (!clan) return message.reply('❌ You are not in a clan!');
        if (!clanManager.hasLeadership(clan.id, message.author.id)) {
            return message.reply('❌ Only leaders and co-leaders can manage permissions!');
        }

        const type = args[0]?.toLowerCase();
        if (!['user', 'role', 'leader'].includes(type)) {
            return message.reply('❌ Usage: `&allow <user/role/leader> <@user/@role/id>`');
        }

        try {
            const textChannel = await message.guild.channels.fetch(clan.textChannelId);
            
            if (type === 'user') {
                const targetMember = message.mentions.members.first() || await message.guild.members.fetch(args[1]).catch(() => null);
                if (!targetMember) return message.reply('❌ Please mention a user or provide their ID.');

                await textChannel.permissionOverwrites.create(targetMember.id, {
                    [PermissionFlagsBits.ViewChannel]: true,
                    [PermissionFlagsBits.SendMessages]: true
                });

                return message.reply(`✅ Granted **${targetMember.user.tag}** access to the clan chat!`);
            }
            
            if (type === 'role') {
                const targetRole = message.mentions.roles.first() || await message.guild.roles.fetch(args[1]).catch(() => null);
                if (!targetRole) return message.reply('❌ Please mention a role or provide its ID.');

                await textChannel.permissionOverwrites.create(targetRole.id, {
                    [PermissionFlagsBits.ViewChannel]: true,
                    [PermissionFlagsBits.SendMessages]: true
                });

                return message.reply(`✅ Granted **${targetRole.name}** role access to the clan chat!`);
            }

            if (type === 'leader') {
                const targetMember = message.mentions.members.first() || await message.guild.members.fetch(args[1]).catch(() => null);
                if (!targetMember) return message.reply('❌ Please mention a user or provide their ID.');

                if (!clan.members.includes(targetMember.id)) {
                    return message.reply('❌ That user is not in your clan!');
                }

                await textChannel.permissionOverwrites.create(targetMember.id, {
                    [PermissionFlagsBits.ManageMessages]: true
                });

                return message.reply(`✅ Granted **${targetMember.user.tag}** chat management permissions!`);
            }
        } catch (error) {
            console.error('Allow permission error:', error);
            return message.reply('❌ Failed to update permissions.');
        }
    }
};
