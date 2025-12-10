const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState, client) {
        // Skip if no voice mod log channel configured
        if (!client.config.voiceModLogChannelId || client.config.voiceModLogChannelId === 'your_voice_mod_log_channel_id_here') {
            return;
        }

        const logChannel = newState.guild.channels.cache.get(client.config.voiceModLogChannelId);
        if (!logChannel) return;

        const member = newState.member;
        if (!member) return;

        // Check for server mute changes (right-click mute)
        if (oldState.serverMute !== newState.serverMute) {
            const action = newState.serverMute ? 'Server Muted' : 'Server Unmuted';
            const emoji = newState.serverMute ? '🔇' : '🔊';
            const color = newState.serverMute ? '#ff6b6b' : '#00ff00';

            // Get who performed the action from audit logs
            let moderator = 'Unknown';
            let moderatorAvatar = null;
            let moderatorId = 'N/A';

            try {
                // Small delay to ensure audit log is available
                await new Promise(resolve => setTimeout(resolve, 500));

                const auditLogs = await newState.guild.fetchAuditLogs({
                    limit: 5,
                    type: 24 // MEMBER_UPDATE
                });

                // Find the most recent audit log entry for this member
                const auditLog = auditLogs.entries.find(entry =>
                    entry.target.id === member.id &&
                    Date.now() - entry.createdTimestamp < 2000 // Within last 2 seconds
                );

                if (auditLog && auditLog.executor) {
                    moderator = auditLog.executor.tag;
                    moderatorAvatar = auditLog.executor.displayAvatarURL();
                    moderatorId = auditLog.executor.id;
                }
            } catch (error) {
                console.log('Could not fetch audit logs for voice mute:', error.message);
            }

            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(`${emoji} ${action}`)
                .setDescription(`**User:** ${member.user.tag}`)
                .addFields(
                    { name: '👤 User', value: `${member.user.tag}`, inline: true },
                    { name: '🆔 User ID', value: `${member.id}`, inline: true },
                    { name: '🎤 Channel', value: newState.channel ? newState.channel.name : 'None', inline: false },
                    { name: '👨‍💼 Performed By', value: moderator, inline: true },
                    { name: '⏰ Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setFooter({
                    text: `User ID: ${member.id} • Mod ID: ${moderatorId}`,
                    iconURL: moderatorAvatar || newState.guild.iconURL()
                })
                .setTimestamp();

            try {
                await logChannel.send({ embeds: [embed] });
            } catch (error) {
                console.error('Failed to log voice mute action:', error);
            }
        }

        // Check for server deafen changes (right-click deafen)
        if (oldState.serverDeaf !== newState.serverDeaf) {
            const action = newState.serverDeaf ? 'Server Deafened' : 'Server Undeafened';
            const emoji = newState.serverDeaf ? '🔇' : '🔊';
            const color = newState.serverDeaf ? '#ff6b6b' : '#00ff00';

            // Get who performed the action from audit logs
            let moderator = 'Unknown';
            let moderatorAvatar = null;
            let moderatorId = 'N/A';

            try {
                // Small delay to ensure audit log is available
                await new Promise(resolve => setTimeout(resolve, 500));

                const auditLogs = await newState.guild.fetchAuditLogs({
                    limit: 5,
                    type: 24 // MEMBER_UPDATE
                });

                // Find the most recent audit log entry for this member
                const auditLog = auditLogs.entries.find(entry =>
                    entry.target.id === member.id &&
                    Date.now() - entry.createdTimestamp < 2000 // Within last 2 seconds
                );

                if (auditLog && auditLog.executor) {
                    moderator = auditLog.executor.tag;
                    moderatorAvatar = auditLog.executor.displayAvatarURL();
                    moderatorId = auditLog.executor.id;
                }
            } catch (error) {
                console.log('Could not fetch audit logs for voice deafen:', error.message);
            }

            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(`${emoji} ${action}`)
                .setDescription(`**User:** ${member.user.tag}`)
                .addFields(
                    { name: '👤 User', value: `${member.user.tag}`, inline: true },
                    { name: '🆔 User ID', value: `${member.id}`, inline: true },
                    { name: '🎤 Channel', value: newState.channel ? newState.channel.name : 'None', inline: false },
                    { name: '👨‍💼 Performed By', value: moderator, inline: true },
                    { name: '⏰ Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setFooter({
                    text: `User ID: ${member.id} • Mod ID: ${moderatorId}`,
                    iconURL: moderatorAvatar || newState.guild.iconURL()
                })
                .setTimestamp();

            try {
                await logChannel.send({ embeds: [embed] });
            } catch (error) {
                console.error('Failed to log voice deafen action:', error);
            }
        }

        // Check for channel moves (right-click move)
        if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            // Use separate move log channel if configured, otherwise use voice mod log channel
            let moveLogChannel = logChannel;
            if (client.config.moveLogChannelId && client.config.moveLogChannelId !== 'your_move_log_channel_id_here') {
                const specificMoveChannel = newState.guild.channels.cache.get(client.config.moveLogChannelId);
                if (specificMoveChannel) {
                    moveLogChannel = specificMoveChannel;
                }
            }

            // Get who performed the action from audit logs
            let moderator = null;
            let moderatorAvatar = null;
            let moderatorId = 'N/A';

            try {
                // Wait longer to ensure audit log is fully written
                await new Promise(resolve => setTimeout(resolve, 1500));

                const auditLogs = await newState.guild.fetchAuditLogs({
                    limit: 1,
                    type: 26 // MEMBER_MOVE
                });

                const auditEntry = auditLogs.entries.first();

                if (auditEntry) {
                    const timeDiff = Date.now() - auditEntry.createdTimestamp;

                    // Check if this audit entry matches our move (within 3 seconds)
                    if (timeDiff < 3000) {
                        // Check if executor is different from the member being moved
                        if (auditEntry.executor && auditEntry.executor.id !== member.id) {
                            moderator = auditEntry.executor.tag;
                            moderatorAvatar = auditEntry.executor.displayAvatarURL();
                            moderatorId = auditEntry.executor.id;
                        }
                    }
                }
            } catch (error) {
                console.log('Could not fetch audit logs for voice move:', error.message);
            }

            // Set default if not found
            if (!moderator) {
                moderator = 'User (self-moved)';
                moderatorAvatar = member.user.displayAvatarURL();
                moderatorId = member.id;
            }

            const embed = new EmbedBuilder()
                .setColor('#7289da')
                .setTitle('🔄 User Moved Between Channels')
                .setDescription(`**User:** ${member.user.tag}`)
                .addFields(
                    { name: '👤 User', value: `${member.user.tag}`, inline: true },
                    { name: '🆔 User ID', value: `${member.id}`, inline: true },
                    { name: '📤 From Channel', value: oldState.channel ? oldState.channel.name : 'Unknown Channel', inline: false },
                    { name: '📥 To Channel', value: newState.channel ? newState.channel.name : 'Unknown Channel', inline: false },
                    { name: '👨‍💼 Performed By', value: moderator, inline: true },
                    { name: '⏰ Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setFooter({
                    text: `User ID: ${member.id} • Mod ID: ${moderatorId}`,
                    iconURL: moderatorAvatar || newState.guild.iconURL()
                })
                .setTimestamp();

            try {
                await moveLogChannel.send({ embeds: [embed] });
            } catch (error) {
                console.error('Failed to log voice move action:', error);
            }
        }
    }
};
