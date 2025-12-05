const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'help',
    description: 'Show all available commands',
    usage: '!help',
    permission: null,
    
    async execute(message, args, client) {
        const pages = [
            new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Moderation Bot Commands - Page 1/3')
                .setDescription('**Here are all available commands**')
                .addFields(
                    {
                        name: '🔨 Moderation Commands',
                        value:
                            '`!ban @user [reason]` - Ban user\n' +
                            '`!kick @user [reason]` - Kick user\n' +
                            '`!unban <user_id> [reason]` - Unban user\n' +
                            '`!jail @user [time] [reason]` - Jail user (default 10min)\n' +
                            '`!unjail @user` - Release from jail\n' +
                            '`!warn @user [reason]` - Warn user\n' +
                            '`!unwarn @user [warn_number]` - Remove warning\n' +
                            '`!warnings @user` - View warnings\n' +
                            '`!clear [amount]` - Delete messages (1-1000)',
                        inline: false
                    },
                    {
                        name: '🎤 Voice Commands',
                        value: 
                            '`!mute @user [1-30]` - Mute user (default 10min)\n' +
                            '`!unmute @user` - Unmute user manually\n' +
                            '`!forcemuteall` - Force mute all in your VC\n' +
                            '`!forceunmuteall` - Force unmute all in your VC\n' +
                            '`!move @user [channel_id]` - Move user to VC',
                        inline: false
                    }
                )
                .setFooter({ text: 'Page 1/3 • Use buttons below to navigate' }),
            
            new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Moderation Bot Commands - Page 2/3')
                .setDescription('**Here are all available commands**')
                .addFields(
                    {
                        name: '🎛️ Voice Channel Control (Admin Only)',
                        value: 
                            '`!sb enable/disable` - Control soundboard for entire VC\n' +
                            '`!cam enable/disable` - Control camera/stream for entire VC\n' +
                            '└ Must be in the target voice channel\n' +
                            '└ Applies to @everyone in that channel',
                        inline: false
                    },
                    {
                        name: '🔒 Chat Control Commands (No Prefix)',
                        value: 
                            '`sed` - Lock chat (only mods can talk)\n' +
                            '`7el` - Unlock chat (everyone can talk)\n' +
                            '└ Works in the channel you send the command',
                        inline: false
                    },
                    {
                        name: '🔍 Utility Commands',
                        value: 
                            '`!snipe` - Show last deleted message\n' +
                            '`!debug` - Debug permission system\n' +
                            '`!help` - Show this help message',
                        inline: false
                    },
                    {
                        name: '🛡️ Anti-Raid & Backup (Admin Only)',
                        value: 
                            '`!backup_help` - Complete backup system guide\n' +
                            '`!backup` - Create a complete server backup\n' +
                            '`!backups` - List all available backups\n' +
                            '`!restore [number]` - Restore server from backup\n' +
                            '`!antiraid` - View anti-raid protection status\n' +
                            '└ Auto-detects spam, mass deletions, ban waves',
                        inline: false
                    },
                    {
                        name: '💎 Premium Role Management (Admin/Owner Only)',
                        value: 
                            '`!pr_owner @user @role` - Assign user as premium role owner\n' +
                            '`!pr_add @user` - Give your managed role to member\n' +
                            '`!pr_remove @user` - Remove your managed role from member',
                        inline: false
                    }
                )
                .setFooter({ text: 'Page 2/3 • Use buttons below to navigate' }),
            
            new EmbedBuilder()
                .setColor('#ffd700')
                .setTitle('Moderation Bot Commands - Page 3/3')
                .setDescription('**Staff Rank System Commands**')
                .addFields(
                    {
                        name: '⭐ Rank System Commands (All Staff)',
                        value: 
                            '`!points` - View your own rank and points\n' +
                            '`!rank_help` - Complete rank system guide with all tiers',
                        inline: false
                    },
                    {
                        name: '👑 Rank Management (Rank Admin Only)',
                        value: 
                            '`!rank @user/id` - View any user\'s rank and progress\n' +
                            '`!points_add @user [points] [reason]` - Add points\n' +
                            '`!points_minus @user [points] [reason]` - Remove points',
                        inline: false
                    }
                )
                .setFooter({ text: 'Use the buttons below to navigate • Page 3/3' })
                .setTimestamp()
        ];
        
        let currentPage = 0;
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_prev')
                    .setLabel('◀ Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('help_next')
                    .setLabel('Next ▶')
                    .setStyle(ButtonStyle.Primary)
            );
        
        const response = await safeReply(message, {
            embeds: [pages[currentPage]],
            components: [row]
        });
        
        const collector = response.createMessageComponentCollector({ time: 120000 });
        
        collector.on('collect', async interaction => {
            if (interaction.user.id !== message.author.id) {
                return await interaction.reply({ content: '❌ This is not your help menu!', ephemeral: true });
            }
            
            if (interaction.customId === 'help_prev') {
                currentPage = Math.max(0, currentPage - 1);
            } else if (interaction.customId === 'help_next') {
                currentPage = Math.min(pages.length - 1, currentPage + 1);
            }
            
            const newRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('help_prev')
                        .setLabel('◀ Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === 0),
                    new ButtonBuilder()
                        .setCustomId('help_next')
                        .setLabel('Next ▶')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === pages.length - 1)
                );
            
            await interaction.update({
                embeds: [pages[currentPage]],
                components: [newRow]
            });
        });
        
        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('help_prev')
                        .setLabel('◀ Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('help_next')
                        .setLabel('Next ▶')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true)
                );
            
            response.edit({ components: [disabledRow] }).catch(() => {});
        });
    }
};
