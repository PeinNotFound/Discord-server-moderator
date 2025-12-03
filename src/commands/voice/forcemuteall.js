const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'forcemuteall',
    aliases: ['fmall'],
    description: 'Force mute all members in your voice channel',
    usage: '!forcemuteall',
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
            let mutedCount = 0;
            
            for (const member of members.values()) {
                try {
                    await member.voice.setMute(true);
                    mutedCount++;
                } catch (error) {
                    console.error(`Failed to mute ${member.user.tag}:`, error);
                }
            }
            
            await safeReply(message, `🔇 Successfully muted **${mutedCount}** member(s) in <#${channel.id}>!`);
        } catch (error) {
            await safeReply(message, '❌ Failed to force mute members. Check my permissions!');
        }
    }
};
