module.exports = {
    name: 'messageDelete',
    
    async execute(message, client) {
        if (message.author.bot) return;
        
        // Check if message and channel still exist
        if (!message || !message.channel || !message.channel.id) return;
        
        // Store channel ID before setTimeout (channel might be deleted later)
        const channelId = message.channel.id;
        
        const snipeData = {
            content: message.content,
            author: message.author,
            channel: message.channel,
            timestamp: Date.now(),
            attachments: message.attachments.map(att => ({ name: att.name, url: att.url }))
        };
        
        client.deletedMessages.set(channelId, snipeData);
        
        // Auto-cleanup after 5 minutes
        setTimeout(() => {
            if (client.deletedMessages.has(channelId)) {
                client.deletedMessages.delete(channelId);
            }
        }, 300000);
    }
};
