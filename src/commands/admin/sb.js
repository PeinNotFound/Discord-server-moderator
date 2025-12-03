const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'sb',
    aliases: ['soundboard'],
    description: 'Enable/Disable soundboard for entire voice channel (Admin only)',
    usage: '!sb enable/disable [channel_id]',
    permission: 'admin',
    
    async execute(message, args, client) {
        if (!client.permissions.hasPermission(message.member, 'admin')) {
            return await safeReply(message, '❌ You don\'t have permission to use this command! Only admins can control soundboard.');
        }
        
        const action = args[0]?.toLowerCase();
        if (!action || (action !== 'enable' && action !== 'disable')) {
            return await safeReply(message, '❌ Please specify `enable` or `disable`!\nUsage: `!sb enable [channel_id]` or `!sb disable [channel_id]`');
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
                return await safeReply(message, '❌ You must be in a voice channel or provide a channel ID!\nUsage: `!sb enable [channel_id]`');
            }
        }
        
        try {
            const shouldEnable = action === 'enable';
            
            // Update channel permissions to allow/deny soundboard
            await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                UseSoundboard: shouldEnable
            });
            
            const statusText = shouldEnable ? 'enabled' : 'disabled';
            await safeReply(message, `🔊 Successfully ${statusText} soundboard in <#${channel.id}>!`);
        } catch (error) {
            console.error('Soundboard toggle error:', error);
            if (error.code === 50013) {
                await safeReply(message, '❌ I don\'t have permission to manage channel permissions! Please give me the **Manage Channels** permission.');
            } else {
                await safeReply(message, `❌ Failed to toggle soundboard: ${error.message}`);
            }
        }
    }
};