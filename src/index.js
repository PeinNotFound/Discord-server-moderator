const { Client, GatewayIntentBits, Collection, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const rankSystem = require('./ranks.js');
const antiRaid = require('./anti-raid.js');

// Load config with error handling
let config;
try {
    config = require('./config.js');
    console.log('✅ Config loaded successfully');
} catch (error) {
    console.error('❌ Failed to load config.js:', error.message);
    console.error('Make sure config.js exists and has valid syntax');
    process.exit(1);
}

// Validate required config values
if (!config.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN is missing in config.js');
    process.exit(1);
}

if (!config.CLIENT_ID) {
    console.error('❌ CLIENT_ID is missing in config.js');
    process.exit(1);
}

// Create Discord client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration
    ]
});

// Store deleted messages for snipe functionality
const deletedMessages = new Map();
const warnedUsers = new Map();
const jailedUsers = new Map(); // Store original roles for jailed users

// Data persistence functions
const MODERATION_DATA_PATH = path.join(__dirname, 'moderation-data.json');

function loadData() {
    try {
        const data = JSON.parse(fs.readFileSync(MODERATION_DATA_PATH, 'utf8'));
        return data;
    } catch (error) {
        console.log('No existing moderation-data.json found, creating new one');
        return { jailedUsers: {}, warnedUsers: {} };
    }
}

function saveData(data) {
    try {
        fs.writeFileSync(MODERATION_DATA_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Failed to save data:', error);
    }
}

// Load existing data
const persistentData = loadData();

// Chat lock system - tracks locked channels
const lockedChannels = new Map(); // Map<channelId, { moderator: userId, timestamp: number }>

// Configuration from config.js
const botConfig = {
    prefix: config.PREFIX || '.',
    moderatorRoles: config.MODERATOR_ROLES ? config.MODERATOR_ROLES.split(',').map(id => id.trim()) : [],
    adminRoles: config.ADMIN_ROLES ? config.ADMIN_ROLES.split(',').map(id => id.trim()) : [],
    voiceModeratorRoles: config.VOICE_MODERATOR_ROLES ? config.VOICE_MODERATOR_ROLES.split(',').map(id => id.trim()) : [],
    rankAdminRoles: config.RANK_ADMIN_ROLES ? config.RANK_ADMIN_ROLES.split(',').map(id => id.trim()) : [],
    tempRoomsCategoryId: config.TEMP_ROOMS_CATEGORY_ID,
    warnRoleId: config.WARN_ROLE_ID,
    jailRoleId: config.JAIL_ROLE_ID,
    mutedRoleId: config.MUTED_ROLE_ID,
    // Separate log channels
    jailLogChannelId: config.JAIL_LOG_CHANNEL_ID,
    warnLogChannelId: config.WARN_LOG_CHANNEL_ID,
    muteLogChannelId: config.MUTE_LOG_CHANNEL_ID,
    banLogChannelId: config.BAN_LOG_CHANNEL_ID,
    kickLogChannelId: config.KICK_LOG_CHANNEL_ID,
    unbanLogChannelId: config.UNBAN_LOG_CHANNEL_ID,
    nicknameLogChannelId: config.NICKNAME_LOG_CHANNEL_ID,
    voiceModLogChannelId: config.VOICE_MOD_LOG_CHANNEL_ID,
    moveLogChannelId: config.MOVE_LOG_CHANNEL_ID,
    memberLeaveLogChannelId: config.MEMBER_LEAVE_LOG_CHANNEL_ID,
    // Rank system
    rankLogChannelId: config.RANK_LOG_CHANNEL_ID,
    trialStaffRoleId: config.TRIAL_STAFF_ROLE_ID,
    staffRoleId: config.STAFF_ROLE_ID,
    moderatorRoleId: config.MODERATOR_ROLE_ID,
    headModeratorRoleId: config.HEAD_MODERATOR_ROLE_ID,
    managerRoleId: config.MANAGER_ROLE_ID,
    headManagerRoleId: config.HEAD_MANAGER_ROLE_ID,
    administratorRoleId: config.ADMINISTRATOR_ROLE_ID
};


// Permission checking functions
function hasModeratorRole(member) {
    if (!member || !member.roles) return false;
    return member.roles.cache.some(role => botConfig.moderatorRoles.includes(role.id));
}

function hasAdminRole(member) {
    if (!member || !member.roles) return false;
    return member.roles.cache.some(role => botConfig.adminRoles.includes(role.id));
}

function hasVoiceModeratorRole(member) {
    if (!member || !member.roles) return false;
    return member.roles.cache.some(role => botConfig.voiceModeratorRoles.includes(role.id));
}

function hasRankAdminRole(member) {
    if (!member || !member.roles) return false;
    // Check if user has rank admin role OR is server owner
    if (member.id === member.guild.ownerId) return true;
    return member.roles.cache.some(role => botConfig.rankAdminRoles.includes(role.id));
}

function hasPermission(member, commandType) {
    if (!member) return false;
    
    // Check if user is server owner (always allow)
    if (member.id === member.guild.ownerId) {
        return true;
    }
    
    // Check configured roles first
    let hasConfiguredRole = false;
    switch (commandType) {
        case 'moderation':
            hasConfiguredRole = hasModeratorRole(member) || hasAdminRole(member);
            break;
        case 'voice':
            hasConfiguredRole = hasVoiceModeratorRole(member) || hasAdminRole(member);
            break;
        case 'admin':
            hasConfiguredRole = hasAdminRole(member);
            break;
        default:
            hasConfiguredRole = false;
    }
    
    return hasConfiguredRole;
}

// Logging function
async function logAction(guild, action, moderator, target, reason = 'No reason provided') {
    // Determine which log channel to use based on action type
    let logChannelId;
    let embedColor;
    let actionEmoji;
    
    switch (action) {
        case 'JAIL':
            logChannelId = botConfig.jailLogChannelId;
            embedColor = '#ff6b6b';
            actionEmoji = '🔒';
            break;
        case 'UNJAIL':
            logChannelId = botConfig.jailLogChannelId;
            embedColor = '#2ecc71';
            actionEmoji = '🔓';
            break;
        case 'WARN':
            logChannelId = botConfig.warnLogChannelId;
            embedColor = '#ffa500';
            actionEmoji = '⚠️';
            break;
        case 'UNWARN':
            logChannelId = botConfig.warnLogChannelId;
            embedColor = '#2ecc71';
            actionEmoji = '✅';
            break;
        case 'MUTE':
        case 'UNMUTE':
        case 'FORCE_MUTE':
        case 'FORCE_UNMUTE':
            logChannelId = botConfig.muteLogChannelId;
            embedColor = '#7289da';
            actionEmoji = action.includes('UNMUTE') ? '🔊' : '🔇';
            break;
        case 'BAN':
            logChannelId = botConfig.banLogChannelId;
            embedColor = '#8B0000';
            actionEmoji = '🚫';
            break;
        case 'KICK':
            logChannelId = botConfig.kickLogChannelId;
            embedColor = '#ff6b6b';
            actionEmoji = '👢';
            break;
        case 'UNBAN':
            logChannelId = botConfig.unbanLogChannelId;
            embedColor = '#00ff00';
            actionEmoji = '🔓';
            break;
        case 'NICKNAME':
            logChannelId = botConfig.nicknameLogChannelId;
            embedColor = '#9932cc';
            actionEmoji = '📝';
            break;
        default:
            return; // No logging if no specific channel configured
    }
    
    // If specific log channel is not configured, skip logging
    if (!logChannelId || logChannelId === 'your_' + action.toLowerCase() + '_log_channel_id_here') {
        return;
    }
    
    const logChannel = guild.channels.cache.get(logChannelId);
    if (!logChannel) return;
    
    const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(`${actionEmoji} Moderation Action: ${action}`)
        .setDescription(`**Action performed by:** ${moderator.user.tag}`)
        .addFields(
            { name: '👤 Target User', value: `${target.user ? target.user.tag : target.tag}`, inline: true },
            { name: '🆔 User ID', value: `${target.id}`, inline: true },
            { name: '📝 Reason', value: reason, inline: false },
            { name: '⏰ Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
            { name: '🏠 Server', value: guild.name, inline: true }
        )
        .setThumbnail(target.user ? target.user.displayAvatarURL() : guild.iconURL())
        .setFooter({ 
            text: `Moderator ID: ${moderator.id} • Action ID: ${Math.random().toString(36).substr(2, 9)}`,
            iconURL: moderator.user.displayAvatarURL()
        })
        .setTimestamp();
    
    try {
        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Failed to log action:', error);
    }
}

// Event: Bot ready
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} is online!`);
    console.log(`📊 Serving ${client.guilds.cache.size} servers`);
    client.user.setActivity('Moderating servers', { type: 'WATCHING' });
    
    // Debug: Show configured roles
    console.log('🔧 Configured Roles:');
    console.log(`   Moderator Roles: ${botConfig.moderatorRoles.join(', ')}`);
    console.log(`   Admin Roles: ${botConfig.adminRoles.join(', ')}`);
    console.log(`   Voice Moderator Roles: ${botConfig.voiceModeratorRoles.join(', ')}`);
    console.log(`   Temp Rooms Category: ${botConfig.tempRoomsCategoryId}`);
    console.log(`   Log Channel: ${botConfig.logChannelId}`);
    console.log(`   Prefix: ${botConfig.prefix}`);
    
    // Initialize Anti-Raid Protection
    antiRaid.initAntiRaid(client, botConfig);
});

// Event: Message deleted (for snipe)
client.on('messageDelete', (message) => {
    if (message.author.bot) return;
    
    const snipeData = {
        content: message.content,
        author: message.author,
        channel: message.channel,
        timestamp: Date.now(),
        attachments: message.attachments.map(att => ({ name: att.name, url: att.url }))
    };
    
    deletedMessages.set(message.channel.id, snipeData);
    
    // Auto-cleanup after 5 minutes
    setTimeout(() => {
        deletedMessages.delete(message.channel.id);
    }, 300000);
});


// Event: Guild member update (for nickname changes)
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    // Check if nickname changed
    if (oldMember.nickname !== newMember.nickname) {
        // Skip if no nickname log channel configured
        if (!botConfig.nicknameLogChannelId || botConfig.nicknameLogChannelId === 'your_nickname_log_channel_id_here') {
            return;
        }
        
        const logChannel = newMember.guild.channels.cache.get(botConfig.nicknameLogChannelId);
        if (!logChannel) return;
        
        const oldNickname = oldMember.nickname || oldMember.user.username;
        const newNickname = newMember.nickname || newMember.user.username;
        
        // Determine who changed the nickname
        let changedBy = 'Unknown';
        let changedByAvatar = null;
        
        // Try to get audit logs to find who changed the nickname
        try {
            const auditLogs = await newMember.guild.fetchAuditLogs({
                limit: 1,
                type: 24 // MEMBER_UPDATE
            });
            
            const auditLog = auditLogs.entries.first();
            if (auditLog && auditLog.target.id === newMember.id) {
                changedBy = auditLog.executor.tag;
                changedByAvatar = auditLog.executor.displayAvatarURL();
            }
        } catch (error) {
            console.log('Could not fetch audit logs for nickname change:', error.message);
        }
        
        const embed = new EmbedBuilder()
            .setColor('#9932cc')
            .setTitle('📝 Nickname Changed')
            .setDescription(`**User:** ${newMember.user.tag}`)
            .addFields(
                { name: '👤 User', value: `${newMember.user.tag}`, inline: true },
                { name: '🆔 User ID', value: `${newMember.id}`, inline: true },
                { name: '📝 Old Nickname', value: oldNickname, inline: false },
                { name: '📝 New Nickname', value: newNickname, inline: false },
                { name: '👨‍💼 Changed By', value: changedBy, inline: true },
                { name: '⏰ Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '🏠 Server', value: newMember.guild.name, inline: true }
            )
            .setThumbnail(newMember.user.displayAvatarURL())
            .setFooter({ 
                text: `User ID: ${newMember.id} • Change ID: ${Math.random().toString(36).substr(2, 9)}`,
                iconURL: changedByAvatar || newMember.guild.iconURL()
            })
            .setTimestamp();
        
        try {
            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Failed to log nickname change:', error);
        }
    }
});

// Event: Member leaves server (not kick/ban)
client.on('guildMemberRemove', async (member) => {
    // Skip if no member leave log channel configured
    if (!botConfig.memberLeaveLogChannelId || botConfig.memberLeaveLogChannelId === 'your_member_leave_log_channel_id_here') {
        return;
    }
    
    const logChannel = member.guild.channels.cache.get(botConfig.memberLeaveLogChannelId);
    if (!logChannel) return;
    
    // Check audit logs to determine if they were kicked/banned
    let wasKicked = false;
    let wasBanned = false;
    let executor = null;
    
    try {
        // Small delay to ensure audit log is available
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const kickLogs = await member.guild.fetchAuditLogs({
            limit: 3,
            type: 20 // MEMBER_KICK
        });
        
        const kickLog = kickLogs.entries.find(entry => 
            entry.target.id === member.id && 
            Date.now() - entry.createdTimestamp < 2000
        );
        
        if (kickLog) {
            wasKicked = true;
            executor = kickLog.executor;
        }
        
        if (!wasKicked) {
            const banLogs = await member.guild.fetchAuditLogs({
                limit: 3,
                type: 22 // MEMBER_BAN_ADD
            });
            
            const banLog = banLogs.entries.find(entry => 
                entry.target.id === member.id && 
                Date.now() - entry.createdTimestamp < 2000
            );
            
            if (banLog) {
                wasBanned = true;
                executor = banLog.executor;
            }
        }
    } catch (error) {
        console.log('Could not fetch audit logs for member leave:', error.message);
    }
    
    // Only log if they left voluntarily (not kicked/banned)
    if (!wasKicked && !wasBanned) {
        // Get member's roles before they left
        const roles = member.roles.cache
            .filter(role => role.name !== '@everyone')
            .map(role => role.name)
            .join(', ') || 'None';
        
        // Calculate how long they were in the server
        const joinedTimestamp = member.joinedTimestamp;
        const duration = joinedTimestamp ? Math.floor((Date.now() - joinedTimestamp) / 1000) : 0;
        
        const embed = new EmbedBuilder()
            .setColor('#ff6b6b')
            .setTitle('👋 Member Left Server')
            .setDescription(`**${member.user.tag}** has left the server`)
            .addFields(
                { name: '👤 User', value: `${member.user.tag}`, inline: true },
                { name: '🆔 User ID', value: `${member.id}`, inline: true },
                { name: '📅 Joined Server', value: joinedTimestamp ? `<t:${Math.floor(joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
                { name: '⏰ Left At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '📊 Time in Server', value: duration > 0 ? `<t:${Math.floor(joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
                { name: '🎭 Roles', value: roles, inline: false },
                { name: '📝 Leave Type', value: '🚶 Left Voluntarily', inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setFooter({ 
                text: `User ID: ${member.id} • Account Created`,
                iconURL: member.guild.iconURL()
            })
            .setTimestamp(member.user.createdTimestamp);
        
        try {
            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Failed to log member leave:', error);
        }
    }
});

// Event: Voice state update (for tracking mute/deafen/move actions)
client.on('voiceStateUpdate', async (oldState, newState) => {
    // Skip if no voice mod log channel configured
    if (!botConfig.voiceModLogChannelId || botConfig.voiceModLogChannelId === 'your_voice_mod_log_channel_id_here') {
        return;
    }
    
    const logChannel = newState.guild.channels.cache.get(botConfig.voiceModLogChannelId);
    if (!logChannel) return;
    
    const member = newState.member;
    if (!member) return;
    
    // Check for server mute changes (right-click mute)
    if (oldState.serverMute !== newState.serverMute) {
        const action = newState.serverMute ? 'Server Muted' : 'Server Unmuted';
        const emoji = newState.serverMute ? '🔇' : '🔊';
        const color = newState.serverMute ? '#ff6b6b' : '#00ff00';
        
        // Get who performed the action from audit logs
        let moderator = 'Unknown';
        let moderatorAvatar = null;
        
        try {
            // Small delay to ensure audit log is available
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const auditLogs = await newState.guild.fetchAuditLogs({
                limit: 5,
                type: 24 // MEMBER_UPDATE
            });
            
            // Find the most recent audit log entry for this member
            const auditLog = auditLogs.entries.find(entry => 
                entry.target.id === member.id && 
                Date.now() - entry.createdTimestamp < 2000 // Within last 2 seconds
            );
            
            if (auditLog && auditLog.executor) {
                moderator = auditLog.executor.tag;
                moderatorAvatar = auditLog.executor.displayAvatarURL();
            }
        } catch (error) {
            console.log('Could not fetch audit logs for voice mute:', error.message);
        }
        
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`${emoji} ${action}`)
            .setDescription(`**User:** ${member.user.tag}`)
            .addFields(
                { name: '👤 User', value: `${member.user.tag}`, inline: true },
                { name: '🆔 User ID', value: `${member.id}`, inline: true },
                { name: '🎤 Channel', value: newState.channel ? newState.channel.name : 'None', inline: false },
                { name: '👨‍💼 Performed By', value: moderator, inline: true },
                { name: '⏰ Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setFooter({ 
                text: `User ID: ${member.id}`,
                iconURL: moderatorAvatar || newState.guild.iconURL()
            })
            .setTimestamp();
        
        try {
            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Failed to log voice mute action:', error);
        }
    }
    
    // Check for server deafen changes (right-click deafen)
    if (oldState.serverDeaf !== newState.serverDeaf) {
        const action = newState.serverDeaf ? 'Server Deafened' : 'Server Undeafened';
        const emoji = newState.serverDeaf ? '🔇' : '🔊';
        const color = newState.serverDeaf ? '#ff6b6b' : '#00ff00';
        
        // Get who performed the action from audit logs
        let moderator = 'Unknown';
        let moderatorAvatar = null;
        
        try {
            // Small delay to ensure audit log is available
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const auditLogs = await newState.guild.fetchAuditLogs({
                limit: 5,
                type: 24 // MEMBER_UPDATE
            });
            
            // Find the most recent audit log entry for this member
            const auditLog = auditLogs.entries.find(entry => 
                entry.target.id === member.id && 
                Date.now() - entry.createdTimestamp < 2000 // Within last 2 seconds
            );
            
            if (auditLog && auditLog.executor) {
                moderator = auditLog.executor.tag;
                moderatorAvatar = auditLog.executor.displayAvatarURL();
            }
        } catch (error) {
            console.log('Could not fetch audit logs for voice deafen:', error.message);
        }
        
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`${emoji} ${action}`)
            .setDescription(`**User:** ${member.user.tag}`)
            .addFields(
                { name: '👤 User', value: `${member.user.tag}`, inline: true },
                { name: '🆔 User ID', value: `${member.id}`, inline: true },
                { name: '🎤 Channel', value: newState.channel ? newState.channel.name : 'None', inline: false },
                { name: '👨‍💼 Performed By', value: moderator, inline: true },
                { name: '⏰ Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setFooter({ 
                text: `User ID: ${member.id}`,
                iconURL: moderatorAvatar || newState.guild.iconURL()
            })
            .setTimestamp();
        
        try {
            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Failed to log voice deafen action:', error);
        }
    }
    
    // Check for channel moves (right-click move)
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        // Use separate move log channel if configured, otherwise use voice mod log channel
        let moveLogChannel = logChannel;
        if (botConfig.moveLogChannelId && botConfig.moveLogChannelId !== 'your_move_log_channel_id_here') {
            const specificMoveChannel = newState.guild.channels.cache.get(botConfig.moveLogChannelId);
            if (specificMoveChannel) {
                moveLogChannel = specificMoveChannel;
            }
        }
        
        // Get who performed the action from audit logs
        let moderator = null;
        let moderatorAvatar = null;
        
        try {
            // Wait longer to ensure audit log is fully written
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const auditLogs = await newState.guild.fetchAuditLogs({
                limit: 1,
                type: 26 // MEMBER_MOVE
            });
            
            const auditEntry = auditLogs.entries.first();
            
            if (auditEntry) {
                const timeDiff = Date.now() - auditEntry.createdTimestamp;
                
                // Check if this audit entry matches our move (within 3 seconds)
                if (timeDiff < 3000) {
                    // Check if executor is different from the member being moved
                    if (auditEntry.executor && auditEntry.executor.id !== member.id) {
                        moderator = auditEntry.executor.tag;
                        moderatorAvatar = auditEntry.executor.displayAvatarURL();
                    }
                }
            }
        } catch (error) {
            console.log('Could not fetch audit logs for voice move:', error.message);
        }
        
        // Set default if not found
        if (!moderator) {
            moderator = 'User (self-moved)';
            moderatorAvatar = member.user.displayAvatarURL();
        }
        
        const embed = new EmbedBuilder()
            .setColor('#7289da')
            .setTitle('🔄 User Moved Between Channels')
            .setDescription(`**User:** ${member.user.tag}`)
            .addFields(
                { name: '👤 User', value: `${member.user.tag}`, inline: true },
                { name: '🆔 User ID', value: `${member.id}`, inline: true },
                { name: '📤 From Channel', value: oldState.channel.name, inline: false },
                { name: '📥 To Channel', value: newState.channel.name, inline: false },
                { name: '👨‍💼 Performed By', value: moderator, inline: true },
                { name: '⏰ Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setFooter({ 
                text: `User ID: ${member.id}`,
                iconURL: moderatorAvatar || newState.guild.iconURL()
            })
            .setTimestamp();
        
        try {
            await moveLogChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Failed to log voice move action:', error);
        }
    }
});

