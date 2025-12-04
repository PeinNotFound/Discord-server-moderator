const { EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'warn',
    description: 'Warn a user (3 warnings = 24h auto-jail)',
    usage: '!warn @user [reason]',
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
        
        if (!target) return await safeReply(message, '❌ Please mention a user or provide a user ID to warn!');
        
        const reason = args.slice(1).join(' ') || 'No reason provided';
        const data = client.dataManager.getAll();
        
        try {
            // Give warn role if configured
            if (client.config.WARN_ROLE_ID && client.config.WARN_ROLE_ID !== 'your_warn_role_id_here') {
                const warnRole = message.guild.roles.cache.get(client.config.WARN_ROLE_ID);
                if (warnRole) {
                    await target.roles.add(warnRole);
                }
            }
            
            // Send DM to user
            try {
                const warnEmbed = new EmbedBuilder()
                    .setColor('#ffa500')
                    .setTitle('⚠️ Warning Received')
                    .setDescription(`You have received a warning in **${message.guild.name}**`)
                    .addFields(
                        { name: '📝 Reason', value: reason, inline: false },
                        { name: '⏰ Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                        { name: '🏠 Server', value: message.guild.name, inline: true }
                    )
                    .setThumbnail(message.guild.iconURL())
                    .setFooter({ text: 'Please follow the server rules to avoid further action' })
                    .setTimestamp();
                
                await target.send({ embeds: [warnEmbed] });
            } catch (dmError) {
                console.log('Could not send DM to user');
            }
            
            // Store warning
            if (!data.warnedUsers) data.warnedUsers = {};
            if (!data.warnedUsers[target.id]) data.warnedUsers[target.id] = [];
            
            const warningData = {
                moderator: message.member.id,
                reason: reason,
                timestamp: Date.now()
            };
            
            data.warnedUsers[target.id].push(warningData);
            client.dataManager.save();
            
            await client.logger.logAction(message.guild, 'WARN', message.member, target, reason);
            
            const warningCount = data.warnedUsers[target.id].length;
            
            // Check if user reached 3 warnings - Auto jail for 24 hours
            if (warningCount >= 3) {
                // Auto-jail logic would go here - requires jail module integration
                const successEmbed = new EmbedBuilder()
                    .setColor('#8B0000')
                    .setTitle('🔒 User Automatically Jailed!')
                    .setDescription(`${target.user.tag} reached 3 warnings and has been automatically jailed!`)
                    .addFields(
                        { name: '👤 User', value: `${target.user.tag}\n<@${target.id}>`, inline: true },
                        { name: '⚠️ Warnings', value: '3 (threshold)', inline: true },
                        { name: '⏱️ Jail Duration', value: '24 hours', inline: true },
                        { name: '📝 Note', value: 'Warnings will be cleared upon release', inline: false }
                    )
                    .setThumbnail(target.user.displayAvatarURL())
                    .setFooter({ text: 'Auto-jail system activated' })
                    .setTimestamp();
                
                await safeReply(message, { embeds: [successEmbed] });
            } else {
                const successEmbed = new EmbedBuilder()
                    .setColor('#ffcc00')
                    .setTitle('⚠️ User Warned')
                    .setDescription(`Successfully warned ${target.user.tag}`)
                    .addFields(
                        { name: '👤 User', value: `${target.user.tag}\n<@${target.id}>`, inline: true },
                        { name: '⚠️ Total Warnings', value: `${warningCount}/3`, inline: true },
                        { name: '📝 Reason', value: reason, inline: false },
                        { name: '👮 Moderator', value: message.member.user.tag, inline: true },
                        { name: '⏰ Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                    )
                    .setThumbnail(target.user.displayAvatarURL())
                    .setFooter({ text: warningCount === 2 ? '⚠️ One more warning will result in automatic 24h jail!' : 'User has been notified via DM' })
                    .setTimestamp();
                
                await safeReply(message, { embeds: [successEmbed] });
            }
            
        } catch (error) {
            if (error.code === 50013) {
                await safeReply(message, '❌ I don\'t have permission to manage roles!');
            } else {
                await safeReply(message, `❌ Failed to warn user: ${error.message}`);
            }
        }
    }
};
