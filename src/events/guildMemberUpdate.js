const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'guildMemberUpdate',
    async execute(oldMember, newMember, client) {
        // Check if nickname changed
        if (oldMember.nickname !== newMember.nickname) {
            // Skip if no nickname log channel configured
            if (!client.config.nicknameLogChannelId || client.config.nicknameLogChannelId === 'your_nickname_log_channel_id_here') {
                return;
            }

            const logChannel = newMember.guild.channels.cache.get(client.config.nicknameLogChannelId);
            if (!logChannel) return;

            const oldNickname = oldMember.nickname || oldMember.user.username;
            const newNickname = newMember.nickname || newMember.user.username;

            // Determine who changed the nickname
            let changedBy = 'Unknown';
            let changedByAvatar = null;
            let changedById = 'N/A';

            // Try to get audit logs to find who changed the nickname
            try {
                // Small delay to ensure audit log is available
                await new Promise(resolve => setTimeout(resolve, 500));

                const auditLogs = await newMember.guild.fetchAuditLogs({
                    limit: 1,
                    type: 24 // MEMBER_UPDATE
                });

                const auditLog = auditLogs.entries.first();
                if (auditLog && auditLog.target.id === newMember.id) {
                    const timeDiff = Date.now() - auditLog.createdTimestamp;
                    if (timeDiff < 2000) { // Only if recent
                        changedBy = auditLog.executor.tag;
                        changedByAvatar = auditLog.executor.displayAvatarURL();
                        changedById = auditLog.executor.id;
                    }
                }
            } catch (error) {
                console.log('Could not fetch audit logs for nickname change:', error.message);
            }

            if (changedBy === 'Unknown') {
                // Assume self-change if no audit log matches
                changedBy = newMember.user.tag;
                changedByAvatar = newMember.user.displayAvatarURL();
                changedById = newMember.id;
            }

            const embed = new EmbedBuilder()
                .setColor('#9932cc')
                .setTitle('📝 Nickname Changed')
                .setDescription(`**User:** ${newMember.user.tag}`)
                .addFields(
                    { name: '👤 User', value: `${newMember.user.tag}`, inline: true },
                    { name: '🆔 User ID', value: `${newMember.id}`, inline: true },
                    { name: '📝 Old Nickname', value: oldNickname, inline: false },
                    { name: '📝 New Nickname', value: newNickname, inline: false },
                    { name: '👨‍💼 Changed By', value: changedBy, inline: true },
                    { name: '⏰ Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '🏠 Server', value: newMember.guild.name, inline: true }
                )
                .setThumbnail(newMember.user.displayAvatarURL())
                .setFooter({
                    text: `User ID: ${newMember.id} • Mod ID: ${changedById}`,
                    iconURL: changedByAvatar || newMember.guild.iconURL()
                })
                .setTimestamp();

            try {
                await logChannel.send({ embeds: [embed] });
            } catch (error) {
                console.error('Failed to log nickname change:', error);
            }
        }
    }
};
