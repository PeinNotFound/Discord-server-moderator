const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Anti-Raid Configuration
const ANTI_RAID_CONFIG = {
    // Spam Detection
    SPAM_MESSAGE_COUNT: 10, // Messages within time window
    SPAM_TIME_WINDOW: 5000, // 5 seconds
    SPAM_MUTE_DURATION: 1, // 1 minute
    
    // Channel Deletion Protection
    CHANNEL_DELETE_COUNT: 3, // Deletions within time window
    CHANNEL_DELETE_TIME_WINDOW: 30000, // 30 seconds
    
    // Role Deletion Protection
    ROLE_DELETE_COUNT: 3,
    ROLE_DELETE_TIME_WINDOW: 30000,
    
    // Ban Wave Protection
    BAN_COUNT: 5,
    BAN_TIME_WINDOW: 60000 // 1 minute
};

// Tracking Maps
const messageTracker = new Map(); // Map<userId, Array<timestamp>>
const channelDeleteTracker = new Map(); // Map<userId, Array<timestamp>>
const roleDeleteTracker = new Map(); // Map<userId, Array<timestamp>>
const banTracker = new Map(); // Map<userId, Array<timestamp>>

// Backup directory
const BACKUP_DIR = path.join(__dirname, 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Initialize anti-raid protection for a guild
 */
function initAntiRaid(client, botConfig) {
    console.log('🛡️ Anti-Raid Protection Initialized');
    
    // Spam Detection
    client.on('messageCreate', async (message) => {
        if (!message.guild || message.author.bot) return;
        
        // Skip if user has moderator role
        if (message.member.roles.cache.some(role => 
            botConfig.moderatorRoles.includes(role.id) || 
            botConfig.adminRoles.includes(role.id)
        )) return;
        
        const userId = message.author.id;
        const now = Date.now();
        
        // Get or create message history for this user
        if (!messageTracker.has(userId)) {
            messageTracker.set(userId, []);
        }
        
        const userMessages = messageTracker.get(userId);
        
        // Add current message timestamp
        userMessages.push(now);
        
        // Remove old messages outside time window
        const filtered = userMessages.filter(timestamp => 
            now - timestamp < ANTI_RAID_CONFIG.SPAM_TIME_WINDOW
        );
        messageTracker.set(userId, filtered);
        
        // Check if spam threshold exceeded
        if (filtered.length >= ANTI_RAID_CONFIG.SPAM_MESSAGE_COUNT) {
            await handleSpammer(message.member, message.guild, botConfig);
            messageTracker.delete(userId);
        }
    });
    
    // Channel Deletion Protection
    client.on('channelDelete', async (channel) => {
        // Check if guild still exists
        if (!channel.guild || !client.guilds.cache.has(channel.guild.id)) return;
        
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Double-check guild exists before fetching audit logs
            if (!channel.guild || !client.guilds.cache.has(channel.guild.id)) return;
            
            const auditLogs = await channel.guild.fetchAuditLogs({
                limit: 1,
                type: 12 // CHANNEL_DELETE
            });
            
            const deleteLog = auditLogs.entries.first();
            if (!deleteLog) return;
            
            const { executor } = deleteLog;
            if (!executor || executor.bot) return;
            
            // Skip if user is admin
            const member = await channel.guild.members.fetch(executor.id).catch(() => null);
            if (!member) return;
            
            if (member.roles.cache.some(role => botConfig.adminRoles.includes(role.id))) return;
            
            const now = Date.now();
            
            if (!channelDeleteTracker.has(executor.id)) {
                channelDeleteTracker.set(executor.id, []);
            }
            
            const deletions = channelDeleteTracker.get(executor.id);
            deletions.push(now);
            
            const filtered = deletions.filter(timestamp => 
                now - timestamp < ANTI_RAID_CONFIG.CHANNEL_DELETE_TIME_WINDOW
            );
            channelDeleteTracker.set(executor.id, filtered);
            
            if (filtered.length >= ANTI_RAID_CONFIG.CHANNEL_DELETE_COUNT) {
                await handleRaider(member, channel.guild, 'mass channel deletion', botConfig);
                channelDeleteTracker.delete(executor.id);
            }
        } catch (error) {
            console.error('Channel delete protection error:', error);
        }
    });
    
    // Role Deletion Protection
    client.on('roleDelete', async (role) => {
        // Check if guild still exists
        if (!role.guild || !client.guilds.cache.has(role.guild.id)) return;
        
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Double-check guild exists before fetching audit logs
            if (!role.guild || !client.guilds.cache.has(role.guild.id)) return;
            
            const auditLogs = await role.guild.fetchAuditLogs({
                limit: 1,
                type: 32 // ROLE_DELETE
            });
            
            const deleteLog = auditLogs.entries.first();
            if (!deleteLog) return;
            
            const { executor } = deleteLog;
            if (!executor || executor.bot) return;
            
            const member = await role.guild.members.fetch(executor.id).catch(() => null);
            if (!member) return;
            
            if (member.roles.cache.some(r => botConfig.adminRoles.includes(r.id))) return;
            
            const now = Date.now();
            
            if (!roleDeleteTracker.has(executor.id)) {
                roleDeleteTracker.set(executor.id, []);
            }
            
            const deletions = roleDeleteTracker.get(executor.id);
            deletions.push(now);
            
            const filtered = deletions.filter(timestamp => 
                now - timestamp < ANTI_RAID_CONFIG.ROLE_DELETE_TIME_WINDOW
            );
            roleDeleteTracker.set(executor.id, filtered);
            
            if (filtered.length >= ANTI_RAID_CONFIG.ROLE_DELETE_COUNT) {
                await handleRaider(member, role.guild, 'mass role deletion', botConfig);
                roleDeleteTracker.delete(executor.id);
            }
        } catch (error) {
            console.error('Role delete protection error:', error);
        }
    });
    
    // Ban Wave Protection
    client.on('guildBanAdd', async (ban) => {
        // Check if guild still exists
        if (!ban.guild || !client.guilds.cache.has(ban.guild.id)) return;
        
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Double-check guild exists before fetching audit logs
            if (!ban.guild || !client.guilds.cache.has(ban.guild.id)) return;
            
            const auditLogs = await ban.guild.fetchAuditLogs({
                limit: 1,
                type: 22 // MEMBER_BAN_ADD
            });
            
            const banLog = auditLogs.entries.first();
            if (!banLog) return;
            
            const { executor } = banLog;
            if (!executor || executor.bot) return;
            
            const member = await ban.guild.members.fetch(executor.id).catch(() => null);
            if (!member) return;
            
            if (member.roles.cache.some(role => botConfig.adminRoles.includes(role.id))) return;
            
            const now = Date.now();
            
            if (!banTracker.has(executor.id)) {
                banTracker.set(executor.id, []);
            }
            
            const bans = banTracker.get(executor.id);
            bans.push(now);
            
            const filtered = bans.filter(timestamp => 
                now - timestamp < ANTI_RAID_CONFIG.BAN_TIME_WINDOW
            );
            banTracker.set(executor.id, filtered);
            
            if (filtered.length >= ANTI_RAID_CONFIG.BAN_COUNT) {
                await handleRaider(member, ban.guild, 'mass banning', botConfig);
                banTracker.delete(executor.id);
            }
        } catch (error) {
            console.error('Ban wave protection error:', error);
        }
    });
}

