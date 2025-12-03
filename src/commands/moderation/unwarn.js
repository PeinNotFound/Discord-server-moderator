const { EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'unwarn',
    aliases: ['removewarn'],
    description: 'Remove a specific warning from a user',
    usage: '!unwarn @user [warn_number]',
    permission: 'moderation',
    
    async execute(message, args, client) {
        if (!client.permissions.hasPermission(message.member, 'moderation')) {
            return await safeReply(message, '❌ You don\'t have permission to use this command!');
        }
        
        const target = message.mentions.members.first();
        if (!target) return await safeReply(message, '❌ Please mention a user!');
        
        const data = client.dataManager.getAll();
        if (!data.warnedUsers) data.warnedUsers = {};
        const userWarnings = data.warnedUsers[target.id] || [];
        
        if (userWarnings.length === 0) {
            return await safeReply(message, `❌ ${target.user.tag} has no warnings to remove!`);
        }
        
        const warnNumber = parseInt(args[1]);
        
        if (!warnNumber || warnNumber < 1 || warnNumber > userWarnings.length) {
            return await safeReply(message, `❌ Please specify a warning number between 1 and ${userWarnings.length}!`);
        }
        
        const removedWarning = userWarnings.splice(warnNumber - 1, 1)[0];
        
        if (userWarnings.length === 0) {
            delete data.warnedUsers[target.id];
            
            // Remove warn role if they have it
            if (client.config.WARN_ROLE_ID && client.config.WARN_ROLE_ID !== 'your_warn_role_id_here') {
                const warnRole = message.guild.roles.cache.get(client.config.WARN_ROLE_ID);
                if (warnRole && target.roles.cache.has(warnRole.id)) {
                    await target.roles.remove(warnRole);
                }
            }
        } else {
            data.warnedUsers[target.id] = userWarnings;
        }
        
        client.dataManager.saveAll(data);
        
        await client.logger.logAction(message.guild, 'UNWARN', message.member, target, `Removed warning #${warnNumber}`);
        
        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('✅ Warning Removed')
            .setDescription(`Successfully removed warning #${warnNumber} from ${target.user.tag}`)
            .addFields(
                { name: '👤 User', value: `${target.user.tag}\n<@${target.id}>`, inline: true },
                { name: '⚠️ Remaining Warnings', value: `${userWarnings.length}`, inline: true },
                { name: '📝 Removed Reason', value: removedWarning.reason, inline: false },
                { name: '👮 Moderator', value: message.member.user.tag, inline: true }
            )
            .setTimestamp();
        
        await safeReply(message, { embeds: [embed] });
    }
};
