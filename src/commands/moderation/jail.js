const { EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/logger.js');

// Store auto-unjail timeouts (shared across all guilds)
const autoUnjailTimeouts = new Map();

module.exports = {
    name: 'jail',
    description: 'Temporarily jail a user (removes all roles)',
    usage: '!jail @user [time] [reason]\nTime formats: 10m (minutes), 2h (hours), 1d (days)',
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
            if (client.config.JAIL_ROLE_ID && client.config.JAIL_ROLE_ID !== 'your_jail_role_id_here') {
                jailRole = message.guild.roles.cache.get(client.config.JAIL_ROLE_ID);
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
            
            // Auto-unjail after specified time
            const unjailTimeoutId = setTimeout(async () => {
                try {
                    if (!autoUnjailTimeouts.has(target.id)) return;
                    
                    const member = message.guild.members.cache.get(target.id);
                    if (!member) {
                        autoUnjailTimeouts.delete(target.id);
                        return;
                    }
                    
                    if (!member.roles.cache.has(jailRole.id)) {
                        autoUnjailTimeouts.delete(target.id);
                        return;
                    }
                    
                    const latestData = client.dataManager.getAll();
                    const storedJailData = latestData.jailedUsers && latestData.jailedUsers[target.id];
                    
                    if (storedJailData && storedJailData.originalRoles.length > 0) {
                        const rolesToRestore = storedJailData.originalRoles
                            .map(roleId => message.guild.roles.cache.get(roleId))
                            .filter(role => role !== undefined);
                        
                        await member.roles.set(rolesToRestore);
                    } else {
                        await member.roles.remove(jailRole);
                    }
                    
                    // Clean up
                    delete latestData.jailedUsers[target.id];
                    client.dataManager.save();
                    
                    // Send DM
                    try {
                        const unjailEmbed = new EmbedBuilder()
                            .setColor('#2ecc71')
                            .setTitle('🔓 Jail Time Expired')
                            .setDescription(`Your jail time has expired in **${message.guild.name}**`)
                            .addFields(
                                { name: '✅ Status', value: 'Your roles have been restored', inline: false },
                                { name: '⏰ Released At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                            )
                            .setTimestamp();
                        
                        await member.send({ embeds: [unjailEmbed] });
                    } catch (dmError) {
                        console.log('Could not send DM');
                    }
                    
                    await client.logger.logAction(message.guild, 'UNJAIL', message.guild.members.me, member, 'Jail time expired (automatic release)');
                    message.channel.send(`🔓 ${target.user.tag} has been automatically released from jail!`);
                    
                    autoUnjailTimeouts.delete(target.id);
                } catch (error) {
                    console.error('Failed to unjail user:', error);
                    autoUnjailTimeouts.delete(target.id);
                }
            }, timeInMinutes * 60 * 1000);
            
            autoUnjailTimeouts.set(target.id, unjailTimeoutId);
            
        } catch (error) {
            if (error.code === 50013) {
                await safeReply(message, '❌ I don\'t have permission to manage roles!');
            } else {
                await safeReply(message, `❌ Failed to jail user: ${error.message}`);
            }
        }
    }
};
