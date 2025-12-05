const antiRaid = require('../../modules/anti-raid.js');
const { safeReply } = require('../../utils/logger.js');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'restore',
    description: 'Restore server from a backup (Admin only)',
    usage: '!restore [number]',
    permission: 'admin',
    
    async execute(message, args, client) {
        if (!client.permissions.hasPermission(message.member, 'admin')) {
            return; // Silent fail - act as unknown command
        }
        
        const backupNumber = parseInt(args[0]);
        if (!backupNumber) {
            return await safeReply(message, '❌ Please specify a backup number! Usage: `!restore [number]`\nUse `!backups` to see available backups.');
        }
        
        const stats = antiRaid.getBackupStats(message.guild.id);
        if (backupNumber < 1 || backupNumber > stats.count) {
            return await safeReply(message, `❌ Invalid backup number! Please choose between 1 and ${stats.count}`);
        }
        
        const selectedBackup = stats.backups[backupNumber - 1];
        
        // Confirmation message
        const confirmEmbed = new EmbedBuilder()
            .setColor('#ff9800')
            .setTitle('⚠️ Backup Restore Confirmation')
            .setDescription(`You are about to restore from:\n**${selectedBackup.filename}**`)
            .addFields(
                { name: '📅 Created', value: selectedBackup.created.toLocaleString(), inline: true },
                { name: '📊 Size', value: `${selectedBackup.size} KB`, inline: true },
                { name: '⚠️ Warning', value: 'This will create channels and roles that don\'t exist.\nExisting channels/roles will NOT be deleted.', inline: false }
            )
            .setFooter({ text: 'Reply with "confirm" within 30 seconds to proceed' });
        
        await safeReply(message, { embeds: [confirmEmbed] });
        
        // Wait for confirmation
        const filter = m => m.author.id === message.author.id && m.content.toLowerCase() === 'confirm';
        const collector = message.channel.createMessageCollector({ filter, time: 30000, max: 1 });
        
        collector.on('collect', async () => {
            const statusMsg = await message.channel.send('⏳ Restoring server from backup... This may take several minutes.');
            
            try {
                const result = await antiRaid.restoreFromBackup(message.guild, selectedBackup.filename, client.guildConfig);
                
                if (result.success) {
                    const resultEmbed = new EmbedBuilder()
                        .setColor('#2ecc71')
                        .setTitle('✅ Server Restored Successfully')
                        .addFields(
                            { name: '📁 Backup', value: selectedBackup.filename, inline: false },
                            { name: '📊 Results', value: 
                                `• Channels created: ${result.results.channelsCreated}\n` +
                                `• Roles created: ${result.results.rolesCreated}\n` +
                                `• Errors: ${result.results.errors.length}`,
                                inline: false
                            }
                        )
                        .setTimestamp();
                    
                    if (result.results.errors.length > 0 && result.results.errors.length <= 5) {
                        resultEmbed.addFields({
                            name: '⚠️ Errors Encountered',
                            value: result.results.errors.join('\n').substring(0, 1024),
                            inline: false
                        });
                    }
                    
                    await statusMsg.edit({ content: null, embeds: [resultEmbed] });
                } else {
                    await statusMsg.edit(`❌ Restore failed: ${result.error}`);
                }
            } catch (error) {
                await statusMsg.edit('❌ An error occurred during restoration!');
            }
        });
        
        collector.on('end', collected => {
            if (collected.size === 0) {
                message.channel.send('❌ Restore cancelled - confirmation timeout.');
            }
        });
    }
};
