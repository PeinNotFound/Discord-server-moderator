const { EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/logger.js');

// Periodic checker for jail expiry (runs every 5 minutes)
let jailCheckInterval = null;

// Function to check and release expired jails
async function checkExpiredJails(client) {
    try {
        const data = client.dataManager.getAll();
        if (!data.jailedUsers) return;

        const now = Date.now();
        const expiredUsers = Object.entries(data.jailedUsers).filter(([_, jailData]) => {
            return jailData.jailTime <= now;
        });

        for (const [userId, jailData] of expiredUsers) {
            try {
                const guild = client.guilds.cache.get(jailData.guildId);
                if (!guild) {
                    delete data.jailedUsers[userId];
                    continue;
                }

                const member = await guild.members.fetch(userId).catch(() => null);
                if (!member) {
                    delete data.jailedUsers[userId];
                    continue;
                }

                // Get jail role
                const guildConfig = client.getGuildConfig(guild.id);
                const jailRoleId = guildConfig?.jailRoleId || client.config.JAIL_ROLE_ID;
                let jailRole = null;

                if (jailRoleId && jailRoleId !== 'your_jail_role_id_here') {
                    jailRole = guild.roles.cache.get(jailRoleId);
                } else {
                    jailRole = guild.roles.cache.find(role => role.name === 'Jailed');
                }

                // Check if user still has jail role
                if (!jailRole || !member.roles.cache.has(jailRole.id)) {
                    delete data.jailedUsers[userId];
                    continue;
                }

                // Restore original roles
                if (jailData.originalRoles && jailData.originalRoles.length > 0) {
                    const rolesToRestore = jailData.originalRoles
                        .map(roleId => guild.roles.cache.get(roleId))
                        .filter(role => role !== undefined);

                    await member.roles.set(rolesToRestore);
                } else {
                    await member.roles.remove(jailRole);
                }

                // Send DM
                try {
                    const unjailEmbed = new EmbedBuilder()
                        .setColor('#2ecc71')
                        .setTitle('🔓 Jail Time Expired')
                        .setDescription(`Your jail time has expired in **${guild.name}**`)
                        .addFields(
                            { name: '✅ Status', value: 'Your roles have been restored', inline: false },
                            { name: '⏰ Released At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                        )
                        .setTimestamp();

                    await member.send({ embeds: [unjailEmbed] });
                } catch (dmError) {
                    console.log('Could not send DM to released user');
                }

                await client.logger.logAction(guild, 'UNJAIL', guild.members.me, member, 'Jail time expired (automatic release)');

                // Try to send message to the channel where they were jailed
                const logChannel = guild.channels.cache.find(ch => ch.name === 'mod-logs' || ch.name === 'logs');
                if (logChannel) {
                    logChannel.send(`🔓 <@${userId}> has been automatically released from jail!`).catch(() => { });
                }

                // Clean up
                delete data.jailedUsers[userId];
            } catch (error) {
                console.error(`Failed to auto-release user ${userId}:`, error);
            }
        }

        if (expiredUsers.length > 0) {
            client.dataManager.save();
        }
    } catch (error) {
        console.error('Error in jail check interval:', error);
    }
}

// Initialize jail checker
function initializeJailChecker(client) {
    if (jailCheckInterval) {
        clearInterval(jailCheckInterval);
    }

    // Check immediately on startup
    checkExpiredJails(client);

    // Then check every 5 minutes
    jailCheckInterval = setInterval(() => {
        checkExpiredJails(client);
    }, 5 * 60 * 1000); // 5 minutes
}

module.exports = {
    name: 'jail',
    description: 'Temporarily jail a user (removes all roles)',
    usage: '!jail @user [time] [reason]\nTime formats: 10m (minutes), 2h (hours), 1d (days)',
    initializeJailChecker,
    permission: 'moderation',

    async execute(message, args, client) {
        if (!client.permissions.hasPermission(message.member, 'moderation')) {
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

        if (!target) return await safeReply(message, '❌ Please mention a user or provide a user ID to jail!');

        // Parse time with support for days, hours, minutes
        let timeInMinutes = 10; // Default 10 minutes
        let timeStr = args[1];
        let timeDisplay = '10 minutes';

        if (timeStr) {
            const timeMatch = timeStr.match(/^(\d+)([dhm]?)$/i);
            if (timeMatch) {
                const value = parseInt(timeMatch[1]);
                const unit = timeMatch[2]?.toLowerCase() || 'm';

                switch (unit) {
                    case 'd': // days
                        timeInMinutes = value * 24 * 60;
                        timeDisplay = `${value} day${value !== 1 ? 's' : ''}`;
                        break;
                    case 'h': // hours
                        timeInMinutes = value * 60;
                        timeDisplay = `${value} hour${value !== 1 ? 's' : ''}`;
                        break;
                    case 'm': // minutes
                    default:
                        timeInMinutes = value;
                        timeDisplay = `${value} minute${value !== 1 ? 's' : ''}`;
                        break;
                }
            } else {
                return await safeReply(message, '❌ Invalid time format! Use: 10m (minutes), 2h (hours), 1d (days)\nExample: `!jail @user 2h Spamming`');
            }
        }

        const reason = args.slice(2).join(' ') || 'No reason provided';

        try {
            // Send DM before jailing
            try {
                const jailEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('🔒 You Have Been Jailed')
                    .setDescription(`You have been temporarily jailed in **${message.guild.name}**`)
                    .addFields(
                        { name: '📝 Reason', value: reason, inline: false },
                        { name: '⏱️ Duration', value: timeDisplay, inline: true },
                        { name: '⏰ Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                        { name: '🏠 Server', value: message.guild.name, inline: true }
                    )
                    .setThumbnail(message.guild.iconURL())
                    .setFooter({ text: 'You will be automatically released after the duration expires' })
                    .setTimestamp();

                await target.send({ embeds: [jailEmbed] });
            } catch (dmError) {
                console.log('Could not send DM to user');
            }

            // Get or create jail role
            let jailRole;
            const guildConfig = client.getGuildConfig(message.guild.id);
            const jailRoleId = guildConfig?.jailRoleId || client.config.JAIL_ROLE_ID;

            if (jailRoleId && jailRoleId !== 'your_jail_role_id_here') {
                jailRole = message.guild.roles.cache.get(jailRoleId);
                if (!jailRole) {
                    return await safeReply(message, '❌ Jail role not found! Please check your JAIL_ROLE_ID in config.js');
                }
            } else {
                jailRole = message.guild.roles.cache.find(role => role.name === 'Jailed');
                if (!jailRole) {
                    jailRole = await message.guild.roles.create({
                        name: 'Jailed',
                        color: '#ff0000',
                        permissions: []
                    });
                }
            }

            // Store original roles
            const originalRoles = target.roles.cache.filter(role => role.name !== '@everyone').map(role => role.id);

            const data = client.dataManager.getAll();
            if (!data.jailedUsers) data.jailedUsers = {};

            data.jailedUsers[target.id] = {
                originalRoles: originalRoles,
                jailTime: Date.now() + (timeInMinutes * 60 * 1000),
                moderator: message.member.id,
                reason: reason,
                guildId: message.guild.id,
                timestamp: Date.now()
            };

            client.dataManager.save();

            // Remove all roles and give only jail role
            await target.roles.set([jailRole]);

            // Disconnect from voice if connected
            if (target.voice.channel) {
                try {
                    await target.voice.disconnect('Jailed - disconnected from voice channel');
                } catch (disconnectError) {
                    console.log('Could not disconnect from voice');
                }
            }

            await client.logger.logAction(message.guild, 'JAIL', message.member, target, reason);

            const successEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('🔒 User Jailed')
                .setDescription(`Successfully jailed ${target.user.tag}`)
                .addFields(
                    { name: '👤 User', value: `${target.user.tag}\n<@${target.id}>`, inline: true },
                    { name: '⏱️ Duration', value: timeDisplay, inline: true },
                    { name: '📝 Reason', value: reason, inline: false },
                    { name: '👮 Moderator', value: message.member.user.tag, inline: true },
                    { name: '🔓 Release Time', value: `<t:${Math.floor((Date.now() + (timeInMinutes * 60 * 1000)) / 1000)}:R>`, inline: true }
                )
                .setThumbnail(target.user.displayAvatarURL())
                .setFooter({ text: 'User will be automatically released after the duration expires' })
                .setTimestamp();

            await safeReply(message, { embeds: [successEmbed] });

            // Note: Auto-unjail is handled by the periodic checker (every 5 minutes)
            // This avoids setTimeout's 24.8-day maximum limit

        } catch (error) {
            if (error.code === 50013) {
                await safeReply(message, '❌ I don\'t have permission to manage roles!');
            } else {
                await safeReply(message, `❌ Failed to jail user: ${error.message}`);
            }
        }
    }
};
