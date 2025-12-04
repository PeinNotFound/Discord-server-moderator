const { EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'unjail',
    description: 'Manually release a user from jail',
    usage: '!unjail @user',
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
        
        if (!target) return await safeReply(message, '❌ Please mention a user or provide a user ID to unjail!');
        
        try {
            // Get jail role
            let jailRole;
            if (client.config.JAIL_ROLE_ID && client.config.JAIL_ROLE_ID !== 'your_jail_role_id_here') {
                jailRole = message.guild.roles.cache.get(client.config.JAIL_ROLE_ID);
            } else {
                jailRole = message.guild.roles.cache.find(role => role.name === 'Jailed');
            }
            
            if (!jailRole) {
                return await safeReply(message, '❌ No jail role found!');
            }
            
            if (!target.roles.cache.has(jailRole.id)) {
                return await safeReply(message, `❌ ${target.user.tag} is not currently jailed!`);
            }
            
            const data = client.dataManager.getAll();
            const storedJailData = data.jailedUsers && data.jailedUsers[target.id];
            
            if (storedJailData && storedJailData.originalRoles.length > 0) {
                const rolesToRestore = storedJailData.originalRoles
                    .map(roleId => message.guild.roles.cache.get(roleId))
                    .filter(role => role !== undefined);
                
                await target.roles.set(rolesToRestore);
            } else {
                await target.roles.remove(jailRole);
            }
            
            // Clear warnings when released from jail
            const hadWarnings = data.warnedUsers && data.warnedUsers[target.id];
            const warningCount = hadWarnings ? data.warnedUsers[target.id].length : 0;
            
            if (hadWarnings) {
                delete data.warnedUsers[target.id];
                
                // Remove warn role if they have it
                if (client.config.WARN_ROLE_ID && client.config.WARN_ROLE_ID !== 'your_warn_role_id_here') {
                    const warnRole = message.guild.roles.cache.get(client.config.WARN_ROLE_ID);
                    if (warnRole && target.roles.cache.has(warnRole.id)) {
                        await target.roles.remove(warnRole);
                    }
                }
            }
            
            // Clean up jail data
            if (data.jailedUsers) {
                delete data.jailedUsers[target.id];
            }
            client.dataManager.save();
            
            // Send DM to user
            try {
                const unjailEmbed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('🔓 You Have Been Released from Jail')
                    .setDescription(`You have been released from jail in **${message.guild.name}**`)
                    .addFields(
                        { name: '✅ Status', value: 'Your roles have been restored', inline: false },
                        { name: '⏰ Released At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                        { name: '🏠 Server', value: message.guild.name, inline: true }
                    )
                    .setThumbnail(message.guild.iconURL())
                    .setFooter({ text: 'Welcome back!' })
                    .setTimestamp();
                
                await target.send({ embeds: [unjailEmbed] });
            } catch (dmError) {
                console.log('Could not send DM to user');
            }
            
            await client.logger.logAction(message.guild, 'UNJAIL', message.member, target, 'Released from jail by moderator');
            
            const successEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('🔓 User Released from Jail')
                .setDescription(`Successfully released ${target.user.tag} from jail`)
                .addFields(
                    { name: '👤 User', value: `${target.user.tag}\n<@${target.id}>`, inline: true },
                    { name: '✅ Status', value: 'All roles restored', inline: true },
                    { name: '👮 Moderator', value: message.member.user.tag, inline: true },
                    { name: '⏰ Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                    { name: '📝 Additional Actions', value: hadWarnings ? `⚠️ Cleared ${warningCount} warning(s)\n✅ Removed warn role` : '✅ No warnings to clear', inline: false }
                )
                .setThumbnail(target.user.displayAvatarURL())
                .setTimestamp();
            
            await safeReply(message, { embeds: [successEmbed] });
            
        } catch (error) {
            if (error.code === 50013) {
                await safeReply(message, '❌ I don\'t have permission to manage roles!');
            } else {
                await safeReply(message, `❌ Failed to unjail user: ${error.message}`);
            }
        }
    }
};