/**
 * Handle spam detection
 */
async function handleSpammer(member, guild, botConfig) {
    try {
        console.log(`🚨 SPAM DETECTED: ${member.user.tag}`);
        
        // Mute for 1 minute
        if (botConfig.mutedRoleId && botConfig.mutedRoleId !== 'your_muted_role_id_here') {
            const mutedRole = guild.roles.cache.get(botConfig.mutedRoleId);
            if (mutedRole) {
                await member.roles.add(mutedRole);
                
                // Auto-unmute after 1 minute
                setTimeout(async () => {
                    try {
                        if (member.roles.cache.has(mutedRole.id)) {
                            await member.roles.remove(mutedRole);
                        }
                    } catch (error) {
                        console.error('Auto-unmute error:', error);
                    }
                }, ANTI_RAID_CONFIG.SPAM_MUTE_DURATION * 60 * 1000);
            }
        }
        
        // Send log to mute channel
        if (botConfig.muteLogChannelId) {
            const logChannel = guild.channels.cache.get(botConfig.muteLogChannelId);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('🚨 Anti-Spam: User Muted')
                    .addFields(
                        { name: '👤 User', value: `<@${member.id}>`, inline: true },
                        { name: '🆔 User ID', value: member.id, inline: true },
                        { name: '⏰ Duration', value: `${ANTI_RAID_CONFIG.SPAM_MUTE_DURATION} minute`, inline: true },
                        { name: '📋 Reason', value: 'Spam Detection: Too many messages in short time', inline: false }
                    )
                    .setTimestamp();
                
                await logChannel.send({ embeds: [embed] });
            }
        }
        
        // Try to DM the user
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('⚠️ Spam Warning')
                .setDescription(`You have been temporarily muted in **${guild.name}** for 1 minute due to spam detection.`)
                .addFields(
                    { name: '📝 Reason', value: 'Sending too many messages too quickly', inline: false }
                )
                .setTimestamp();
            
            await member.send({ embeds: [dmEmbed] });
        } catch (error) {
            // Can't send DM
        }
        
    } catch (error) {
        console.error('Spam handler error:', error);
    }
}

