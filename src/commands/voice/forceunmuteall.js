const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'forceunmuteall',
    aliases: ['fumall'],
    description: 'Force unmute all members in your voice channel',
    usage: '!forceunmuteall',
    permission: 'voice',
    
    async execute(message, args, client) {
        if (!client.permissions.hasPermission(message.member, 'voice')) {
            return await safeReply(message, '❌ You don\'t have permission to use this command!');
        }
        
        const channel = message.member.voice.channel;
        if (!channel) {
            return await safeReply(message, '❌ You must be in a voice channel to use this command!');
        }
        
        try {
            const members = channel.members.filter(member => member.id !== message.member.id);
            let unmutedCount = 0;
            
            for (const member of members.values()) {
                try {
                    await member.voice.setMute(false);
                    unmutedCount++;
                } catch (error) {
                    console.error(`Failed to unmute ${member.user.tag}:`, error);
                }
            }
            
            await safeReply(message, `🔊 Successfully unmuted **${unmutedCount}** member(s) in <#${channel.id}>!`);
        } catch (error) {
            await safeReply(message, '❌ Failed to force unmute members. Check my permissions!');
        }
    }
};
