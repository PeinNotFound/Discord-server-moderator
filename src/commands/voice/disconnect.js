const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'disconnect',
    aliases: ['dc'],
    description: 'Disconnect a user from voice channel',
    usage: '!disconnect @user',
    permission: 'moderation',
    
    async execute(message, args, client) {
        if (!client.permissions.hasPermission(message.member, 'moderation')) {
            return await safeReply(message, '❌ You don\'t have permission to use this command!');
        }
        
        const target = message.mentions.members.first();
        if (!target) return await safeReply(message, '❌ Please mention a user to disconnect!');
        
        if (!target.voice.channel) {
            return await safeReply(message, '❌ User is not in a voice channel!');
        }
        
        try {
            await target.voice.disconnect('Disconnected by moderator');
            await safeReply(message, `🔌 Successfully disconnected <@${target.id}> from voice channel!`);
        } catch (error) {
            if (error.code === 50013) {
                await safeReply(message, '❌ I don\'t have permission to disconnect users! Please give me the **Move Members** permission.');
            } else {
                await safeReply(message, `❌ Failed to disconnect user: ${error.message}`);
            }
        }
    }
};
