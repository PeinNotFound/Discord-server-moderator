const { EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/logger.js');

const autoUnmuteTimeouts = new Map();

module.exports = {
    name: 'mute',
    description: 'Mute a user in voice and text (1-30 minutes)',
    usage: '!mute @user [1-30]',
    permission: 'voice',

    async execute(message, args, client) {
        if (!client.permissions.hasPermission(message.member, 'voice')) {
            return await safeReply(message, '❌ You don\'t have permission to use this command!');
        }

        let target = message.mentions.members.first();
        const userId = args[0];

        if (!target && userId) {
            try {
                target = await message.guild.members.fetch(userId);
            } catch (error) {
                return await safeReply(message, '❌ User not found in server!');
            }
        }

        if (!target) return await safeReply(message, '❌ Please mention a user or provide a user ID to mute!');

        const muteTime = args[1] ? parseInt(args[1]) : 10;
        if (isNaN(muteTime) || muteTime < 1 || muteTime > 30) {
            return await safeReply(message, '❌ Mute time must be between 1 and 30 minutes!');
        }

        try {
            // Give muted role
            const guildConfig = client.getGuildConfig(message.guild.id);
            const mutedRoleId = guildConfig?.mutedRoleId || client.config.MUTED_ROLE_ID;

            if (mutedRoleId && mutedRoleId !== 'your_muted_role_id_here') {
                const mutedRole = message.guild.roles.cache.get(mutedRoleId);
                if (mutedRole) {
                    await target.roles.add(mutedRole);
                } else {
                    return await safeReply(message, '❌ Muted role not found! Please check your MUTED_ROLE_ID in config.js');
                }
            } else {
                return await safeReply(message, '❌ Muted role is not configured! Please set MUTED_ROLE_ID in config.js');
            }

            // Voice mute if in voice channel
            if (target.voice.channel) {
                await target.voice.setMute(true);
            }

            // Send DM
            try {
                const muteEmbed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('🔇 You Have Been Muted')
                    .setDescription(`You have been muted in **${message.guild.name}**`)
                    .addFields(
                        { name: '📝 Restrictions', value: 'You cannot send messages in text channels or speak in voice chat', inline: false },
                        { name: '⏱️ Duration', value: `${muteTime} minute(s)`, inline: true },
                        { name: '🔓 Unmute Time', value: `<t:${Math.floor((Date.now() + (muteTime * 60 * 1000)) / 1000)}:R>`, inline: true }
                    )
                    .setTimestamp();

                await target.send({ embeds: [muteEmbed] });
            } catch (dmError) {
                console.log('Could not send DM');
            }

            await client.logger.logAction(message.guild, 'MUTE', message.member, target, `Muted for ${muteTime} minute(s)`);

            const successEmbed = new EmbedBuilder()
                .setColor('#7f8c8d')
                .setTitle('🔇 User Muted')
                .setDescription(`Successfully muted ${target.user.tag}`)
                .addFields(
                    { name: '👤 User', value: `${target.user.tag}\n<@${target.id}>`, inline: true },
                    { name: '⏱️ Duration', value: `${muteTime} minute(s)`, inline: true },
                    { name: '👮 Moderator', value: message.member.user.tag, inline: true },
                    { name: '🔓 Auto-Unmute', value: `<t:${Math.floor((Date.now() + (muteTime * 60 * 1000)) / 1000)}:R>`, inline: true }
                )
                .setThumbnail(target.user.displayAvatarURL())
                .setTimestamp();

            await safeReply(message, { embeds: [successEmbed] });

            // Auto-unmute
            const unmuteTimeoutId = setTimeout(async () => {
                try {
                    if (!autoUnmuteTimeouts.has(target.id)) return;

                    const member = await message.guild.members.fetch(target.id).catch(() => null);
                    if (!member) {
                        autoUnmuteTimeouts.delete(target.id);
                        return;
                    }

                    const guildConfig = client.getGuildConfig(message.guild.id);
                    const mutedRoleId = guildConfig?.mutedRoleId || client.config.MUTED_ROLE_ID;
                    const mutedRole = message.guild.roles.cache.get(mutedRoleId);
                    if (mutedRole && member.roles.cache.has(mutedRole.id)) {
                        await member.roles.remove(mutedRole);
                    }

                    if (member.voice.channel) {
                        await member.voice.setMute(false);
                    }

                    await client.logger.logAction(message.guild, 'UNMUTE', message.guild.members.me, member, `Mute expired after ${muteTime} minute(s)`);

                    autoUnmuteTimeouts.delete(target.id);
                } catch (error) {
                    console.error('Auto-unmute failed:', error);
                }
            }, muteTime * 60 * 1000);

            autoUnmuteTimeouts.set(target.id, unmuteTimeoutId);

        } catch (error) {
            if (error.code === 50013) {
                await safeReply(message, '❌ I don\'t have permission to mute users!');
            } else {
                await safeReply(message, `❌ Failed to mute user: ${error.message}`);
            }
        }
    }
};
