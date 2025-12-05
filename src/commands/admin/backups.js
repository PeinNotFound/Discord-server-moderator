const antiRaid = require('../../modules/anti-raid.js');
const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'backups',
    aliases: ['listbackups'],
    description: 'List all available server backups (Admin only)',
    usage: '!backups',
    permission: 'admin',
    
    async execute(message, args, client) {
        if (!client.permissions.hasPermission(message.member, 'admin')) {
            return; // Silent fail - act as unknown command
        }
        
        const backupList = antiRaid.listBackups(message.guild.id);
        
        if (backupList.length === 0) {
            return await safeReply(message, '📁 No backups found! Use `!backup` to create one.');
        }
        
        const { EmbedBuilder } = require('discord.js');
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('📁 Available Server Backups')
            .setDescription(backupList.join('\n\n'))
            .setFooter({ text: 'Use !restore [number] to restore a backup' })
            .setTimestamp();
        
        await safeReply(message, { embeds: [embed] });
    }
};
