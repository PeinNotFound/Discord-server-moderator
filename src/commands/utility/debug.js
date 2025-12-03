const { EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'debug',
    description: 'Show debug information for permission system',
    usage: '!debug',
    permission: null,
    
    async execute(message, args, client) {
        const userRoles = message.member.roles.cache.map(role => `${role.name} (${role.id})`);
        const botPermissions = message.guild.members.me.permissions.toArray();
        
        const embed = new EmbedBuilder()
            .setColor('#ff6b6b')
            .setTitle('🔧 Debug Information')
            .addFields(
                { name: '👤 Your Roles', value: userRoles.join('\n') || 'No roles', inline: false },
                { name: '🤖 Bot Permissions', value: botPermissions.join(', ') || 'No permissions', inline: false },
                { name: '⚙️ Configured Roles', value: `Moderator: ${client.config.MODERATOR_ROLES || 'None'}\nAdmin: ${client.config.ADMIN_ROLES || 'None'}\nVoice: ${client.config.VOICE_MODERATOR_ROLES || 'None'}`, inline: false },
                { name: '🔍 Permission Checks', value: `Moderator: ${client.permissions.hasModeratorRole(message.member)}\nAdmin: ${client.permissions.hasAdminRole(message.member)}\nVoice: ${client.permissions.hasVoiceModeratorRole(message.member)}`, inline: false },
                { name: '📝 Current Prefix', value: `"${client.config.PREFIX}"`, inline: false },
                { name: '🏠 Server Owner', value: `ID: ${message.guild.ownerId}`, inline: false }
            )
            .setTimestamp();
        
        await safeReply(message, { embeds: [embed] });
    }
};
