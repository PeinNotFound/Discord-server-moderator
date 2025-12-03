const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'ping',
    aliases: ['test'],
    description: 'Test if bot is working',
    usage: '!ping',
    permission: null,
    
    async execute(message, args, client) {
        await safeReply(message, '✅ Bot is working! Commands are being processed.');
    }
};
