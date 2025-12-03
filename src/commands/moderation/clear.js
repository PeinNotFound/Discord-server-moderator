const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'clear',
    aliases: ['purge'],
    description: 'Delete messages in bulk',
    usage: '!clear [amount]',
    permission: 'moderation',
    
    async execute(message, args, client) {
        if (!client.permissions.hasPermission(message.member, 'moderation')) {
            return await safeReply(message, '❌ You don\'t have permission to use this command!');
        }
        
        const amount = parseInt(args[0]);
        if (!amount || amount < 1 || amount > 1000) {
            return await safeReply(message, '❌ Please specify a number between 1 and 1000!');
        }
        
        try {
            let totalDeleted = 0;
            let remainingToDelete = amount;
            
            // Delete the command message first
            try {
                await message.delete();
            } catch (delError) {
                // Ignore if can't delete
            }
            
            // Discord's bulkDelete can only delete 100 messages at a time and messages older than 14 days
            while (remainingToDelete > 0) {
                const fetchLimit = Math.min(remainingToDelete, 100);
                const messages = await message.channel.messages.fetch({ limit: fetchLimit });
                
                if (messages.size === 0) break;
                
                // Filter out pinned messages and messages older than 14 days
                const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
                const deletableMessages = messages.filter(msg => 
                    !msg.pinned && msg.createdTimestamp > twoWeeksAgo
                );
                
                if (deletableMessages.size === 0) {
                    break;
                }
                
                const deleted = await message.channel.bulkDelete(deletableMessages, true);
                totalDeleted += deleted.size;
                remainingToDelete -= fetchLimit;
                
                if (deleted.size < fetchLimit) {
                    break;
                }
                
                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            const confirmMsg = await message.channel.send(`✅ Successfully deleted **${totalDeleted}** message(s)!`);
            
            // Delete confirmation message after 3 seconds
            setTimeout(() => {
                confirmMsg.delete().catch(() => {});
            }, 3000);
            
        } catch (error) {
            if (error.code === 50013) {
                await safeReply(message, '❌ I don\'t have permission to manage messages!');
            } else {
                await safeReply(message, `❌ Failed to clear messages: ${error.message}`);
            }
        }
    }
};
