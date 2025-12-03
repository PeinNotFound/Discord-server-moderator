const { safeReply } = require('../../utils/logger.js');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'serverconfig',
    aliases: ['guildconfig', 'config'],
    description: 'View this server\'s configuration',
    usage: '!serverconfig',
    permission: 'admin',
    
    async execute(message, args, client) {
        if (!client.permissions.hasPermission(message.member, 'admin')) {
            return await safeReply(message, '❌ You don\'t have permission to use this command!');
        }
        
        // Load guild-specific config
        const guildConfig = client.getGuildConfig(message.guild.id);
        
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`⚙️ Server Configuration - ${message.guild.name}`)
            .setDescription('Guild-specific bot configuration')
            .addFields(
                { 
                    name: '📝 Prefix', 
                    value: guildConfig.prefix || '!', 
                    inline: true 
                },
                { 
                    name: '👥 Moderator Roles', 
                    value: guildConfig.moderatorRoles.length > 0 
                        ? guildConfig.moderatorRoles.map(id => `<@&${id}>`).join(', ') 
                        : 'Not configured', 
                    inline: false 
                },
                { 
                    name: '👑 Admin Roles', 
                    value: guildConfig.adminRoles.length > 0 
                        ? guildConfig.adminRoles.map(id => `<@&${id}>`).join(', ') 
                        : 'Not configured', 
                    inline: false 
                },
                { 
                    name: '📁 Data Storage', 
                    value: `Guild ID: \`${message.guild.id}\`\nData stored in: \`guild-data/${message.guild.id}/\``, 
                    inline: false 
                },
                {
                    name: '💡 Note',
                    value: 'Each server has its own independent configuration and data storage.',
                    inline: false
                }
            )
            .setFooter({ text: 'Use the dashboard to modify server settings' })
            .setTimestamp();
        
        await safeReply(message, { embeds: [embed] });
    }
};
