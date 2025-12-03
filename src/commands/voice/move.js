const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'move',
    description: 'Move a user to a different voice channel',
    usage: '!move @user [channel_id]',
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
        
        if (!target) return await safeReply(message, '❌ Please mention a user to move!');
        
        if (!target.voice.channel) {
            return await safeReply(message, '❌ User is not in a voice channel!');
        }
        
        const channelId = args[1];
        if (!channelId) {
            return await safeReply(message, '❌ Please provide a voice channel ID!');
        }
        
        const targetChannel = message.guild.channels.cache.get(channelId);
        if (!targetChannel || targetChannel.type !== 2) {
            return await safeReply(message, '❌ Invalid voice channel ID!');
        }
        
        try {
            await target.voice.setChannel(targetChannel);
            await safeReply(message, `✅ Successfully moved <@${target.id}> to <#${targetChannel.id}>!`);
        } catch (error) {
            await safeReply(message, '❌ Failed to move user. Check my permissions!');
        }
    }
};
