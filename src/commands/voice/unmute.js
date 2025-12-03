const { EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'unmute',
    description: 'Unmute a user from voice and text',
    usage: '!unmute @user',
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
        
        if (!target) return await safeReply(message, '❌ Please mention a user or provide a user ID to unmute!');
        
        try {
            // Remove muted role
            if (client.config.MUTED_ROLE_ID && client.config.MUTED_ROLE_ID !== 'your_muted_role_id_here') {
                const mutedRole = message.guild.roles.cache.get(client.config.MUTED_ROLE_ID);
                if (mutedRole && target.roles.cache.has(mutedRole.id)) {
                    await target.roles.remove(mutedRole);
                }
            }
            
            // Voice unmute if in voice channel
            if (target.voice.channel) {
                await target.voice.setMute(false);
            }
            
            await client.logger.logAction(message.guild, 'UNMUTE', message.member, target, 'Unmuted (voice and text)');
            
            const successEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('🔊 User Unmuted')
                .setDescription(`Successfully unmuted ${target.user.tag}`)
                .addFields(
                    { name: '👤 User', value: `${target.user.tag}\n<@${target.id}>`, inline: true },
                    { name: '👮 Moderator', value: message.member.user.tag, inline: true },
                    { name: '⏰ Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                )
                .setThumbnail(target.user.displayAvatarURL())
                .setTimestamp();
            
            await safeReply(message, { embeds: [successEmbed] });
            
        } catch (error) {
            if (error.code === 50013) {
                await safeReply(message, '❌ I don\'t have permission to unmute users!');
            } else {
                await safeReply(message, `❌ Failed to unmute user: ${error.message}`);
            }
        }
    }
};
