const { EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'unban',
    description: 'Unban a user from the server',
    usage: '!unban <user_id> [reason]',
    permission: 'moderation',
    
    async execute(message, args, client) {
        if (!client.permissions.hasPermission(message.member, 'moderation')) {
            return await safeReply(message, '❌ You don\'t have permission to use this command!');
        }
        
        const userId = args[0];
        if (!userId) return await safeReply(message, '❌ Please provide a user ID to unban!');
        
        const reason = args.slice(1).join(' ') || 'No reason provided';
        
        try {
            const bannedUsers = await message.guild.bans.fetch();
            const bannedUser = bannedUsers.get(userId);
            
            if (!bannedUser) {
                return await safeReply(message, '❌ User is not banned or invalid user ID!');
            }
            
            await message.guild.members.unban(userId, reason);
            await client.logger.logAction(message.guild, 'UNBAN', message.member, { user: bannedUser.user, id: userId }, reason);
            
            const successEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('✅ User Unbanned')
                .setDescription(`Successfully unbanned ${bannedUser.user.tag}`)
                .addFields(
                    { name: '👤 User', value: `${bannedUser.user.tag}\nID: ${userId}`, inline: true },
                    { name: '📝 Reason', value: reason, inline: false },
                    { name: '👮 Moderator', value: message.member.user.tag, inline: true },
                    { name: '⏰ Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                )
                .setThumbnail(bannedUser.user.displayAvatarURL())
                .setTimestamp();
            
            await safeReply(message, { embeds: [successEmbed] });
        } catch (error) {
            if (error.code === 50013) {
                await safeReply(message, '❌ I don\'t have permission to unban users!');
            } else {
                await safeReply(message, `❌ Failed to unban user: ${error.message}`);
            }
        }
    }
};
