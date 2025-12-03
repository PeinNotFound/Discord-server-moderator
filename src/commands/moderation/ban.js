const { EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'ban',
    description: 'Ban a user from the server',
    usage: '!ban @user [reason]',
    permission: 'moderation',
    
    async execute(message, args, client) {
        if (!client.permissions.hasPermission(message.member, 'moderation')) {
            return await safeReply(message, '❌ You don\'t have permission to use this command!');
        }
        
        // Get target by mention or ID
        let target = message.mentions.members.first();
        const userId = args[0];
        
        if (!target && userId) {
            try {
                target = await message.guild.members.fetch(userId);
            } catch (error) {
                return await safeReply(message, '❌ User not found in server! Please mention a user or provide a valid user ID.');
            }
        }
        
        if (!target) return await safeReply(message, '❌ Please mention a user or provide a user ID to ban!');
        
        if (target.id === message.member.id) {
            return await safeReply(message, '❌ You cannot ban yourself!');
        }
        
        if (target.id === message.guild.ownerId) {
            return await safeReply(message, '❌ You cannot ban the server owner!');
        }
        
        const reason = args.slice(1).join(' ') || 'No reason provided';
        
        try {
            // Send DM before banning
            try {
                const banEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('🔨 You Have Been Banned')
                    .setDescription(`You have been banned from **${message.guild.name}**`)
                    .addFields(
                        { name: '📝 Reason', value: reason, inline: false },
                        { name: '👮 Moderator', value: message.member.user.tag, inline: true },
                        { name: '⏰ Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setThumbnail(message.guild.iconURL())
                    .setTimestamp();
                
                await target.send({ embeds: [banEmbed] });
            } catch (dmError) {
                console.log('Could not send DM to user:', dmError.message);
            }
            
            // Ban the user
            await target.ban({ reason: reason });
            
            // Log the action
            await client.logger.logAction(message.guild, 'BAN', message.member, target, reason);
            
            // Send success message
            const successEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('🔨 User Banned')
                .setDescription(`Successfully banned ${target.user.tag}`)
                .addFields(
                    { name: '👤 User', value: `${target.user.tag}\n<@${target.id}>`, inline: true },
                    { name: '📝 Reason', value: reason, inline: false },
                    { name: '👮 Moderator', value: message.member.user.tag, inline: true },
                    { name: '⏰ Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                )
                .setThumbnail(target.user.displayAvatarURL())
                .setTimestamp();
            
            await safeReply(message, { embeds: [successEmbed] });
        } catch (error) {
            if (error.code === 50013) {
                await safeReply(message, '❌ I don\'t have permission to ban users! Please give me the **Ban Members** permission.');
            } else {
                await safeReply(message, `❌ Failed to ban user: ${error.message}`);
            }
        }
    }
};