/**
 * Handle raid/malicious activity detection
 */
async function handleRaider(member, guild, reason, botConfig) {
    try {
        console.log(`🚨 RAID DETECTED: ${member.user.tag} - ${reason}`);
        
        // Jail the user
        if (botConfig.jailRoleId && botConfig.jailRoleId !== 'your_jail_role_id_here') {
            const jailRole = guild.roles.cache.get(botConfig.jailRoleId);
            if (jailRole) {
                // Store current roles
                const currentRoles = member.roles.cache
                    .filter(role => role.id !== guild.id && role.id !== jailRole.id)
                    .map(role => role.id);
                
                // Remove all roles and add jail role
                await member.roles.set([jailRole.id]);
                
                // Disconnect from voice if connected
                if (member.voice.channel) {
                    try {
                        await member.voice.disconnect('Jailed for raid activity');
                    } catch (error) {
                        console.error('Voice disconnect error:', error);
                    }
                }
            }
        }
        
        // Send log to jail channel
        if (botConfig.jailLogChannelId) {
            const logChannel = guild.channels.cache.get(botConfig.jailLogChannelId);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#8B0000')
                    .setTitle('🚨 Anti-Raid: User Jailed')
                    .addFields(
                        { name: '👤 User', value: `<@${member.id}>`, inline: true },
                        { name: '🆔 User ID', value: member.id, inline: true },
                        { name: '🔴 Threat Type', value: reason, inline: false },
                        { name: '⚠️ Action Taken', value: 'Jailed indefinitely - Manual unjail required', inline: false }
                    )
                    .setFooter({ text: 'Anti-Raid System' })
                    .setTimestamp();
                
                await logChannel.send({ embeds: [embed] });
            }
        }
        
        // Try to DM the user
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor('#8B0000')
                .setTitle('🚨 Security Alert')
                .setDescription(`You have been jailed in **${guild.name}** due to suspicious activity.`)
                .addFields(
                    { name: '📝 Reason', value: reason, inline: false },
                    { name: '⚠️ Note', value: 'Contact server administrators if you believe this is a mistake.', inline: false }
                )
                .setTimestamp();
            
            await member.send({ embeds: [dmEmbed] });
        } catch (error) {
            // Can't send DM
        }
        
    } catch (error) {
        console.error('Raider handler error:', error);
    }
}

/**
 * Create server backup
 */
