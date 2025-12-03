const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'cam',
    aliases: ['camera'],
    description: 'Enable/Disable camera/stream for entire voice channel (Admin only)',
    usage: '!cam enable/disable [channel_id]',
    permission: 'admin',
    
    async execute(message, args, client) {
        if (!client.permissions.hasPermission(message.member, 'admin')) {
            return await safeReply(message, '❌ You don\'t have permission to use this command! Only admins can control camera/streaming.');
        }
        
        const action = args[0]?.toLowerCase();
        if (!action || (action !== 'enable' && action !== 'disable')) {
            return await safeReply(message, '❌ Please specify `enable` or `disable`!\nUsage: `!cam enable [channel_id]` or `!cam disable [channel_id]`');
        }
        
        // Get channel - either provided ID or user's current channel
        let channel;
        const channelId = args[1];
        
        if (channelId) {
            channel = message.guild.channels.cache.get(channelId);
            if (!channel || channel.type !== 2) { // Voice channel type
                return await safeReply(message, '❌ Invalid voice channel ID!');
            }
        } else {
            channel = message.member.voice.channel;
            if (!channel) {
                return await safeReply(message, '❌ You must be in a voice channel or provide a channel ID!\nUsage: `!cam enable [channel_id]`');
            }
        }
        
        try {
            const shouldEnable = action === 'enable';
            
            // Update channel permissions to allow/deny camera and streaming
            await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                Stream: shouldEnable,
                SendVoiceMessages: shouldEnable
            });
            
            const statusText = shouldEnable ? 'enabled' : 'disabled';
            await safeReply(message, `📹 Successfully ${statusText} camera and streaming in <#${channel.id}>!`);
        } catch (error) {
            console.error('Camera toggle error:', error);
            if (error.code === 50013) {
                await safeReply(message, '❌ I don\'t have permission to manage channel permissions! Please give me the **Manage Channels** permission.');
            } else {
                await safeReply(message, `❌ Failed to toggle camera: ${error.message}`);
            }
        }
    }
};