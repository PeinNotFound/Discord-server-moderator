const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member, client) {
        // Skip if no member leave log channel configured
        if (!client.config.memberLeaveLogChannelId || client.config.memberLeaveLogChannelId === 'your_member_leave_log_channel_id_here') {
            return;
        }

        const logChannel = member.guild.channels.cache.get(client.config.memberLeaveLogChannelId);
        if (!logChannel) return;

        // Check audit logs to determine if they were kicked/banned
        let wasKicked = false;
        let wasBanned = false;
        let executor = null;

        try {
            // Small delay to ensure audit log is available
            await new Promise(resolve => setTimeout(resolve, 500));

            const kickLogs = await member.guild.fetchAuditLogs({
                limit: 3,
                type: 20 // MEMBER_KICK
            });

            const kickLog = kickLogs.entries.find(entry =>
                entry.target.id === member.id &&
                Date.now() - entry.createdTimestamp < 2000
            );

            if (kickLog) {
                wasKicked = true;
                executor = kickLog.executor;
            }

            if (!wasKicked) {
                const banLogs = await member.guild.fetchAuditLogs({
                    limit: 3,
                    type: 22 // MEMBER_BAN_ADD
                });

                const banLog = banLogs.entries.find(entry =>
                    entry.target.id === member.id &&
                    Date.now() - entry.createdTimestamp < 2000
                );

                if (banLog) {
                    wasBanned = true;
                    executor = banLog.executor;
                }
            }
        } catch (error) {
            console.log('Could not fetch audit logs for member leave:', error.message);
        }

        // Only log here if they left voluntarily (not kicked/banned)
        // Kicks and Bans should be logged by their respective commands or client events
        if (!wasKicked && !wasBanned) {
            // Get member's roles before they left
            const roles = member.roles.cache
                .filter(role => role.name !== '@everyone')
                .map(role => role.name)
                .join(', ') || 'None';

            // Calculate how long they were in the server
            const joinedTimestamp = member.joinedTimestamp;
            const duration = joinedTimestamp ? Math.floor((Date.now() - joinedTimestamp) / 1000) : 0;

            const embed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('👋 Member Left Server')
                .setDescription(`**${member.user.tag}** has left the server`)
                .addFields(
                    { name: '👤 User', value: `${member.user.tag}`, inline: true },
                    { name: '🆔 User ID', value: `${member.id}`, inline: true },
                    { name: '📅 Joined Server', value: joinedTimestamp ? `<t:${Math.floor(joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
                    { name: '⏰ Left At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '📊 Time in Server', value: duration > 0 ? `<t:${Math.floor(joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
                    { name: '🎭 Roles', value: roles, inline: false },
                    { name: '📝 Leave Type', value: '🚶 Left Voluntarily', inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setFooter({
                    text: `User ID: ${member.id} • Account Created`,
                    iconURL: member.guild.iconURL()
                })
                .setTimestamp(member.user.createdTimestamp);

            try {
                await logChannel.send({ embeds: [embed] });
            } catch (error) {
                console.error('Failed to log member leave:', error);
            }
        }
    }
};