async function createServerBackup(guild, guildConfigManager = null) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupData = {
            guildInfo: {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL(),
                description: guild.description,
                createdAt: guild.createdAt,
                memberCount: guild.memberCount,
                backupDate: new Date().toISOString()
            },
            channels: [],
            roles: [],
            emojis: [],
            settings: {
                verificationLevel: guild.verificationLevel,
                defaultMessageNotifications: guild.defaultMessageNotifications,
                explicitContentFilter: guild.explicitContentFilter
            }
        };
        
        // Backup channels
        guild.channels.cache.forEach(channel => {
            const channelData = {
                id: channel.id,
                name: channel.name,
                type: channel.type,
                position: channel.position,
                parentId: channel.parentId
            };
            
            if (channel.isTextBased()) {
                channelData.topic = channel.topic;
                channelData.nsfw = channel.nsfw;
                channelData.rateLimitPerUser = channel.rateLimitPerUser;
            }
            
            if (channel.type === ChannelType.GuildVoice) {
                channelData.bitrate = channel.bitrate;
                channelData.userLimit = channel.userLimit;
            }
            
            backupData.channels.push(channelData);
        });
        
        // Backup roles
        guild.roles.cache.forEach(role => {
            if (role.id !== guild.id) { // Skip @everyone
                backupData.roles.push({
                    id: role.id,
                    name: role.name,
                    color: role.color,
                    position: role.position,
                    permissions: role.permissions.toArray(),
                    hoist: role.hoist,
                    mentionable: role.mentionable
                });
            }
        });
        
        // Backup emojis
        guild.emojis.cache.forEach(emoji => {
            backupData.emojis.push({
                id: emoji.id,
                name: emoji.name,
                url: emoji.url
            });
        });
        
        // Determine backup directory
        let backupDir;
        if (guildConfigManager) {
            // Use guild-specific backup directory
            backupDir = guildConfigManager.getGuildBackupPath(guild.id);
        } else {
            // Fallback to old global backup directory
            backupDir = BACKUP_DIR;
        }
        
        // Ensure backup directory exists
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        // Sanitize guild name for filename (remove invalid characters for Windows)
        const sanitizedName = guild.name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
        const filename = `backup_${sanitizedName}_${timestamp}.json`;
        const filepath = path.join(backupDir, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));
        
        return { success: true, filename, filepath };
        
    } catch (error) {
        console.error('Backup creation error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get backup statistics for a specific guild
 */
function getBackupStats(guildId = null) {
    try {
        let backupDir;
        if (guildId) {
            // Use guild-specific backup directory
            const GuildConfigManager = require('../utils/guildConfigManager.js');
            const guildConfigManager = new GuildConfigManager();
            backupDir = guildConfigManager.getGuildBackupPath(guildId);
        } else {
            // Fallback to old global backup directory
            backupDir = BACKUP_DIR;
        }
        
        if (!fs.existsSync(backupDir)) {
            return { count: 0, backups: [] };
        }
        
        const files = fs.readdirSync(backupDir);
        const backups = files.filter(f => f.startsWith('backup_') && f.endsWith('.json'));
        
        return {
            count: backups.length,
            backups: backups.map(filename => {
                const filepath = path.join(backupDir, filename);
                const stats = fs.statSync(filepath);
                return {
                    filename,
                    size: Math.round(stats.size / 1024), // KB
                    created: stats.birthtime
                };
            }).sort((a, b) => b.created - a.created) // Most recent first
        };
    } catch (error) {
        return { count: 0, backups: [] };
    }
}

/**
 * List available backups for a specific guild
 */
function listBackups(guildId = null) {
    try {
        const stats = getBackupStats(guildId);
        return stats.backups.map((backup, index) => {
            return `${index + 1}. **${backup.filename}**\n   Size: ${backup.size} KB | Created: ${backup.created.toLocaleString()}`;
        });
    } catch (error) {
        return [];
    }
}

/**
 * Restore server from backup
 */
async function restoreFromBackup(guild, filename, guildConfigManager = null, options = {}) {
    try {
        // Determine backup directory
        let backupDir;
        if (guildConfigManager) {
            // Use guild-specific backup directory
            backupDir = guildConfigManager.getGuildBackupPath(guild.id);
        } else {
            // Fallback to old global backup directory
            backupDir = BACKUP_DIR;
        }
        
        const filepath = path.join(backupDir, filename);
        
        if (!fs.existsSync(filepath)) {
            return { success: false, error: 'Backup file not found!' };
        }
        
        const backupData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        const results = {
            channelsCreated: 0,
            rolesCreated: 0,
            emojisRestored: 0,
            errors: []
        };
        
        // Restore roles first (needed for channel permissions)
        if (options.restoreRoles !== false) {
            console.log('Restoring roles...');
            const sortedRoles = backupData.roles.sort((a, b) => a.position - b.position);
            
            for (const roleData of sortedRoles) {
                try {
                    // Check if role already exists
                    const existingRole = guild.roles.cache.find(r => r.name === roleData.name);
                    if (!existingRole) {
                        await guild.roles.create({
                            name: roleData.name,
                            color: roleData.color,
                            permissions: roleData.permissions,
                            hoist: roleData.hoist,
                            mentionable: roleData.mentionable,
                            reason: 'Restored from backup'
                        });
                        results.rolesCreated++;
                    }
                } catch (error) {
                    results.errors.push(`Role "${roleData.name}": ${error.message}`);
                }
            }
        }
        
        // Restore channels
        if (options.restoreChannels !== false) {
            console.log('Restoring channels...');
            
            // First create categories
            const categories = backupData.channels.filter(c => c.type === 4); // Category type
            const sortedCategories = categories.sort((a, b) => a.position - b.position);
            
            const categoryMap = new Map(); // Old ID -> New Channel
            
            for (const catData of sortedCategories) {
                try {
                    // First check if category with same ID still exists (same server restore)
                    let existingCat = guild.channels.cache.get(catData.id);
                    
                    // If not found by ID, try to find by name and type
                    if (!existingCat || existingCat.type !== 4) {
                        existingCat = guild.channels.cache.find(c => c.name === catData.name && c.type === 4);
                    }
                    
                    if (!existingCat) {
                        // Category doesn't exist, create it
                        const newCat = await guild.channels.create({
                            name: catData.name,
                            type: 4,
                            position: catData.position,
                            reason: 'Restored from backup'
                        });
                        categoryMap.set(catData.id, newCat);
                        results.channelsCreated++;
                    } else {
                        // Category exists, map old ID to existing category
                        categoryMap.set(catData.id, existingCat);
                    }
                } catch (error) {
                    results.errors.push(`Category "${catData.name}": ${error.message}`);
                }
            }
            
            // Then create other channels
            const otherChannels = backupData.channels.filter(c => c.type !== 4);
            const sortedChannels = otherChannels.sort((a, b) => a.position - b.position);
            
            for (const channelData of sortedChannels) {
                try {
                    // Find the parent category first (for checking existing channels)
                    let parentCategory = null;
                    if (channelData.parentId) {
                        // First check if it's in our categoryMap
                        if (categoryMap.has(channelData.parentId)) {
                            parentCategory = categoryMap.get(channelData.parentId);
                        } else {
                            // Check if the category still exists in the guild (same server restore)
                            const existingParent = guild.channels.cache.get(channelData.parentId);
                            if (existingParent && existingParent.type === 4) {
                                parentCategory = existingParent;
                                // Add to map for future reference
                                categoryMap.set(channelData.parentId, existingParent);
                            }
                        }
                    }
                    
                    // Check if channel already exists (by name, type, and parent)
                    const expectedParentId = parentCategory ? parentCategory.id : null;
                    const existingChannel = guild.channels.cache.find(c => 
                        c.name === channelData.name && 
                        c.type === channelData.type &&
                        c.parentId === expectedParentId
                    );
                    
                    if (!existingChannel) {
                        // Channel doesn't exist, create it
                        const channelOptions = {
                            name: channelData.name,
                            type: channelData.type,
                            position: channelData.position,
                            reason: 'Restored from backup'
                        };
                        
                        if (parentCategory) {
                            channelOptions.parent = parentCategory;
                        }
                        
                        if (channelData.type === ChannelType.GuildText) {
                            channelOptions.topic = channelData.topic || null;
                            channelOptions.nsfw = channelData.nsfw || false;
                            channelOptions.rateLimitPerUser = channelData.rateLimitPerUser || 0;
                        } else if (channelData.type === ChannelType.GuildVoice) {
                            channelOptions.bitrate = channelData.bitrate || 64000;
                            channelOptions.userLimit = channelData.userLimit || 0;
                        }
                        
                        await guild.channels.create(channelOptions);
                        results.channelsCreated++;
                    }
                } catch (error) {
                    results.errors.push(`Channel "${channelData.name}": ${error.message}`);
                }
            }
        }
        
        return { success: true, results };
        
    } catch (error) {
        console.error('Restore error:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    initAntiRaid,
    createServerBackup,
    restoreFromBackup,
    getBackupStats,
    listBackups,
    ANTI_RAID_CONFIG
};

