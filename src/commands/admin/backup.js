const antiRaid = require('../../modules/anti-raid.js');
const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'backup',
    description: 'Create a complete server backup (Admin only)',
    usage: '!backup',
    permission: 'admin',

    async execute(message, args, client) {
        if (!client.permissions.hasPermission(message.member, 'admin')) {
            return; // Silent fail - act as unknown command
        }

        const statusMsg = await safeReply(message, '⏳ Creating server backup... This may take a moment.');

        try {
            const result = await antiRaid.createServerBackup(message.guild, client.guildConfig);

            if (result.success) {
                const stats = antiRaid.getBackupStats(message.guild.id, client.guildConfig);

                const { EmbedBuilder } = require('discord.js');
                const embed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('✅ Server Backup Created')
                    .setDescription(`Backup has been successfully created and saved!`)
                    .addFields(
                        { name: '📁 Filename', value: result.filename, inline: false },
                        { name: '📊 Total Backups', value: `${stats.count} backup(s)`, inline: true },
                        {
                            name: '🗂️ Backup Contents', value:
                                `• Channels: ${message.guild.channels.cache.size}\n` +
                                `• Roles: ${message.guild.roles.cache.size}\n` +
                                `• Emojis: ${message.guild.emojis.cache.size}\n` +
                                `• Settings: Server configuration`,
                            inline: false
                        }
                    )
                    .setFooter({ text: 'Backups are stored in guild-specific directories' })
                    .setTimestamp();

                if (statusMsg) await statusMsg.edit({ content: null, embeds: [embed] });
            } else {
                if (statusMsg) await statusMsg.edit(`❌ Failed to create backup: ${result.error}`);
            }
        } catch (error) {
            if (statusMsg) await statusMsg.edit('❌ An error occurred while creating the backup!');
        }
    }
};
