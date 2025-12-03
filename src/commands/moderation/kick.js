const { EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'kick',
    description: 'Kick a user from the server',
    usage: '!kick @user [reason]',
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
        
        if (!target) return await safeReply(message, '❌ Please mention a user or provide a user ID to kick!');
        
        if (target.id === message.member.id) {
            return await safeReply(message, '❌ You cannot kick yourself!');
        }
        
        if (target.id === message.guild.ownerId) {
            return await safeReply(message, '❌ You cannot kick the server owner!');
        }
        
        const reason = args.slice(1).join(' ') || 'No reason provided';
        
        try {
            try {
                const kickEmbed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('👢 You Have Been Kicked')
                    .setDescription(`You have been kicked from **${message.guild.name}**`)
                    .addFields(
                        { name: '📝 Reason', value: reason, inline: false },
                        { name: '👮 Moderator', value: message.member.user.tag, inline: true },
                        { name: '⏰ Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setThumbnail(message.guild.iconURL())
                    .setTimestamp();
                
                await target.send({ embeds: [kickEmbed] });
            } catch (dmError) {
                console.log('Could not send DM to user');
            }
            
            await target.kick(reason);
            await client.logger.logAction(message.guild, 'KICK', message.member, target, reason);
            
            const successEmbed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('👢 User Kicked')
                .setDescription(`Successfully kicked ${target.user.tag}`)
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
                await safeReply(message, '❌ I don\'t have permission to kick users!');
            } else {
                await safeReply(message, `❌ Failed to kick user: ${error.message}`);
            }
        }
    }
};