// Helper function to check if user has any staff rank role
function isStaffMember(member, botConfig) {
    const staffRoleIds = [
        botConfig.trialStaffRoleId,
        botConfig.staffRoleId,
        botConfig.moderatorRoleId,
        botConfig.headModeratorRoleId,
        botConfig.managerRoleId,
        botConfig.headManagerRoleId,
        botConfig.administratorRoleId
    ].filter(id => id && id !== 'your_trial_staff_role_id_here' && id !== 'your_staff_role_id_here' && id !== 'your_moderator_role_id_here' && id !== 'your_head_moderator_role_id_here' && id !== 'your_manager_role_id_here' && id !== 'your_head_manager_role_id_here' && id !== 'your_administrator_role_id_here');
    
    return member.roles.cache.some(role => staffRoleIds.includes(role.id));
}

// Event: Message received
client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;
    
    // Check if bot was mentioned (before prefix check)
    if (message.mentions.has(client.user.id) && !message.content.startsWith(botConfig.prefix)) {
        return message.reply('👋 Hi! Type `!help` to see all available commands!');
    }
    
    // Check for sed/7el commands (no prefix required)
    const contentLower = message.content.toLowerCase().trim();
    if (contentLower === 'sed' || contentLower === '7el') {
        // Only moderators and admins can use these commands
        if (!hasPermission(message.member, 'moderation')) {
            return message.reply('❌ You don\'t have permission to use this command!');
        }
        
        if (contentLower === 'sed') {
            // Close/Lock the chat by removing @everyone's send message permission
            try {
                // Remove send message permission from @everyone
                await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: false
                });
                
                // Store lock info
                lockedChannels.set(message.channel.id, {
                    moderator: message.member.id,
                    moderatorTag: message.member.user.tag,
                    timestamp: Date.now()
                });
                
                return message.channel.send(`**🔒 ${message.channel} has been locked.**`);
            } catch (error) {
                console.error('Lock channel error:', error);
                return message.reply('❌ Failed to lock channel! Make sure the bot has **Manage Channels** permission.');
            }
        } 
        else if (contentLower === '7el') {
            // Open/Unlock the chat by restoring @everyone's send message permission
            if (!lockedChannels.has(message.channel.id)) {
                return message.reply('❌ This channel is not locked!');
            }
            
            try {
                // Restore send message permission for @everyone (set to null = inherit from category/server)
                await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: null
                });
                
                lockedChannels.delete(message.channel.id);
                
                return message.channel.send(`**🔓 ${message.channel} has been unlocked.**`);
            } catch (error) {
                console.error('Unlock channel error:', error);
                return message.reply('❌ Failed to unlock channel! Make sure the bot has **Manage Channels** permission.');
            }
        }
    }
    
    // Note: Channel lock is now handled via Discord permissions, no need to delete messages
    
    if (!message.content.startsWith(botConfig.prefix)) {
        return;
    }
    
    const args = message.content.slice(botConfig.prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    try {
        // Moderation Commands
        if (command === 'ban') {
            if (!hasPermission(message.member, 'moderation')) {
                return message.reply('❌ You don\'t have permission to use this command!');
            }
            
            // Get target by mention or ID
            let target = message.mentions.members.first();
            let userId = args[0];
            
            if (!target && userId) {
                // Try to fetch member by ID
                try {
                    target = await message.guild.members.fetch(userId);
                } catch (error) {
                    // If member not in server, we can still ban by ID
                    const reason = args.slice(1).join(' ');
                    if (!reason) return message.reply('❌ Please provide a reason for the ban! Usage: `!ban @user|user_id [reason]`');
                    
                    try {
                        await message.guild.members.ban(userId, { reason: reason });
                        await logAction(message.guild, 'BAN', message.member, { user: { tag: `User ID: ${userId}`, displayAvatarURL: () => null }, id: userId }, reason);
                        
                        const successEmbed = new EmbedBuilder()
                            .setColor('#8B0000')
                            .setTitle('🔨 User Banned')
                            .setDescription(`Successfully banned user`)
                            .addFields(
                                { name: '👤 User', value: `ID: ${userId}`, inline: true },
                                { name: '📝 Reason', value: reason, inline: false },
                                { name: '👮 Moderator', value: message.member.user.tag, inline: true },
                                { name: '⏰ Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                            )
                            .setTimestamp();
                        
                        return message.reply({ embeds: [successEmbed] });
                    } catch (banError) {
                        return message.reply(`❌ Failed to ban user: ${banError.message}`);
                    }
                }
            }
            
            if (!target) return message.reply('❌ Please mention a user or provide a user ID to ban!');
            
            const reason = args.slice(1).join(' ');
            if (!reason) return message.reply('❌ Please provide a reason for the ban! Usage: `!ban @user|user_id [reason]`');
            
            try {
                // Ban user without sending DM
                await target.ban({ reason: reason });
                await logAction(message.guild, 'BAN', message.member, target, reason);
                
                const successEmbed = new EmbedBuilder()
                        .setColor('#8B0000')
                    .setTitle('🔨 User Banned')
                    .setDescription(`Successfully banned ${target.user.tag}`)
                        .addFields(
                        { name: '👤 User', value: `${target.user.tag}\n<@${target.id}>`, inline: true },
                            { name: '📝 Reason', value: reason, inline: false },
                        { name: '👮 Moderator', value: message.member.user.tag, inline: true },
                        { name: '⏰ Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                        )
                    .setThumbnail(target.user.displayAvatarURL())
                        .setTimestamp();
                    
                message.reply({ embeds: [successEmbed] });
            } catch (error) {
                console.error('Ban error:', error);
                if (error.code === 50013) {
                    message.reply('❌ I don\'t have permission to ban users! Please give me the **Ban Members** permission.');
                } else {
                    message.reply(`❌ Failed to ban user: ${error.message}`);
                }
            }
        }
        
        else if (command === 'kick') {
            if (!hasPermission(message.member, 'moderation')) {
                return message.reply('❌ You don\'t have permission to use this command!');
            }
            
            const target = message.mentions.members.first();
            if (!target) return message.reply('❌ Please mention a user to kick!');
            
            const reason = args.slice(1).join(' ');
            if (!reason) return message.reply('❌ Please provide a reason for the kick! Usage: `!kick @user [reason]`');
            
            try {
                // Try to send DM to user before kicking
                try {
                    await target.send(`👢 **You have been kicked from ${message.guild.name}**\n**Reason:** ${reason}\n**Moderator:** ${message.member.user.tag}`);
                } catch (dmError) {
                    console.log('Could not send DM to user:', dmError.message);
                }
                
                await target.kick(reason);
                await logAction(message.guild, 'KICK', message.member, target, reason);
                
                const successEmbed = new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle('👢 User Kicked')
                    .setDescription(`Successfully kicked ${target.user.tag}`)
                    .addFields(
                        { name: '👤 User', value: `${target.user.tag}\n<@${target.id}>`, inline: true },
                        { name: '📝 Reason', value: reason, inline: false },
                        { name: '👮 Moderator', value: message.member.user.tag, inline: true },
                        { name: '⏰ Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                    )
                    .setThumbnail(target.user.displayAvatarURL())
                    .setTimestamp();
                
                message.reply({ embeds: [successEmbed] });
            } catch (error) {
                console.error('Kick error:', error);
                if (error.code === 50013) {
                    message.reply('❌ I don\'t have permission to kick users! Please give me the **Kick Members** permission.');
                } else {
                    message.reply(`❌ Failed to kick user: ${error.message}`);
                }
            }
        }
        
        else if (command === 'unban') {
            if (!hasPermission(message.member, 'moderation')) {
                return message.reply('❌ You don\'t have permission to use this command!');
            }
            
            const userId = args[0];
            if (!userId) return message.reply('❌ Please provide a user ID to unban! Usage: `!unban [user_id] [reason]`');
            
            const reason = args.slice(1).join(' ') || 'No reason provided';
            
            try {
                // Try to fetch the banned user
                const bannedUser = await message.guild.bans.fetch(userId).catch(() => null);
                if (!bannedUser) {
                    return message.reply('❌ User is not banned or user ID is invalid!');
                }
                
                await message.guild.bans.remove(userId, reason);
                await logAction(message.guild, 'UNBAN', message.member, { user: bannedUser.user, id: userId }, reason);
                
                const successEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ User Unbanned')
                    .setDescription(`Successfully unbanned ${bannedUser.user.tag}`)
                    .addFields(
                        { name: '👤 User', value: `${bannedUser.user.tag}\nID: ${userId}`, inline: true },
                        { name: '📝 Reason', value: reason, inline: false },
                        { name: '👮 Moderator', value: message.member.user.tag, inline: true },
                        { name: '⏰ Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                    )
                    .setThumbnail(bannedUser.user.displayAvatarURL())
                    .setTimestamp();
                
                message.reply({ embeds: [successEmbed] });
                
            } catch (error) {
                console.error('Unban error:', error);
                if (error.code === 50013) {
                    message.reply('❌ I don\'t have permission to unban users! Please give me the **Ban Members** permission.');
                } else {
                    message.reply(`❌ Failed to unban user: ${error.message}`);
                }
            }
        }
        
        else if (command === 'jail') {
            if (!hasPermission(message.member, 'moderation')) {
                return message.reply('❌ You don\'t have permission to use this command!');
            }
            
            // Get target by mention or ID
            let target = message.mentions.members.first();
            const userId = args[0];
            
            if (!target && userId) {
                try {
                    target = await message.guild.members.fetch(userId);
                } catch (error) {
                    return message.reply('❌ User not found in server! Please mention a user or provide a valid user ID.');
                }
            }
            
            if (!target) return message.reply('❌ Please mention a user or provide a user ID to jail!');
            
            const time = args[1] ? parseInt(args[1]) : 10; // Default 10 minutes
            const reason = args.slice(2).join(' ') || 'No reason provided';
            
            try {
                // Send DM to user before jailing
                try {
                    const jailEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('🔒 You Have Been Jailed')
                        .setDescription(`You have been temporarily jailed in **${message.guild.name}**`)
                        .addFields(
                            { name: '📝 Reason', value: reason, inline: false },
                            { name: '⏱️ Duration', value: `${time} minutes`, inline: true },
                            { name: '⏰ Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                            { name: '🏠 Server', value: message.guild.name, inline: true }
                        )
                        .setThumbnail(message.guild.iconURL())
                        .setFooter({ text: 'You will be automatically released after the duration expires' })
                        .setTimestamp();
                    
                    await target.send({ embeds: [jailEmbed] });
                } catch (dmError) {
                    console.log('Could not send DM to user:', dmError.message);
                }
                
                // Get or create jail role
                let jailRole;
                if (botConfig.jailRoleId && botConfig.jailRoleId !== 'your_jail_role_id_here') {
                    jailRole = message.guild.roles.cache.get(botConfig.jailRoleId);
                    if (!jailRole) {
                        return message.reply('❌ Jail role not found! Please check your JAIL_ROLE_ID in config.js');
                    }
                } else {
                    // Fallback: create or find "Jailed" role
                    jailRole = message.guild.roles.cache.find(role => role.name === 'Jailed');
                    if (!jailRole) {
                        jailRole = await message.guild.roles.create({
                            name: 'Jailed',
                            color: '#ff0000',
                            permissions: []
                        });
                    }
                }
                
                // Store original roles before jailing
                const originalRoles = target.roles.cache.filter(role => role.name !== '@everyone').map(role => role.id);
                
                // Store jail data in memory and persistent storage
                const jailData = {
                    originalRoles: originalRoles,
                    jailTime: Date.now() + (time * 60 * 1000),
                    moderator: message.member.id,
                    reason: reason,
                    guildId: message.guild.id,
                    timestamp: Date.now()
                };
                
                jailedUsers.set(target.id, jailData);
                persistentData.jailedUsers[target.id] = jailData;
                saveData(persistentData);
                
                // Remove all roles and give only jail role
                await target.roles.set([jailRole]);
                
                // Disconnect from voice channel if connected
                if (target.voice.channel) {
                    try {
                        await target.voice.disconnect('Jailed - disconnected from voice channel');
                        console.log(`Disconnected ${target.user.tag} from voice channel during jail`);
                    } catch (disconnectError) {
                        console.log('Could not disconnect user from voice:', disconnectError.message);
                    }
                }
                
                await logAction(message.guild, 'JAIL', message.member, target, reason);
                
                const successEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('🔒 User Jailed')
                    .setDescription(`Successfully jailed ${target.user.tag}`)
                    .addFields(
                        { name: '👤 User', value: `${target.user.tag}\n<@${target.id}>`, inline: true },
                        { name: '⏱️ Duration', value: `${time} minutes`, inline: true },
                        { name: '📝 Reason', value: reason, inline: false },
                        { name: '👮 Moderator', value: message.member.user.tag, inline: true },
                        { name: '🔓 Release Time', value: `<t:${Math.floor((Date.now() + (time * 60 * 1000)) / 1000)}:R>`, inline: true }
                    )
                    .setThumbnail(target.user.displayAvatarURL())
                    .setFooter({ text: 'User will be automatically released after the duration expires' })
                    .setTimestamp();
                
                message.reply({ embeds: [successEmbed] });
                
                // Auto-unjail after specified time
                setTimeout(async () => {
                    try {
                        // Check if user is still in the server
                        const member = message.guild.members.cache.get(target.id);
                        if (!member) {
                            console.log(`User ${target.user.tag} is no longer in the server, skipping unjail`);
                            jailedUsers.delete(target.id);
                            delete persistentData.jailedUsers[target.id];
                            saveData(persistentData);
                            return;
                        }
                        
                        // Check if user still has the jail role
                        if (member.roles.cache.has(jailRole.id)) {
                            // Restore original roles from persistent data
                            const storedJailData = persistentData.jailedUsers[target.id];
                            if (storedJailData && storedJailData.originalRoles.length > 0) {
                                // Get role objects for original roles
                                const rolesToRestore = storedJailData.originalRoles
                                    .map(roleId => message.guild.roles.cache.get(roleId))
                                    .filter(role => role !== undefined);
                                
                                // Remove jail role and restore original roles
                                await member.roles.set(rolesToRestore);
                            } else {
                                // Fallback: just remove jail role
                                await member.roles.remove(jailRole);
                            }
                            
                            // Clean up stored data
                            jailedUsers.delete(target.id);
                            delete persistentData.jailedUsers[target.id];
                            saveData(persistentData);
                            
                            // Send DM to user about being released
                            try {
                                const unjailEmbed = new EmbedBuilder()
                                    .setColor('#2ecc71')
                                    .setTitle('🔓 Jail Time Expired')
                                    .setDescription(`Your jail time has expired in **${message.guild.name}**`)
                                    .addFields(
                                        { name: '✅ Status', value: 'Your roles have been restored and you can now participate normally', inline: false },
                                        { name: '⏰ Released At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                                        { name: '🏠 Server', value: message.guild.name, inline: true }
                                    )
                                    .setThumbnail(message.guild.iconURL())
                                    .setFooter({ text: 'Welcome back!' })
                                    .setTimestamp();
                                
                                await member.send({ embeds: [unjailEmbed] });
                            } catch (dmError) {
                                console.log('Could not send DM to user:', dmError.message);
                            }
                            
                            // Log the automatic unjail action
                            try {
                                const botMember = message.guild.members.cache.get(message.client.user.id);
                                await logAction(message.guild, 'UNJAIL', botMember, member, 'Jail time expired (automatic release)');
                            } catch (logError) {
                                console.log('Could not log unjail action:', logError.message);
                            }
                            
                            message.channel.send(`🔓 ${target.user.tag} has been automatically released from jail!`);
                        } else {
                            console.log(`User ${target.user.tag} no longer has jail role`);
                            jailedUsers.delete(target.id);
                            delete persistentData.jailedUsers[target.id];
                            saveData(persistentData);
                        }
                    } catch (error) {
                        console.error('Failed to unjail user:', error);
                        message.channel.send(`⚠️ Failed to automatically release ${target.user.tag} from jail. Please use !unjail @user to manually release them.`);
                    }
                }, time * 60 * 1000);
                
            } catch (error) {
                console.error('Jail error:', error);
                if (error.code === 50013) {
                    message.reply('❌ I don\'t have permission to manage roles! Please give me the **Manage Roles** permission.');
                } else {
                    message.reply(`❌ Failed to jail user: ${error.message}`);
                }
            }
        }
        
        else if (command === 'warn') {
            if (!hasPermission(message.member, 'moderation')) {
                return message.reply('❌ You don\'t have permission to use this command!');
            }
            
            // Get target by mention or ID
            let target = message.mentions.members.first();
            const userId = args[0];
            
            if (!target && userId) {
                try {
                    target = await message.guild.members.fetch(userId);
                } catch (error) {
                    return message.reply('❌ User not found in server! Please mention a user or provide a valid user ID.');
                }
            }
            
            if (!target) return message.reply('❌ Please mention a user or provide a user ID to warn!');
            
            const reason = args.slice(1).join(' ') || 'No reason provided';
            
            try {
                // Give warn role if configured
                if (botConfig.warnRoleId && botConfig.warnRoleId !== 'your_warn_role_id_here') {
                    const warnRole = message.guild.roles.cache.get(botConfig.warnRoleId);
                    if (warnRole) {
                        await target.roles.add(warnRole);
                    }
                }
                
                // Send DM to user
                try {
                    const warnEmbed = new EmbedBuilder()
                        .setColor('#ffa500')
                        .setTitle('⚠️ Warning Received')
                        .setDescription(`You have received a warning in **${message.guild.name}**`)
                        .addFields(
                            { name: '📝 Reason', value: reason, inline: false },
                            { name: '⏰ Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                            { name: '🏠 Server', value: message.guild.name, inline: true }
                        )
                        .setThumbnail(message.guild.iconURL())
                        .setFooter({ text: 'Please follow the server rules to avoid further action' })
                        .setTimestamp();
                    
                    await target.send({ embeds: [warnEmbed] });
                } catch (dmError) {
                    console.log('Could not send DM to user:', dmError.message);
                }
                
                // Store warning in memory and persistent data
                if (!warnedUsers.has(target.id)) {
                    warnedUsers.set(target.id, []);
                }
                if (!persistentData.warnedUsers[target.id]) {
                    persistentData.warnedUsers[target.id] = [];
                }
                
                const warningData = {
                    moderator: message.member.id,
                    reason: reason,
                    timestamp: Date.now()
                };
                
                warnedUsers.get(target.id).push(warningData);
                persistentData.warnedUsers[target.id].push(warningData);
                saveData(persistentData);
                
                await logAction(message.guild, 'WARN', message.member, target, reason);
                
                const warningCount = warnedUsers.get(target.id).length;
                
                // Check if user reached 3 warnings - Auto jail for 24 hours
                if (warningCount >= 3) {
                    try {
                        // Get or create jail role
                        let jailRole;
                        if (botConfig.jailRoleId && botConfig.jailRoleId !== 'your_jail_role_id_here') {
                            jailRole = message.guild.roles.cache.get(botConfig.jailRoleId);
                            if (!jailRole) {
                                console.log('⚠️ Jail role not found! Cannot auto-jail for 3 warnings.');
                            }
                        } else {
                            jailRole = message.guild.roles.cache.find(role => role.name === 'Jailed');
                            if (!jailRole) {
                                jailRole = await message.guild.roles.create({
                                    name: 'Jailed',
                                    color: '#ff0000',
                                    permissions: []
                                });
                            }
                        }
                        
                        if (jailRole) {
                            // Store original roles before jailing
                            const originalRoles = target.roles.cache.filter(role => role.name !== '@everyone').map(role => role.id);
                            
                            // Store jail data (24 hours = 1440 minutes)
                            const jailTime = 1440;
                            const jailData = {
                                originalRoles: originalRoles,
                                jailTime: Date.now() + (jailTime * 60 * 1000),
                                moderator: message.member.id,
                                reason: '3 warnings reached - Auto-jailed',
                                guildId: message.guild.id,
                                timestamp: Date.now(),
                                autoJailed: true
                            };
                            
                            jailedUsers.set(target.id, jailData);
                            persistentData.jailedUsers[target.id] = jailData;
                            saveData(persistentData);
                            
                            // Remove all roles and give only jail role
                            await target.roles.set([jailRole]);
                            
                            // Disconnect from voice if connected
                            if (target.voice.channel) {
                                try {
                                    await target.voice.disconnect('Auto-jailed for 3 warnings');
                                } catch (disconnectError) {
                                    console.log('Could not disconnect user from voice:', disconnectError.message);
                                }
                            }
                            
                            // Send DM to user about auto-jail
                            try {
                                const autoJailEmbed = new EmbedBuilder()
                                    .setColor('#8B0000')
                                    .setTitle('🔒 Automatically Jailed - 3 Warnings Reached')
                                    .setDescription(`You have been automatically jailed in **${message.guild.name}** for receiving 3 warnings`)
                                    .addFields(
                                        { name: '⚠️ Warnings', value: '3 warnings (threshold reached)', inline: false },
                                        { name: '⏱️ Duration', value: '24 hours (1440 minutes)', inline: true },
                                        { name: '⏰ Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                                        { name: '🏠 Server', value: message.guild.name, inline: true },
                                        { name: '📝 Note', value: 'Your warnings will be cleared when you are released from jail', inline: false }
                                    )
                                    .setThumbnail(message.guild.iconURL())
                                    .setFooter({ text: 'You will be automatically released after 24 hours' })
                                    .setTimestamp();
                                
                                await target.send({ embeds: [autoJailEmbed] });
                            } catch (dmError) {
                                console.log('Could not send DM to user:', dmError.message);
                            }
                            
                            // Log the auto-jail
                            await logAction(message.guild, 'JAIL', message.member, target, '3 warnings reached - Auto-jailed for 24 hours');
                            
                            // Auto-unjail after 24 hours
                            setTimeout(async () => {
                                try {
                                    const member = await message.guild.members.fetch(target.id).catch(() => null);
                                    if (!member) return;
                                    
                                    const storedJailData = persistentData.jailedUsers[target.id];
                                    if (storedJailData && storedJailData.originalRoles.length > 0) {
                                        const rolesToRestore = storedJailData.originalRoles
                                            .map(roleId => message.guild.roles.cache.get(roleId))
                                            .filter(role => role !== undefined);
                                        
                                        await member.roles.set(rolesToRestore);
                                    } else {
                                        await member.roles.remove(jailRole);
                                    }
                                    
                                    // Clear warnings as they're released from auto-jail
                                    warnedUsers.delete(target.id);
                                    delete persistentData.warnedUsers[target.id];
                                    
                                    // Remove warn role if they have it
                                    if (botConfig.warnRoleId && botConfig.warnRoleId !== 'your_warn_role_id_here') {
                                        const warnRole = message.guild.roles.cache.get(botConfig.warnRoleId);
                                        if (warnRole && member.roles.cache.has(warnRole.id)) {
                                            await member.roles.remove(warnRole);
                                        }
                                    }
                                    
                                    jailedUsers.delete(target.id);
                                    delete persistentData.jailedUsers[target.id];
                                    saveData(persistentData);
                                    
                                    // Send DM about release
                                    try {
                                        const releaseEmbed = new EmbedBuilder()
                                            .setColor('#2ecc71')
                                            .setTitle('🔓 Released from Auto-Jail')
                                            .setDescription(`You have been automatically released from jail in **${message.guild.name}**`)
                                            .addFields(
                                                { name: '✅ Status', value: 'Your roles have been restored and warnings cleared', inline: false },
                                                { name: '⏰ Released At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                                                { name: '🏠 Server', value: message.guild.name, inline: true },
                                                { name: '💡 Note', value: 'This was a fresh start. Please follow server rules moving forward.', inline: false }
                                            )
                                            .setThumbnail(message.guild.iconURL())
                                            .setFooter({ text: 'Welcome back!' })
                                            .setTimestamp();
                                        
                                        await member.send({ embeds: [releaseEmbed] });
                                    } catch (dmError) {
                                        console.log('Could not send DM to user:', dmError.message);
                                    }
                                    
                                    await logAction(message.guild, 'UNJAIL', { user: { tag: 'System' } }, member, 'Auto-released from jail (24h expired) - Warnings cleared');
                                } catch (error) {
                                    console.error('Auto-unjail error:', error);
                                }
                            }, jailTime * 60 * 1000);
                            
                            const autoJailSuccessEmbed = new EmbedBuilder()
                                .setColor('#8B0000')
                                .setTitle('🔒 User Automatically Jailed!')
                                .setDescription(`${target.user.tag} reached 3 warnings and has been automatically jailed!`)
                                .addFields(
                                    { name: '👤 User', value: `${target.user.tag}\n<@${target.id}>`, inline: true },
                                    { name: '⚠️ Warnings', value: '3 (threshold)', inline: true },
                                    { name: '⏱️ Jail Duration', value: '24 hours', inline: true },
                                    { name: '🔓 Release Time', value: `<t:${Math.floor((Date.now() + (jailTime * 60 * 1000)) / 1000)}:R>`, inline: true },
                                    { name: '📝 Note', value: 'Warnings will be cleared upon release', inline: false }
                                )
                                .setThumbnail(target.user.displayAvatarURL())
                                .setFooter({ text: 'Auto-jail system activated' })
                                .setTimestamp();
                            
                            message.reply({ embeds: [autoJailSuccessEmbed] });
                        } else {
                            // If jail role not found, just show warning success
                            const successEmbed = new EmbedBuilder()
                                .setColor('#ffcc00')
                                .setTitle('⚠️ User Warned')
                                .setDescription(`Successfully warned ${target.user.tag}`)
                                .addFields(
                                    { name: '👤 User', value: `${target.user.tag}\n<@${target.id}>`, inline: true },
                                    { name: '⚠️ Total Warnings', value: `${warningCount}`, inline: true },
                                    { name: '📝 Reason', value: reason, inline: false },
                                    { name: '👮 Moderator', value: message.member.user.tag, inline: true },
                                    { name: '⏰ Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                                    { name: '⚠️ Alert', value: 'User reached 3 warnings but jail role is not configured!', inline: false }
                                )
                                .setThumbnail(target.user.displayAvatarURL())
                                .setFooter({ text: 'User has been notified via DM' })
                                .setTimestamp();
                            
                            message.reply({ embeds: [successEmbed] });
                        }
                    } catch (autoJailError) {
                        console.error('Auto-jail error:', autoJailError);
                        message.channel.send(`⚠️ ${target.user.tag} reached 3 warnings but auto-jail failed: ${autoJailError.message}`);
                    }
                } else {
                    // Normal warning (less than 3)
                    const successEmbed = new EmbedBuilder()
                        .setColor('#ffcc00')
                        .setTitle('⚠️ User Warned')
                        .setDescription(`Successfully warned ${target.user.tag}`)
                        .addFields(
                            { name: '👤 User', value: `${target.user.tag}\n<@${target.id}>`, inline: true },
                            { name: '⚠️ Total Warnings', value: `${warningCount}/3`, inline: true },
                            { name: '📝 Reason', value: reason, inline: false },
                            { name: '👮 Moderator', value: message.member.user.tag, inline: true },
                            { name: '⏰ Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                        )
                        .setThumbnail(target.user.displayAvatarURL())
                        .setFooter({ text: warningCount === 2 ? '⚠️ One more warning will result in automatic 24h jail!' : 'User has been notified via DM' })
                        .setTimestamp();
                    
                    message.reply({ embeds: [successEmbed] });
                }
                
            } catch (error) {
                console.error('Warn error:', error);
                if (error.code === 50013) {
                    message.reply('❌ I don\'t have permission to manage roles! Please give me the **Manage Roles** permission.');
                } else {
                    message.reply(`❌ Failed to warn user: ${error.message}`);
                }
            }
        }
        
        else if (command === 'warnings') {
            if (!hasPermission(message.member, 'moderation')) {
                return message.reply('❌ You don\'t have permission to use this command!');
            }
            
            const target = message.mentions.members.first();
            if (!target) return message.reply('❌ Please mention a user to check warnings!');
            
            const userWarnings = warnedUsers.get(target.id) || [];
            
            if (userWarnings.length === 0) {
                return message.reply(`✅ ${target.user.tag} has no warnings!`);
            }
            
            const embed = new EmbedBuilder()
                .setColor('#ffa500')
                .setTitle(`Warnings for ${target.user.tag}`)
                .setDescription(`Total warnings: ${userWarnings.length}`);
            
            userWarnings.forEach((warning, index) => {
                embed.addFields({
                    name: `Warning ${index + 1}`,
                    value: `**Reason:** ${warning.reason}\n**Time:** <t:${Math.floor(warning.timestamp / 1000)}:R>`,
                    inline: false
                });
            });
            
            message.reply({ embeds: [embed] });
        }
        
        // !unwarn command - Remove a warning from a user
        else if (command === 'unwarn' || command === 'removewarn') {
            if (!hasPermission(message.member, 'moderation')) {
                return message.reply('❌ You don\'t have permission to use this command!');
            }
            
            // Get target by mention or ID
            let target = message.mentions.members.first();
            const userId = args[0];
            
            if (!target && userId) {
                try {
                    target = await message.guild.members.fetch(userId);
                } catch (error) {
                    return message.reply('❌ User not found in server! Please mention a user or provide a valid user ID.');
                }
            }
            
            if (!target) return message.reply('❌ Please mention a user or provide a user ID to unwarn!');
            
            // Get warning index (optional - if not provided, remove last warning)
            const warningIndex = args[1] ? parseInt(args[1]) - 1 : -1; // Convert to 0-based index
            
            try {
                const userWarnings = warnedUsers.get(target.id) || [];
                
                if (userWarnings.length === 0) {
                    return message.reply(`❌ ${target.user.tag} has no warnings to remove!`);
                }
                
                let removedWarning;
                
                if (warningIndex === -1) {
                    // Remove last warning if no index specified
                    removedWarning = userWarnings.pop();
                } else if (warningIndex >= 0 && warningIndex < userWarnings.length) {
                    // Remove specific warning by index
                    removedWarning = userWarnings.splice(warningIndex, 1)[0];
                } else {
                    return message.reply(`❌ Invalid warning number! ${target.user.tag} has ${userWarnings.length} warning(s). Use \`!unwarn @user [1-${userWarnings.length}]\``);
                }
                
                // Update data
                if (userWarnings.length === 0) {
                    // No warnings left, remove completely
                    warnedUsers.delete(target.id);
                    delete persistentData.warnedUsers[target.id];
                    
                    // Remove warn role
                    if (botConfig.warnRoleId && botConfig.warnRoleId !== 'your_warn_role_id_here') {
                        const warnRole = message.guild.roles.cache.get(botConfig.warnRoleId);
                        if (warnRole && target.roles.cache.has(warnRole.id)) {
                            await target.roles.remove(warnRole);
                            console.log(`Removed warn role from ${target.user.tag}`);
                        }
                    }
                } else {
                    // Update remaining warnings
                    warnedUsers.set(target.id, userWarnings);
                    persistentData.warnedUsers[target.id] = userWarnings;
                }
                
                saveData(persistentData);
                
                // Send DM to user
                try {
                    const unwarnEmbed = new EmbedBuilder()
                        .setColor('#2ecc71')
                        .setTitle('✅ Warning Removed')
                        .setDescription(`One of your warnings has been removed in **${message.guild.name}**`)
                        .addFields(
                            { name: '📝 Removed Warning', value: removedWarning.reason, inline: false },
                            { name: '⚠️ Remaining Warnings', value: `${userWarnings.length}/3`, inline: true },
                            { name: '⏰ Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                            { name: '🏠 Server', value: message.guild.name, inline: true }
                        )
                        .setThumbnail(message.guild.iconURL())
                        .setFooter({ text: userWarnings.length === 0 ? 'You have a clean record now!' : 'Keep following the rules!' })
                        .setTimestamp();
                    
                    await target.send({ embeds: [unwarnEmbed] });
                } catch (dmError) {
                    console.log('Could not send DM to user:', dmError.message);
                }
                
                // Log the unwarn action
                await logAction(message.guild, 'UNWARN', message.member, target, `Removed warning: ${removedWarning.reason}`);
                
                const successEmbed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('✅ Warning Removed')
                    .setDescription(`Successfully removed warning from ${target.user.tag}`)
                    .addFields(
                        { name: '👤 User', value: `${target.user.tag}\n<@${target.id}>`, inline: true },
                        { name: '⚠️ Remaining Warnings', value: `${userWarnings.length}/3`, inline: true },
                        { name: '📝 Removed Warning', value: removedWarning.reason, inline: false },
                        { name: '👮 Moderator', value: message.member.user.tag, inline: true },
                        { name: '⏰ Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                    )
                    .setThumbnail(target.user.displayAvatarURL())
                    .setFooter({ text: userWarnings.length === 0 ? 'User now has a clean record' : 'User has been notified via DM' })
                    .setTimestamp();
                
                message.reply({ embeds: [successEmbed] });
                
            } catch (error) {
                console.error('Unwarn error:', error);
                message.reply(`❌ Failed to remove warning: ${error.message}`);
            }
        }
        
        else if (command === 'clear' || command === 'purge') {
            if (!hasPermission(message.member, 'moderation')) {
                return message.reply('❌ You don\'t have permission to use this command!');
            }
            
            const amount = parseInt(args[0]);
            if (!amount || amount < 1 || amount > 1000) {
                return message.reply('❌ Please specify a number between 1 and 1000!');
            }
            
            try {
                let totalDeleted = 0;
                let remainingToDelete = amount;
                
                // Delete the command message first
                try {
                    await message.delete();
                } catch (delError) {
                    // Ignore if can't delete
                }
                
                // Discord's bulkDelete can only delete 100 messages at a time and messages older than 14 days
                while (remainingToDelete > 0) {
                    const fetchLimit = Math.min(remainingToDelete, 100);
                    const messages = await message.channel.messages.fetch({ limit: fetchLimit });
                    
                    if (messages.size === 0) break;
                    
                    // Filter out pinned messages and messages older than 14 days
                    const filtered = messages.filter(msg => {
                        const isOldEnough = (Date.now() - msg.createdTimestamp) < 1209600000; // 14 days in ms
                        return !msg.pinned && isOldEnough;
                    });
                    
                    if (filtered.size === 0) break;
                    
                    try {
                        await message.channel.bulkDelete(filtered, true);
                        totalDeleted += filtered.size;
                        remainingToDelete -= filtered.size;
                        
                        // If we got less than requested, we've cleared everything available
                        if (filtered.size < fetchLimit) break;
                    } catch (bulkDeleteError) {
                        console.error('Bulk delete error:', bulkDeleteError);
                        break;
                    }
                    
                    // Small delay to avoid rate limits
                    if (remainingToDelete > 0) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
                
                // Send simple result message
                const resultMsg = await message.channel.send(`**🗑️ Cleared ${totalDeleted} message(s).**`);
                
                // Delete result message after 3 seconds
                    setTimeout(() => {
                    resultMsg.delete().catch(() => {});
                    }, 3000);
                
            } catch (error) {
                console.error('Clear error:', error);
                try {
                    await message.channel.send(`❌ Failed to clear messages: ${error.message}\n\n**Bot needs these permissions:**\n- Manage Messages\n- Read Message History`);
                } catch (replyError) {
                    // If we can't reply, just log the error
                    console.error('Could not send error message:', replyError);
                }
            }
        }
        
        // Snipe Command
        else if (command === 'snipe') {
            const snipeData = deletedMessages.get(message.channel.id);
            if (!snipeData) {
                return message.reply('❌ No deleted message found in this channel!');
            }
            
            const embed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('💬 Sniped Message')
                .setDescription(snipeData.content || '*No text content*')
                .addFields(
                    { name: '👤 Author', value: `${snipeData.author.tag}`, inline: true },
                    { name: '⏰ Deleted', value: `<t:${Math.floor(snipeData.timestamp / 1000)}:R>`, inline: true }
                )
                .setTimestamp();
            
            if (snipeData.attachments.length > 0) {
                embed.addFields({
                    name: '📎 Attachments',
                    value: snipeData.attachments.map(att => `[${att.name}](${att.url})`).join('\n'),
                    inline: false
                });
            }
            
            message.reply({ embeds: [embed] });
        }
        
        // Mute Command - Mutes user in both text and voice with time limit
        else if (command === 'mute') {
            if (!hasPermission(message.member, 'voice')) {
                return message.reply('❌ You don\'t have permission to use this command!');
            }
            
            // Get target by mention or ID
            let target = message.mentions.members.first();
            const userId = args[0];
            
            if (!target && userId) {
                try {
                    target = await message.guild.members.fetch(userId);
                } catch (error) {
                    return message.reply('❌ User not found in server! Please mention a user or provide a valid user ID.');
                }
            }
            
            if (!target) return message.reply('❌ Please mention a user or provide a user ID to mute!');
            
            // Get mute duration (default 10 minutes, min 1, max 30)
            const muteTime = args[1] ? parseInt(args[1]) : 10;
            if (isNaN(muteTime) || muteTime < 1 || muteTime > 30) {
                return message.reply('❌ Mute time must be between 1 and 30 minutes! Usage: `!mute @user [1-30]`');
            }
            
            try {
                // Give muted role if configured (this will restrict text chat based on role permissions)
                if (botConfig.mutedRoleId && botConfig.mutedRoleId !== 'your_muted_role_id_here') {
                    const mutedRole = message.guild.roles.cache.get(botConfig.mutedRoleId);
                    if (mutedRole) {
                        await target.roles.add(mutedRole);
                    } else {
                        return message.reply('❌ Muted role not found! Please check your MUTED_ROLE_ID in config.js');
                    }
                } else {
                    return message.reply('❌ Muted role is not configured! Please set MUTED_ROLE_ID in config.js');
                }
                
                // Voice mute if in voice channel (allows them to connect but not speak)
                if (target.voice.channel) {
                    await target.voice.setMute(true);
                }
                
                // Try to send DM to user
                try {
                    const muteEmbed = new EmbedBuilder()
                        .setColor('#ff6b6b')
                        .setTitle('🔇 You Have Been Muted')
                        .setDescription(`You have been muted in **${message.guild.name}**`)
                        .addFields(
                            { name: '📝 Restrictions', value: 'You cannot send messages in text channels or speak in voice chat', inline: false },
                            { name: '⏱️ Duration', value: `${muteTime} minute(s)`, inline: true },
                            { name: '⏰ Muted At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                            { name: '🔓 Unmute Time', value: `<t:${Math.floor((Date.now() + (muteTime * 60 * 1000)) / 1000)}:R>`, inline: true },
                            { name: '🏠 Server', value: message.guild.name, inline: true }
                        )
                        .setThumbnail(message.guild.iconURL())
                        .setFooter({ text: 'You can still join voice channels and listen' })
                        .setTimestamp();
                    
                    await target.send({ embeds: [muteEmbed] });
                } catch (dmError) {
                    console.log('Could not send DM to user:', dmError.message);
                }
                
                await logAction(message.guild, 'MUTE', message.member, target, `Muted for ${muteTime} minute(s)`);
                
                const successEmbed = new EmbedBuilder()
                    .setColor('#7f8c8d')
                    .setTitle('🔇 User Muted')
                    .setDescription(`Successfully muted ${target.user.tag}`)
                    .addFields(
                        { name: '👤 User', value: `${target.user.tag}\n<@${target.id}>`, inline: true },
                        { name: '⏱️ Duration', value: `${muteTime} minute(s)`, inline: true },
                        { name: '👮 Moderator', value: message.member.user.tag, inline: true },
                        { name: '🔓 Auto-Unmute', value: `<t:${Math.floor((Date.now() + (muteTime * 60 * 1000)) / 1000)}:R>`, inline: true },
                        { name: '📝 Status', value: '• Voice muted (can connect, can\'t speak)\n• Text muted via @Muted role\n• Can still read messages & listen', inline: false }
                    )
                    .setThumbnail(target.user.displayAvatarURL())
                    .setTimestamp();
                
                message.reply({ embeds: [successEmbed] });
                
                // Auto-unmute after specified time
                setTimeout(async () => {
                    try {
                        const member = await message.guild.members.fetch(target.id).catch(() => null);
                        if (!member) return;
                        
                        // Remove muted role
                        const mutedRole = message.guild.roles.cache.get(botConfig.mutedRoleId);
                        if (mutedRole && member.roles.cache.has(mutedRole.id)) {
                            await member.roles.remove(mutedRole);
                            console.log(`Auto-removed muted role from ${member.user.tag}`);
                        }
                        
                        // Voice unmute if in voice channel
                        if (member.voice.channel) {
                            await member.voice.setMute(false);
                        }
                        
                        // Send DM about unmute
                        try {
                            const unmuteEmbed = new EmbedBuilder()
                                .setColor('#2ecc71')
                                .setTitle('🔊 You Have Been Automatically Unmuted')
                                .setDescription(`Your mute has expired in **${message.guild.name}**`)
                                .addFields(
                                    { name: '⏰ Unmuted At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                                    { name: '🏠 Server', value: message.guild.name, inline: true }
                                )
                                .setThumbnail(message.guild.iconURL())
                                .setFooter({ text: 'You can now speak and type again' })
                                .setTimestamp();
                            
                            await member.send({ embeds: [unmuteEmbed] });
                        } catch (dmError) {
                            console.log('Could not send DM to user:', dmError.message);
                        }
                        
                        await logAction(message.guild, 'UNMUTE', { user: { tag: 'System (Auto)' } }, member, `Mute expired after ${muteTime} minute(s)`);
                    } catch (error) {
                        console.error('Auto-unmute error:', error);
                    }
                }, muteTime * 60 * 1000);
            } catch (error) {
                console.error('Mute error:', error);
                if (error.code === 50013) {
                    message.reply('❌ I don\'t have permission to mute users! Please give me the **Moderate Members** and **Manage Roles** permissions.');
                } else {
                    message.reply(`❌ Failed to mute user: ${error.message}`);
                }
            }
        }
        
        // Unmute Command - Unmutes user from both text and voice
        else if (command === 'unmute') {
            if (!hasPermission(message.member, 'voice')) {
                return message.reply('❌ You don\'t have permission to use this command!');
            }
            
            // Get target by mention or ID
            let target = message.mentions.members.first();
            const userId = args[0];
            
            if (!target && userId) {
                try {
                    target = await message.guild.members.fetch(userId);
                } catch (error) {
                    return message.reply('❌ User not found in server! Please mention a user or provide a valid user ID.');
                }
            }
            
            if (!target) return message.reply('❌ Please mention a user or provide a user ID to unmute!');
            
            try {
                // Remove muted role if configured
                if (botConfig.mutedRoleId && botConfig.mutedRoleId !== 'your_muted_role_id_here') {
                    const mutedRole = message.guild.roles.cache.get(botConfig.mutedRoleId);
                    if (mutedRole && target.roles.cache.has(mutedRole.id)) {
                        await target.roles.remove(mutedRole);
                    }
                }
                
                // Voice unmute if in voice channel
                if (target.voice.channel) {
                    await target.voice.setMute(false);
                }
                
                await logAction(message.guild, 'UNMUTE', message.member, target, 'Unmuted (voice and text)');
                
                const successEmbed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('🔊 User Unmuted')
                    .setDescription(`Successfully unmuted ${target.user.tag}`)
                    .addFields(
                        { name: '👤 User', value: `${target.user.tag}\n<@${target.id}>`, inline: true },
                        { name: '✅ Status', value: 'Fully unmuted', inline: true },
                        { name: '👮 Moderator', value: message.member.user.tag, inline: true },
                        { name: '⏰ Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                        { name: '📝 Removed', value: '• Voice mute\n• @Muted role', inline: false }
                    )
                    .setThumbnail(target.user.displayAvatarURL())
                    .setTimestamp();
                
                message.reply({ embeds: [successEmbed] });
            } catch (error) {
                console.error('Unmute error:', error);
                message.reply('❌ Failed to unmute user. Check my permissions!');
            }
        }
        
        else if (command === 'forcemuteall' || command === 'fmall') {
            if (!hasPermission(message.member, 'voice')) {
                return message.reply('❌ You don\'t have permission to use this command!');
            }
            
            const channel = message.member.voice.channel;
            if (!channel) {
                return message.reply('❌ You must be in a voice channel to use this command!');
            }
            
            try {
                const members = channel.members.filter(member => member.id !== message.member.id);
                let mutedCount = 0;
                
                for (const member of members.values()) {
                    try {
                        await member.voice.setMute(true);
                        mutedCount++;
                    } catch (error) {
                        console.error(`Failed to mute ${member.user.tag}:`, error);
                    }
                }
                
                await logAction(message.guild, 'FORCE_MUTE', message.member, { user: { tag: `${mutedCount} members` }, id: 'multiple' }, `Force muted ${mutedCount} members in ${channel.name}`);
                message.reply(`🔇 Force muted ${mutedCount} members in your voice channel!`);
            } catch (error) {
                message.reply('❌ Failed to force mute members. Check my permissions!');
            }
        }
        
        else if (command === 'forceunmuteall' || command === 'fumall') {
            if (!hasPermission(message.member, 'voice')) {
                return message.reply('❌ You don\'t have permission to use this command!');
            }
            
            const channel = message.member.voice.channel;
            if (!channel) {
                return message.reply('❌ You must be in a voice channel to use this command!');
            }
            
            try {
                const members = channel.members.filter(member => member.id !== message.member.id);
                let unmutedCount = 0;
                
                for (const member of members.values()) {
                    try {
                        await member.voice.setMute(false);
                        unmutedCount++;
                    } catch (error) {
                        console.error(`Failed to unmute ${member.user.tag}:`, error);
                    }
                }
                
                await logAction(message.guild, 'FORCE_UNMUTE', message.member, { user: { tag: `${unmutedCount} members` }, id: 'multiple' }, `Force unmuted ${unmutedCount} members in ${channel.name}`);
                message.reply(`🔊 Force unmuted ${unmutedCount} members in your voice channel!`);
            } catch (error) {
                message.reply('❌ Failed to force unmute members. Check my permissions!');
            }
        }
        
        else if (command === 'move') {
            if (!hasPermission(message.member, 'voice')) {
                return message.reply('❌ You don\'t have permission to use this command!');
            }
            
            const target = message.mentions.members.first();
            if (!target) return message.reply('❌ Please mention a user to move!');
            
            const channelId = args[1];
            if (!channelId) return message.reply('❌ Please provide a channel ID!');
            
            const targetChannel = message.guild.channels.cache.get(channelId);
            if (!targetChannel || targetChannel.type !== 2) { // Voice channel type
                return message.reply('❌ Invalid voice channel ID!');
            }
            
            try {
                await target.voice.setChannel(targetChannel);
                message.reply(`✅ Successfully moved <@${target.id}> to <#${targetChannel.id}>!`);
            } catch (error) {
                message.reply('❌ Failed to move user. Check my permissions!');
            }
        }
        
        // !sb command - Enable/Disable soundboard for entire voice channel (ADMIN ONLY)
        else if (command === 'sb' || command === 'soundboard') {
            if (!hasPermission(message.member, 'admin')) {
                return message.reply('❌ You don\'t have permission to use this command! Only admins can control soundboard.');
            }
            
            const action = args[0]?.toLowerCase();
            if (!action || (action !== 'enable' && action !== 'disable')) {
                return message.reply('❌ Please specify `enable` or `disable`!\nUsage: `!sb enable [channel_id]` or `!sb disable [channel_id]`');
            }
            
            // Get channel - either provided ID or user's current channel
            let channel;
            const channelId = args[1];
            
            if (channelId) {
                channel = message.guild.channels.cache.get(channelId);
                if (!channel || channel.type !== 2) {
                    return message.reply('❌ Invalid voice channel ID!');
                }
            } else {
                channel = message.member.voice.channel;
                if (!channel) {
                    return message.reply('❌ You must be in a voice channel or provide a channel ID!\nUsage: `!sb enable [channel_id]`');
                }
            }
            
            try {
                const shouldEnable = action === 'enable';
                
                // Update channel permissions to allow/deny soundboard
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                    UseSoundboard: shouldEnable
                });
                
                const statusText = shouldEnable ? 'enabled' : 'disabled';
                message.reply(`🔊 Successfully ${statusText} soundboard in <#${channel.id}>!`);
            } catch (error) {
                console.error('Soundboard toggle error:', error);
                if (error.code === 50013) {
                    message.reply('❌ I don\'t have permission to manage channel permissions! Please give me the **Manage Channels** permission.');
                } else {
                    message.reply(`❌ Failed to toggle soundboard: ${error.message}`);
                }
            }
        }
        
        // !cam command - Enable/Disable camera/stream for entire voice channel (ADMIN ONLY)
        else if (command === 'cam' || command === 'camera') {
            if (!hasPermission(message.member, 'admin')) {
                return message.reply('❌ You don\'t have permission to use this command! Only admins can control camera/streaming.');
            }
            
            const action = args[0]?.toLowerCase();
            if (!action || (action !== 'enable' && action !== 'disable')) {
                return message.reply('❌ Please specify `enable` or `disable`!\nUsage: `!cam enable [channel_id]` or `!cam disable [channel_id]`');
            }
            
            // Get channel - either provided ID or user's current channel
            let channel;
            const channelId = args[1];
            
            if (channelId) {
                channel = message.guild.channels.cache.get(channelId);
                if (!channel || channel.type !== 2) {
                    return message.reply('❌ Invalid voice channel ID!');
                }
            } else {
                channel = message.member.voice.channel;
                if (!channel) {
                    return message.reply('❌ You must be in a voice channel or provide a channel ID!\nUsage: `!cam enable [channel_id]`');
                }
            }
            
            try {
                const shouldEnable = action === 'enable';
                
                // Update channel permissions to allow/deny camera and streaming
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                    Stream: shouldEnable,
                    SendVoiceMessages: shouldEnable
                });
                
                const statusText = shouldEnable ? 'enabled' : 'disabled';
                message.reply(`📹 Successfully ${statusText} camera and streaming in <#${channel.id}>!`);
            } catch (error) {
                console.error('Camera toggle error:', error);
                if (error.code === 50013) {
                    message.reply('❌ I don\'t have permission to manage channel permissions! Please give me the **Manage Channels** permission.');
                } else {
                    message.reply(`❌ Failed to toggle camera: ${error.message}`);
                }
            }
        }
        
        // ===== RANK SYSTEM COMMANDS =====
        
        // !rank command - View rank and progress (ADMIN ONLY - can view others)
        else if (command === 'rank') {
            // Check if user is rank admin
            if (!hasRankAdminRole(message.member)) {
                return message.reply('❌ You don\'t have permission to use this command! Only rank admins can view ranks.\n**Tip:** Use `!points` to view your own rank and points.');
            }
            
                // Get target by mention or ID
            let target = message.mentions.members.first();
            const userId = args[0];
                
                if (!target && userId) {
                const cleanId = userId.replace(/[<@!>]/g, '');
                    try {
                    target = await message.guild.members.fetch(cleanId);
                    } catch (error) {
                    return message.reply('❌ User not found in server! Please mention a user or provide a valid user ID.');
                }
            }
            
            if (!target) {
                return message.reply('❌ Please mention a user or provide a user ID!\nUsage: `!rank @user` or `!rank <user_id>`');
            }
            
            // Check if target is a staff member
            if (!isStaffMember(target, botConfig)) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Not a Staff Member')
                    .setDescription(`**${target.user.tag}** is not part of the staff team!`)
                    .addFields({
                        name: '📋 Note',
                        value: 'The rank system is only available for staff members. You need at least one staff rank role to be part of the system.',
                        inline: false
                    })
                    .setThumbnail(target.user.displayAvatarURL())
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
            
            try {
                const userData = rankSystem.getUserData(target.id);
                const rankEmbed = rankSystem.createRankEmbed(target, userData.points);
                message.reply({ embeds: [rankEmbed] });
            } catch (error) {
                console.error('Rank command error:', error);
                message.reply('❌ Failed to fetch rank information!');
            }
        }
        
        // !points command - View own points (SELF ONLY)
        else if (command === 'points') {
            // Only show own rank - no arguments allowed
            const target = message.member;
            
            // Check if user is a staff member
            if (!isStaffMember(target, botConfig)) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Not a Staff Member')
                    .setDescription(`**${target.user.tag}** is not part of the staff team!`)
                    .addFields({
                        name: '📋 Note',
                        value: 'The rank system is only available for staff members. You need at least one staff rank role to be part of the system.',
                        inline: false
                    })
                    .setThumbnail(target.user.displayAvatarURL())
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
            
            try {
                const userData = rankSystem.getUserData(target.id);
                const currentRank = rankSystem.getRankFromPoints(userData.points);
                const nextRank = rankSystem.getNextRank(currentRank.points);
                
                const embed = new EmbedBuilder()
                    .setColor(currentRank.color)
                    .setTitle(`${currentRank.emoji} Points Overview`)
                    .setDescription(`**${target.user.tag}**`)
                    .addFields(
                        { name: '💰 Total Points', value: `${userData.points}`, inline: true },
                        { name: '🎯 Current Rank', value: `${currentRank.emoji} ${currentRank.name}`, inline: true }
                    )
                    .setThumbnail(target.user.displayAvatarURL())
                    .setTimestamp();
                
                if (nextRank) {
                    const pointsNeeded = nextRank.points - userData.points;
                    embed.addFields({ 
                        name: '⏭️ Next Rank', 
                        value: `${nextRank.emoji} **${nextRank.name}** (${pointsNeeded} points needed)`,
                        inline: false
                    });
                }
                
                message.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Points command error:', error);
                message.reply('❌ Failed to fetch points information!');
            }
        }
        
        // !points_add command - Add points (RANK ADMIN ONLY)
        else if (command === 'points_add' || command === 'addpoints' || command === 'point_add') {
            if (!hasRankAdminRole(message.member)) {
                return message.reply('❌ You don\'t have permission to use this command! Only rank admins can add points.');
            }
            
            // Get target by mention or ID
            let target = message.mentions.members.first();
            const userId = args[0];
            
            if (!target && userId) {
                const cleanId = userId.replace(/[<@!>]/g, '');
                try {
                    target = await message.guild.members.fetch(cleanId);
                } catch (error) {
                    return message.reply('❌ User not found in server! Please mention a user or provide a valid user ID.');
                }
            }
            
            if (!target) {
                return message.reply('❌ Please mention a user or provide a user ID!\nUsage: `!points_add @user [points] [reason]`');
            }
            
            // Check if target is a staff member
            if (!isStaffMember(target, botConfig)) {
                return message.reply(`❌ **${target.user.tag}** is not a staff member! Points can only be given to staff members with at least one staff rank role.`);
            }
            
            const amount = parseInt(args[1]);
            if (isNaN(amount) || amount <= 0) {
                return message.reply('❌ Please provide a valid positive number of points!\nUsage: `!points_add @user [points] [reason]`');
            }
            
            const reason = args.slice(2).join(' ') || 'No reason provided';
            
            try {
                const result = await rankSystem.addPoints(
                    message.guild,
                    target.id,
                    amount,
                    reason,
                    message.member,
                    botConfig
                );
                
                // Send modern embed confirmation
                const pointsEmbed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('✅ Points Added Successfully')
                    .addFields(
                        { name: '👤 User', value: `<@${target.id}>`, inline: true },
                        { name: '💰 Amount', value: `+${amount} points`, inline: true },
                        { name: '🆕 New Total', value: `${result.newPoints} points`, inline: true },
                        { name: '📝 Reason', value: reason, inline: false }
                    )
                    .setTimestamp();
                
                if (result.rankChanged) {
                    pointsEmbed.addFields({
                        name: '🎉 Rank Changed',
                        value: `${result.oldRank.emoji} **${result.oldRank.name}** → ${result.newRank.emoji} **${result.newRank.name}**`,
                        inline: false
                    });
                    
                    // Update role and send rank change DM
                    await rankSystem.updateUserRole(message.guild, target, result.newRank, botConfig);
                    await rankSystem.sendRankChangeDM(target, result.oldRank, result.newRank, result.newPoints);
                }
                
                await message.reply({ embeds: [pointsEmbed] });
                
                // Send DM to user about points change
                await rankSystem.sendPointsChangeDM(target, amount, reason, result.oldPoints, result.newPoints);
            } catch (error) {
                console.error('Add points error:', error);
                message.reply('❌ Failed to add points!');
            }
        }
        
        // !points_minus command - Remove points (RANK ADMIN ONLY)
        else if (command === 'points_minus' || command === 'removepoints' || command === 'minuspoints' || command === 'point_minus') {
            if (!hasRankAdminRole(message.member)) {
                return message.reply('❌ You don\'t have permission to use this command! Only rank admins can remove points.');
            }
            
            // Get target by mention or ID
            let target = message.mentions.members.first();
            const userId = args[0];
            
            if (!target && userId) {
                const cleanId = userId.replace(/[<@!>]/g, '');
                try {
                    target = await message.guild.members.fetch(cleanId);
                } catch (error) {
                    return message.reply('❌ User not found in server! Please mention a user or provide a valid user ID.');
                }
            }
            
            if (!target) {
                return message.reply('❌ Please mention a user or provide a user ID!\nUsage: `!points_minus @user [points] [reason]`');
            }
            
            // Check if target is a staff member
            if (!isStaffMember(target, botConfig)) {
                return message.reply(`❌ **${target.user.tag}** is not a staff member! Points can only be managed for staff members with at least one staff rank role.`);
            }
            
            const amount = parseInt(args[1]);
            if (isNaN(amount) || amount <= 0) {
                return message.reply('❌ Please provide a valid positive number of points!\nUsage: `!points_minus @user [points] [reason]`');
            }
            
            const reason = args.slice(2).join(' ') || 'No reason provided';
            
            try {
                const result = await rankSystem.removePoints(
                    message.guild,
                    target.id,
                    amount,
                    reason,
                    message.member,
                    botConfig
                );
                
                // Send DM to user about points change
                await rankSystem.sendPointsChangeDM(target, -amount, reason, result.oldPoints, result.newPoints);
                
                // Log points change
                await rankSystem.logPointsChange(
                    message.guild,
                    target,
                    -amount,
                    reason,
                    message.member,
                    result.oldPoints,
                    result.newPoints,
                    botConfig.rankLogChannelId
                );
                
                // If rank changed, update role and send notification
                if (result.rankChanged) {
                    await rankSystem.updateUserRole(message.guild, target, result.newRank, botConfig);
                    await rankSystem.sendRankChangeDM(target, result.oldRank, result.newRank, result.newPoints);
                    await rankSystem.logRankChange(
                        message.guild,
                        target,
                        result.oldRank,
                        result.newRank,
                        result.newPoints,
                        botConfig.rankLogChannelId
                    );
                    
                    // Send confirmation to admin via DM only
                    try {
                        await message.member.send(`✅ Removed ${amount} points from ${target.user.tag}!\n⚠️ **Rank changed:** ${result.oldRank.emoji} ${result.oldRank.name} → ${result.newRank.emoji} ${result.newRank.name}\n💰 New total: ${result.newPoints} points`);
                    } catch (error) {
                        console.log('Could not send DM to admin');
                    }
                } else {
                    // Send confirmation to admin via DM only
                    try {
                        await message.member.send(`✅ Removed ${amount} points from ${target.user.tag}!\n💰 New total: ${result.newPoints} points (${result.newRank.emoji} ${result.newRank.name})`);
                    } catch (error) {
                        console.log('Could not send DM to admin');
                    }
                }
                
                // Delete the command message
                try {
                    await message.delete();
                } catch (error) {
                    console.log('Could not delete command message');
                }
            } catch (error) {
                console.error('Remove points error:', error);
                message.reply('❌ Failed to remove points!');
            }
        }
        
        // !rank_help command - Show rank system information with pagination
        else if (command === 'rank_help' || command === 'rankhelp') {
            // Define pages
            const pages = [
                // Page 1: Rank Tiers (Starter Ranks)
                new EmbedBuilder()
                    .setColor('#ffd700')
                    .setTitle('⭐ Rank System Guide - Page 1/3')
                    .setDescription('**Complete guide to the staff rank progression system**')
                    .addFields(
                        {
                            name: '📊 Rank Tiers & Requirements (Part 1)',
                            value: 
                                '🔰 **Trial Staff** - 0 points\n' +
                                '└ Starting rank for new staff members\n' +
                                '└ Basic mute power\n' +
                                '└ Learn the basics of moderation\n\n' +
                                '👮 **Staff** - 5 points\n' +
                                '└ Mute, Deafen, Move members\n' +
                                '└ Change nicknames\n' +
                                '└ Basic moderation tools\n\n' +
                                '🛡️ **Moderator** - 150 points\n' +
                                '└ All Staff permissions +\n' +
                                '└ Delete messages\n' +
                                '└ View server logs\n' +
                                '└ Access audit logs\n\n' +
                                '⚔️ **Head Moderator** - 250 points\n' +
                                '└ All Moderator permissions +\n' +
                                '└ View all channels\n' +
                                '└ Server insights access\n' +
                                '└ Manage server expressions',
                            inline: false
                        }
                    )
                    .setFooter({ text: 'Use the buttons below to navigate • Page 1/3' })
                    .setTimestamp(),
                
                // Page 2: Advanced Ranks & Commands
                new EmbedBuilder()
                    .setColor('#ffd700')
                    .setTitle('⭐ Rank System Guide - Page 2/3')
                    .setDescription('**Complete guide to the staff rank progression system**')
                    .addFields(
                        {
                            name: '📊 Rank Tiers & Requirements (Part 2)',
                            value: 
                                '👑 **Manager** - 350 points\n' +
                                '└ All Head Moderator permissions +\n' +
                                '└ Jail members\n' +
                                '└ Kick members from server\n' +
                                '└ Mention @everyone and @here\n\n' +
                                '💎 **Head Manager** - 650 points\n' +
                                '└ All Manager permissions +\n' +
                                '└ Unjail members\n' +
                                '└ Ban members from server\n' +
                                '└ Manage roles & channels\n\n' +
                                '⚡ **Administrator** - 2000 points\n' +
                                '└ Full administrator privileges\n' +
                                '└ Complete server control\n' +
                                '└ Highest staff rank',
                            inline: false
                        },
                        {
                            name: '📝 Available Commands',
                            value:
                                '**For Everyone:**\n' +
                                '`!points` - View your own rank and points\n' +
                                '`!rank_help` - Show this help message\n\n' +
                                '**For Rank Admins:**\n' +
                                '`!rank @user/id` - View any user\'s rank\n' +
                                '`!points_add @user [points] [reason]` - Add points\n' +
                                '`!points_minus @user [points] [reason]` - Remove points',
                            inline: false
                        }
                    )
                    .setFooter({ text: 'Use the buttons below to navigate • Page 2/3' })
                    .setTimestamp(),
                
                // Page 3: How It Works & Tips
                new EmbedBuilder()
                    .setColor('#ffd700')
                    .setTitle('⭐ Rank System Guide - Page 3/3')
                    .setDescription('**Complete guide to the staff rank progression system**')
                    .addFields(
                        {
                            name: '🎯 How It Works',
                            value:
                                '• Points are managed by rank admins\n' +
                                '• Earn points for good performance, activity, and contributions\n' +
                                '• Roles automatically update when you reach point thresholds\n' +
                                '• You receive DM notifications for point changes and promotions\n' +
                                '• All changes are logged in the rank log channel for transparency',
                            inline: false
                        },
                        {
                            name: '📈 Tracking Your Progress',
                            value:
                                'Use `!points` to view:\n' +
                                '• Your current total points\n' +
                                '• Your current rank with emoji\n' +
                                '• Visual progress bar to next rank\n' +
                                '• Exact points needed for next promotion\n' +
                                '• Next rank preview',
                            inline: false
                        },
                        {
                            name: '💡 Tips for Advancement',
                            value:
                                '✨ **Be Active** - Regular presence matters\n' +
                                '✨ **Help Others** - Assist members and staff\n' +
                                '✨ **Stay Professional** - Maintain high standards\n' +
                                '✨ **Take Initiative** - Go above and beyond\n' +
                                '✨ **Learn & Grow** - Improve your skills constantly',
                            inline: false
                        }
                    )
                    .setFooter({ text: 'Work hard, earn points, climb the ranks! 🚀 • Page 3/3' })
                    .setTimestamp()
            ];
            
            let currentPage = 0;
            
            // Create buttons
            const getButtons = (page) => {
                return new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('rank_help_prev')
                            .setLabel('◀ Previous')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId('rank_help_next')
                            .setLabel('Next ▶')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === pages.length - 1)
                    );
            };
            
            // Send initial message
            const reply = await message.reply({
                embeds: [pages[currentPage]],
                components: [getButtons(currentPage)]
            });
            
            // Create collector for button interactions
            const collector = reply.createMessageComponentCollector({
                time: 300000 // 5 minutes
            });
            
            collector.on('collect', async (interaction) => {
                // Only allow the command user to use buttons
                if (interaction.user.id !== message.author.id) {
                    return interaction.reply({
                        content: '❌ These buttons are not for you! Use `!rank_help` to get your own.',
                        ephemeral: true
                    });
                }
                
                // Update page based on button
                if (interaction.customId === 'rank_help_next') {
                    currentPage = Math.min(currentPage + 1, pages.length - 1);
                } else if (interaction.customId === 'rank_help_prev') {
                    currentPage = Math.max(currentPage - 1, 0);
                }
                
                // Update message
                await interaction.update({
                    embeds: [pages[currentPage]],
                    components: [getButtons(currentPage)]
                });
            });
            
            collector.on('end', () => {
                // Disable buttons when collector expires
                reply.edit({
                    embeds: [pages[currentPage]],
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('rank_help_prev')
                                    .setLabel('◀ Previous')
                                    .setStyle(ButtonStyle.Primary)
                                    .setDisabled(true),
                                new ButtonBuilder()
                                    .setCustomId('rank_help_next')
                                    .setLabel('Next ▶')
                                    .setStyle(ButtonStyle.Primary)
                                    .setDisabled(true)
                            )
                    ]
                }).catch(() => {});
            });
        }
        
        // Help Command - Paginated
        else if (command === 'help') {
            // Define pages
            const pages = [
                // Page 1: Moderation & Voice Commands
                new EmbedBuilder()
                .setColor('#0099ff')
                    .setTitle('🤖 Moderation Bot Commands - Page 1/3')
                    .setDescription('**Here are all available commands**')
                .addFields(
                    {
                        name: '🔨 Moderation Commands',
                            value: 
                                '`!ban @user [reason]` - Ban a user (reason required)\n' +
                                '`!kick @user [reason]` - Kick a user (reason required)\n' +
                                '`!jail @user [time] [reason]` - Jail a user (reason required)\n' +
                                '`!unjail @user` - Manually release from jail\n' +
                                '`!disconnect @user` - Disconnect from voice channel\n' +
                                '`!warn @user [reason]` - Warn a user (3 warnings = 24h jail)\n' +
                                '`!unwarn @user [#]` - Remove warning (last or specific)\n' +
                                '`!warnings @user` - Check user warnings\n' +
                                '`!clear [1-1000]` - Clear up to 1000 messages',
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
                
                // Page 2: Voice Control & Chat Lock Commands
                new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('🤖 Moderation Bot Commands - Page 2/3')
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
                    }
                )
                    .setFooter({ text: 'Page 2/3 • Use buttons below to navigate' }),
                
                // Page 3: Rank System Commands
                new EmbedBuilder()
                    .setColor('#ffd700')
                    .setTitle('🤖 Moderation Bot Commands - Page 3/3')
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
                                '`!points_add @user [points] [reason]` - Add points to staff\n' +
                                '`!point_add @user [points] [reason]` - Alias for points_add\n' +
                                '`!points_minus @user [points] [reason]` - Remove points from staff\n' +
                                '`!point_minus @user [points] [reason]` - Alias for points_minus\n' +
                                '└ Points changes are logged and sent via DM',
                            inline: false
                        },
                        {
                            name: '📊 Rank System Info',
                            value: 
                                '• Points determine your staff rank\n' +
                                '• Higher ranks unlock more permissions\n' +
                                '• Type `!rank_help` for complete details\n' +
                                '• 7 ranks total: Trial Staff → Administrator',
                            inline: false
                        }
                    )
                    .setFooter({ text: 'Page 3/3 • Bot created with ❤️ for server moderation' })
            ];
            
            let currentPage = 0;
            
            // Create buttons
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
            
            const response = await message.reply({
                embeds: [pages[0]],
                components: [row]
            });
            
            // Create collector for button interactions
            const collector = response.createMessageComponentCollector({
                time: 300000 // 5 minutes
            });
            
            collector.on('collect', async interaction => {
                if (interaction.user.id !== message.author.id) {
                    return interaction.reply({ content: '❌ Only the command user can use these buttons!', ephemeral: true });
                }
                
                if (interaction.customId === 'help_prev') {
                    currentPage--;
                } else if (interaction.customId === 'help_next') {
                    currentPage++;
                }
                
                // Update button states
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
        
        // Disconnect from temporary room command
        else if (command === 'disconnect' || command === 'dc') {
            if (!hasPermission(message.member, 'moderation')) {
                return message.reply('❌ You don\'t have permission to use this command!');
            }
            
            const target = message.mentions.members.first();
            if (!target) return message.reply('❌ Please mention a user to disconnect!');
            
            if (!target.voice.channel) {
                return message.reply('❌ User is not in a voice channel!');
            }
            
            try {
                await target.voice.disconnect('Disconnected by moderator');
                message.reply(`🔌 Successfully disconnected <@${target.id}> from voice channel!`);
            } catch (error) {
                console.error('Disconnect error:', error);
                if (error.code === 50013) {
                    message.reply('❌ I don\'t have permission to disconnect users! Please give me the **Move Members** permission.');
                } else {
                    message.reply(`❌ Failed to disconnect user: ${error.message}`);
                }
            }
        }
        
        // Manual Unjail Command
        else if (command === 'unjail') {
            if (!hasPermission(message.member, 'moderation')) {
                return message.reply('❌ You don\'t have permission to use this command!');
            }
            
            // Get target by mention or ID
            let target = message.mentions.members.first();
            const userId = args[0];
            
            if (!target && userId) {
                try {
                    target = await message.guild.members.fetch(userId);
                } catch (error) {
                    return message.reply('❌ User not found in server! Please mention a user or provide a valid user ID.');
                }
            }
            
            if (!target) return message.reply('❌ Please mention a user or provide a user ID to unjail!');
            
            try {
                // Get jail role
                let jailRole;
                if (botConfig.jailRoleId && botConfig.jailRoleId !== 'your_jail_role_id_here') {
                    jailRole = message.guild.roles.cache.get(botConfig.jailRoleId);
                } else {
                    jailRole = message.guild.roles.cache.find(role => role.name === 'Jailed');
                }
                
                if (!jailRole) {
                    return message.reply('❌ No jail role found!');
                }
                
                if (!target.roles.cache.has(jailRole.id)) {
                    return message.reply(`❌ ${target.user.tag} is not currently jailed!`);
                }
                
                // Restore original roles from persistent data
                const storedJailData = persistentData.jailedUsers[target.id];
                if (storedJailData && storedJailData.originalRoles.length > 0) {
                    // Get role objects for original roles
                    const rolesToRestore = storedJailData.originalRoles
                        .map(roleId => message.guild.roles.cache.get(roleId))
                        .filter(role => role !== undefined);
                    
                    // Remove jail role and restore original roles
                    await target.roles.set(rolesToRestore);
                    console.log(`Restored ${rolesToRestore.length} roles to ${target.user.tag}`);
                } else {
                    // Fallback: just remove jail role
                    await target.roles.remove(jailRole);
                    console.log(`No stored roles found for ${target.user.tag}, just removed jail role`);
                }
                
                // Clear warnings when released from jail
                const hadWarnings = warnedUsers.has(target.id);
                const warningCount = hadWarnings ? warnedUsers.get(target.id).length : 0;
                
                warnedUsers.delete(target.id);
                delete persistentData.warnedUsers[target.id];
                
                // Remove warn role if they have it
                if (botConfig.warnRoleId && botConfig.warnRoleId !== 'your_warn_role_id_here') {
                    const warnRole = message.guild.roles.cache.get(botConfig.warnRoleId);
                    if (warnRole && target.roles.cache.has(warnRole.id)) {
                        await target.roles.remove(warnRole);
                        console.log(`Removed warn role from ${target.user.tag}`);
                    }
                }
                
                // Clean up stored data from both memory and persistent storage
                jailedUsers.delete(target.id);
                delete persistentData.jailedUsers[target.id];
                saveData(persistentData);
                
                // Send DM to user about being released
                try {
                    const unjailEmbed = new EmbedBuilder()
                        .setColor('#2ecc71')
                        .setTitle('🔓 You Have Been Released from Jail')
                        .setDescription(`You have been released from jail in **${message.guild.name}**`)
                        .addFields(
                            { name: '✅ Status', value: 'Your roles have been restored and you can now participate normally', inline: false },
                            { name: '⏰ Released At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                            { name: '🏠 Server', value: message.guild.name, inline: true }
                        )
                        .setThumbnail(message.guild.iconURL())
                        .setFooter({ text: 'Welcome back!' })
                        .setTimestamp();
                    
                    await target.send({ embeds: [unjailEmbed] });
                } catch (dmError) {
                    console.log('Could not send DM to user:', dmError.message);
                }
                
                // Log the unjail action
                await logAction(message.guild, 'UNJAIL', message.member, target, 'Released from jail by moderator');
                
                const successEmbed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('🔓 User Released from Jail')
                    .setDescription(`Successfully released ${target.user.tag} from jail`)
                    .addFields(
                        { name: '👤 User', value: `${target.user.tag}\n<@${target.id}>`, inline: true },
                        { name: '✅ Status', value: 'All roles restored', inline: true },
                        { name: '👮 Moderator', value: message.member.user.tag, inline: true },
                        { name: '⏰ Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                        { name: '📝 Additional Actions', value: hadWarnings ? `⚠️ Cleared ${warningCount} warning(s)\n✅ Removed warn role` : '✅ No warnings to clear', inline: false }
                    )
                    .setThumbnail(target.user.displayAvatarURL())
                    .setTimestamp();
                
                message.reply({ embeds: [successEmbed] });
                
            } catch (error) {
                console.error('Unjail error:', error);
                if (error.code === 50013) {
                    message.reply('❌ I don\'t have permission to manage roles! Please give me the **Manage Roles** permission.');
                } else {
                    message.reply(`❌ Failed to unjail user: ${error.message}`);
                }
            }
        }
        
        // Test Command - should work for anyone
        else if (command === 'test' || command === 'ping') {
            message.reply('✅ Bot is working! Commands are being processed.');
        }
        
        // !backup_help command - Show backup system guide
        else if (command === 'backup_help' || command === 'backuphelp') {
            if (!hasPermission(message.member, 'admin')) {
                return; // Silent fail - act as unknown command
            }
            
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('💾 Backup & Restore System Guide')
                .setDescription('**Complete guide to protecting your server**')
                .addFields(
                    {
                        name: '📋 Creating Backups',
                        value: 
                            '**`!backup`** - Creates a complete server backup\n' +
                            '• Saves all channels (categories, text, voice)\n' +
                            '• Saves all roles (permissions, colors, positions)\n' +
                            '• Saves all emojis\n' +
                            '• Saves server settings\n' +
                            '• Stored locally in bot directory',
                        inline: false
                    },
                    {
                        name: '📁 Viewing Backups',
                        value: 
                            '**`!backups`** - Lists all available backups\n' +
                            '• Shows backup number, filename, size, and date\n' +
                            '• Most recent backups shown first\n' +
                            '• Use the number to restore',
                        inline: false
                    },
                    {
                        name: '🔄 Restoring from Backup',
                        value: 
                            '**`!restore [number]`** - Restores server from backup\n' +
                            '• Example: `!restore 1`\n' +
                            '• Requires confirmation (type "confirm")\n' +
                            '• 30-second timeout for safety\n' +
                            '• Only creates missing channels/roles\n' +
                            '• **Does NOT delete** existing items\n' +
                            '• Safe to use anytime',
                        inline: false
                    },
                    {
                        name: '⚠️ When to Use',
                        value: 
                            '**Create backups:**\n' +
                            '• Before giving admin perms to new staff\n' +
                            '• After major server updates\n' +
                            '• Daily/weekly for active servers\n\n' +
                            '**Restore backups when:**\n' +
                            '• Server gets raided (channels/roles deleted)\n' +
                            '• Bot gets kicked and rejoins\n' +
                            '• Need to recover deleted content\n' +
                            '• Accidental mass deletion',
                        inline: false
                    },
                    {
                        name: '🛡️ Anti-Raid Protection',
                        value: 
                            '**`!antiraid`** - View protection status\n' +
                            '• Auto-detects spam (5 msgs in 5s → 1min mute)\n' +
                            '• Auto-jails channel deleters (3 in 30s)\n' +
                            '• Auto-jails role deleters (3 in 30s)\n' +
                            '• Auto-jails ban wavers (5 in 60s)\n' +
                            '• All protection is automatic',
                        inline: false
                    },
                    {
                        name: '💡 Best Practices',
                        value: 
                            '• Create backups regularly\n' +
                            '• Keep multiple backup versions\n' +
                            '• Test restore in a test server first\n' +
                            '• Only give admin role to trusted members\n' +
                            '• Monitor anti-raid logs',
                        inline: false
                    }
                )
                .setFooter({ text: 'These commands are admin-only for security' })
                .setTimestamp();
            
            message.reply({ embeds: [embed] });
        }
        
        // !backup command - Create server backup (ADMIN ONLY)
        else if (command === 'backup') {
            if (!hasPermission(message.member, 'admin')) {
                return; // Silent fail - act as unknown command
            }
            
            const statusMsg = await message.reply('⏳ Creating server backup... This may take a moment.');
            
            try {
                const result = await antiRaid.createServerBackup(message.guild);
                
                if (result.success) {
                    const stats = antiRaid.getBackupStats();
                    
                    const embed = new EmbedBuilder()
                        .setColor('#2ecc71')
                        .setTitle('✅ Server Backup Created')
                        .setDescription(`Backup has been successfully created and saved!`)
                        .addFields(
                            { name: '📁 Filename', value: result.filename, inline: false },
                            { name: '📊 Total Backups', value: `${stats.count} backup(s)`, inline: true },
                            { name: '🗂️ Backup Contents', value: 
                                `• Channels: ${message.guild.channels.cache.size}\n` +
                                `• Roles: ${message.guild.roles.cache.size}\n` +
                                `• Emojis: ${message.guild.emojis.cache.size}\n` +
                                `• Settings: Server configuration`,
                                inline: false
                            }
                        )
                        .setFooter({ text: 'Backups are stored locally on the bot server' })
                        .setTimestamp();
                    
                    await statusMsg.edit({ content: null, embeds: [embed] });
                } else {
                    await statusMsg.edit(`❌ Failed to create backup: ${result.error}`);
                }
            } catch (error) {
                console.error('Backup command error:', error);
                await statusMsg.edit('❌ An error occurred while creating the backup!');
            }
        }
        
        // !backups command - List available backups (ADMIN ONLY)
        else if (command === 'backups' || command === 'listbackups') {
            if (!hasPermission(message.member, 'admin')) {
                return; // Silent fail - act as unknown command
            }
            
            const backupList = antiRaid.listBackups();
            
            if (backupList.length === 0) {
                return message.reply('📁 No backups found! Use `!backup` to create one.');
            }
            
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('📁 Available Server Backups')
                .setDescription(backupList.join('\n\n'))
                .setFooter({ text: 'Use !restore [number] to restore a backup' })
                .setTimestamp();
            
            message.reply({ embeds: [embed] });
        }
        
        // !restore command - Restore from backup (ADMIN ONLY)
        else if (command === 'restore') {
            if (!hasPermission(message.member, 'admin')) {
                return; // Silent fail - act as unknown command
            }
            
            const backupNumber = parseInt(args[0]);
            if (!backupNumber) {
                return message.reply('❌ Please specify a backup number! Usage: `!restore [number]`\nUse `!backups` to see available backups.');
            }
            
            const stats = antiRaid.getBackupStats();
            if (backupNumber < 1 || backupNumber > stats.count) {
                return message.reply(`❌ Invalid backup number! Please choose between 1 and ${stats.count}`);
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
            
            await message.reply({ embeds: [confirmEmbed] });
            
            // Wait for confirmation
            const filter = m => m.author.id === message.author.id && m.content.toLowerCase() === 'confirm';
            const collector = message.channel.createMessageCollector({ filter, time: 30000, max: 1 });
            
            collector.on('collect', async () => {
                const statusMsg = await message.channel.send('⏳ Restoring server from backup... This may take several minutes.');
                
                try {
                    const result = await antiRaid.restoreFromBackup(message.guild, selectedBackup.filename);
                    
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
                    console.error('Restore command error:', error);
                    await statusMsg.edit('❌ An error occurred during restoration!');
                }
            });
            
            collector.on('end', collected => {
                if (collected.size === 0) {
                    message.channel.send('❌ Restore cancelled - confirmation timeout.');
                }
            });
        }
        
        // !antiraid command - Show anti-raid status (ADMIN ONLY)
        else if (command === 'antiraid' || command === 'raidstatus') {
            if (!hasPermission(message.member, 'admin')) {
                return; // Silent fail - act as unknown command
            }
            
            const stats = antiRaid.getBackupStats();
            const config = antiRaid.ANTI_RAID_CONFIG;
            
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('🛡️ Anti-Raid Protection Status')
                .setDescription('**Current Protection Settings**')
                .addFields(
                    { 
                        name: '🚫 Spam Detection', 
                        value: `• ${config.SPAM_MESSAGE_COUNT} messages in ${config.SPAM_TIME_WINDOW / 1000}s → Mute ${config.SPAM_MUTE_DURATION} min\n• Status: ✅ Active`,
                        inline: false 
                    },
                    { 
                        name: '🗑️ Channel Deletion Protection', 
                        value: `• ${config.CHANNEL_DELETE_COUNT} deletions in ${config.CHANNEL_DELETE_TIME_WINDOW / 1000}s → Jail\n• Status: ✅ Active`,
                        inline: false 
                    },
                    { 
                        name: '🎭 Role Deletion Protection', 
                        value: `• ${config.ROLE_DELETE_COUNT} deletions in ${config.ROLE_DELETE_TIME_WINDOW / 1000}s → Jail\n• Status: ✅ Active`,
                        inline: false 
                    },
                    { 
                        name: '🔨 Ban Wave Protection', 
                        value: `• ${config.BAN_COUNT} bans in ${config.BAN_TIME_WINDOW / 1000}s → Jail\n• Status: ✅ Active`,
                        inline: false 
                    },
                    {
                        name: '💾 Server Backups',
                        value: `• Total backups: ${stats.count}\n• Last backup: ${stats.backups[0] ? stats.backups[0].created.toLocaleString() : 'None'}`,
                        inline: false
                    }
                )
                .setFooter({ text: 'Use !backup to create a new server backup' })
                .setTimestamp();
            
            message.reply({ embeds: [embed] });
        }
        
        // Debug Command
        else if (command === 'debug') {
            // Allow debug command for anyone to help diagnose permission issues
            const userRoles = message.member.roles.cache.map(role => `${role.name} (${role.id})`);
            const botPermissions = message.guild.members.me.permissions.toArray();
            
            const embed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('🔧 Debug Information')
                .addFields(
                    { name: '👤 Your Roles', value: userRoles.join('\n') || 'No roles', inline: false },
                    { name: '🤖 Bot Permissions', value: botPermissions.join(', ') || 'No permissions', inline: false },
                    { name: '⚙️ Configured Roles', value: `Moderator: ${botConfig.moderatorRoles.join(', ')}\nAdmin: ${botConfig.adminRoles.join(', ')}\nVoice: ${botConfig.voiceModeratorRoles.join(', ')}`, inline: false },
                    { name: '🔍 Permission Checks', value: `Moderator: ${hasModeratorRole(message.member)}\nAdmin: ${hasAdminRole(message.member)}\nVoice: ${hasVoiceModeratorRole(message.member)}`, inline: false },
                    { name: '📝 Current Prefix', value: `"${botConfig.prefix}"`, inline: false },
                    { name: '🏠 Server Owner', value: `ID: ${message.guild.ownerId}`, inline: false }
                )
                .setTimestamp();
            
            message.reply({ embeds: [embed] });
        }
        
        // Unknown command
        else {
            return message.reply('❓ Unknown command! Type `!help` to see all available commands.');
        }
        
    } catch (error) {
        console.error('Command error:', error);
        message.reply('❌ An error occurred while executing the command!');
    }
});

// Error handling
client.on('error', console.error);
process.on('unhandledRejection', console.error);

// Login to Discord
try {
    client.login(config.DISCORD_TOKEN);
} catch (error) {
    console.error('❌ Failed to login:', error.message);
    console.error('Check your DISCORD_TOKEN in config.js');
    process.exit(1);
}


