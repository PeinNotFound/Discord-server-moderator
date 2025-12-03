const { safeReply } = require('../utils/logger.js');
const verification = require('../modules/verification.js');

module.exports = {
    name: 'messageCreate',
    
    async execute(message, client) {
        // Ignore bot messages
        if (message.author.bot) return;
        
        // Check if bot is enabled for this guild
        if (message.guild) {
            const guildConfig = client.getGuildConfig(message.guild.id);
            if (guildConfig && guildConfig.botEnabled === false) {
                return; // Bot is disabled for this server
            }
        }
        
        // Check if bot was mentioned (before prefix check)
        if (message.mentions.has(client.user.id) && !message.content.startsWith(client.config.prefix)) {
            // Ignore @everyone and @here mentions
            if (message.mentions.everyone || message.content.includes('@here')) {
                return;
            }
            return await safeReply(message, `👋 Hi! Type \`${client.config.prefix}help\` to see all available commands!`);
        }
        
        // Check for sed/7el commands (no prefix required)
        const contentLower = message.content.toLowerCase().trim();
        if (contentLower === 'sed' || contentLower === '7el') {
            // Only moderators and admins can use these commands
            if (!client.permissions.hasPermission(message.member, 'moderation')) {
                return await safeReply(message, '❌ You don\'t have permission to use this command!');
            }
            
            if (contentLower === 'sed') {
                // Lock the channel
                try {
                    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                        SendMessages: false
                    });
                    
                    client.lockedChannels.set(message.channel.id, {
                        moderator: message.member.id,
                        moderatorTag: message.member.user.tag,
                        timestamp: Date.now()
                    });
                    
                    return message.channel.send(`**🔒 ${message.channel} has been locked.**`);
                } catch (error) {
                    return await safeReply(message, '❌ Failed to lock channel! Make sure the bot has **Manage Channels** permission.');
                }
            } 
            else if (contentLower === '7el') {
                // Unlock the channel
                if (!client.lockedChannels.has(message.channel.id)) {
                    return await safeReply(message, '❌ This channel is not locked!');
                }
                
                try {
                    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                        SendMessages: null
                    });
                    
                    client.lockedChannels.delete(message.channel.id);
                    
                    return message.channel.send(`**🔓 ${message.channel} has been unlocked.**`);
                } catch (error) {
                    return await safeReply(message, '❌ Failed to unlock channel! Make sure the bot has **Manage Channels** permission.');
                }
            }
        }
        
        // Check for verification commands (special handling)
        if (message.content.startsWith(client.config.prefix)) {
            const args = message.content.slice(client.config.prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            
            // Handle verification commands
            if (commandName === 'vb' || commandName === 'vg' || commandName === 'vhelp') {
                const roleType = commandName === 'vg' ? 'female' : 'verified';
                
                if (commandName === 'vhelp') {
                    await verification.showVerificationHelp(message);
                } else {
                    await verification.verifyUser(message, null, roleType);
                }
                return;
            }
            
            // Regular command handling
            const command = client.commands.get(commandName);
            
            if (!command) {
                return await safeReply(message, `Unknown command. Use \`${client.config.prefix}help\` for a list of commands.`);
            }
            
            try {
                await command.execute(message, args, client);
            } catch (error) {
                console.error(`Error executing command ${commandName}:`, error);
                await safeReply(message, '❌ There was an error executing that command!');
            }
        }
    }
};
