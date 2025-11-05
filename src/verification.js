const { EmbedBuilder } = require('discord.js');

// Load verification config
let verificationConfig;
try {
    verificationConfig = require('./verification-config.js');
} catch (error) {
    verificationConfig = null;
}

/**
 * Safely reply to a message (handles deleted messages)
 */
async function safeReply(message, contentOrOptions) {
    try {
        // Check if message still exists and channel is accessible
        if (!message || !message.channel) {
            return null;
        }
        
        // Try to fetch the channel to ensure it still exists
        const channel = await message.client.channels.fetch(message.channel.id).catch(() => null);
        if (!channel) {
            return null;
        }
        
        // Reply with content or options (Discord.js handles both)
        return await message.reply(contentOrOptions);
    } catch (error) {
        // Message was deleted or channel is inaccessible - silently fail
        return null;
    }
}

/**
 * Initialize verification system
 */
function initVerification(client, botConfig) {
    if (!verificationConfig) {
        return;
    }
    
    // Set up hourly ping for unverified role
    setupHourlyUnverifiedPing(client);
}

/**
 * Check if user can use verification commands (verificator role or admin)
 */
function canUseVerificationCommand(member, config) {
    if (!member || !member.roles) return false;
    
    // Load config if not provided
    if (!config) {
        try {
            config = require('./config.js');
        } catch {
            return false;
        }
    }
    
    // Check if user has verificator role
    if (verificationConfig && verificationConfig.VERIFICATOR_ROLE_ID) {
        if (member.roles.cache.has(verificationConfig.VERIFICATOR_ROLE_ID)) {
            return true;
        }
    }
    
    // Check if user has admin role
    const adminRoles = config.ADMIN_ROLES ? config.ADMIN_ROLES.split(',').map(id => id.trim()) : [];
    
    return member.roles.cache.some(role => adminRoles.includes(role.id));
}

/**
 * Check if user has permission to see verification commands (for error messages)
 */
function hasVerificationPermission(member, config) {
    return canUseVerificationCommand(member, config);
}

/**
 * Verify a user (give verified role)
 */
async function verifyUser(message, target, roleType = 'verified') {
    if (!verificationConfig) {
        return await safeReply(message, '❌ Verification system is not configured.');
    }
    
    // Load config
    let config;
    try {
        config = require('./config.js');
    } catch {
        return await safeReply(message, '❌ Configuration error!');
    }
    
    // Check permissions FIRST - if no permission, show "unknown command" to hide commands
    if (!hasVerificationPermission(message.member, config)) {
        return; // Don't reply - let bot.js handle it as unknown command
    }
    
    // Check if command is used in correct channel (only show this if they have permission)
    if (message.channel.id !== verificationConfig.VERIFICATION_CMD_CHANNEL_ID) {
        return await safeReply(message, `❌ Verification commands can only be used in <#${verificationConfig.VERIFICATION_CMD_CHANNEL_ID}>`);
    }
    
    // Get target member
    let targetMember;
    if (message.mentions.members.size > 0) {
        targetMember = message.mentions.members.first();
    } else {
        // Try to parse user ID from command (format: !vb=userid or !vb =userid)
        const args = message.content.slice(1).trim().split(/\s+/);
        const command = args[0].toLowerCase();
        let userId = null;
        
        // Check if command has =userid format (e.g., !vb=123456789)
        if (command.includes('=')) {
            userId = command.split('=')[1];
        } 
        // Check if there's a separate argument with =userid (e.g., !vb =123456789)
        else if (args.length > 1 && args[1].startsWith('=')) {
            userId = args[1].substring(1);
        }
        // Check if there's just a user ID as argument (e.g., !vb 123456789)
        else if (args.length > 1) {
            userId = args[1];
        }
        
        if (userId) {
            try {
                targetMember = await message.guild.members.fetch(userId);
            } catch (error) {
                return await safeReply(message, '❌ Could not find user with that ID. Please mention a user or provide their ID using `@user` or `=userid`');
            }
        } else {
            return await safeReply(message, '❌ Please mention a user or provide their ID using `@user` or `=userid`\n**Examples:**\n• `!vb @user`\n• `!vb=123456789012345678`\n• `!vb =123456789012345678`');
        }
    }
    
    if (!targetMember) {
        return await safeReply(message, '❌ Could not find that user.');
    }
    
    // Determine which role to give
    const roleToGive = roleType === 'female' 
        ? verificationConfig.VERIFIED_FEMALE_ROLE_ID 
        : verificationConfig.VERIFIED_ROLE_ID;
    
    const roleName = roleType === 'female' ? 'Verified Female' : 'Verified';
    
    try {
        // Remove unverified role if they have it
        if (verificationConfig.UNVERIFIED_ROLE_ID) {
            const unverifiedRole = message.guild.roles.cache.get(verificationConfig.UNVERIFIED_ROLE_ID);
            if (unverifiedRole && targetMember.roles.cache.has(unverifiedRole.id)) {
                await targetMember.roles.remove(unverifiedRole);
            }
        }
        
        // Add verified role
        const verifiedRole = message.guild.roles.cache.get(roleToGive);
        if (!verifiedRole) {
            return await safeReply(message, `❌ ${roleName} role not found! Please check your configuration.`);
        }
        
        // Check if they already have the role
        if (targetMember.roles.cache.has(verifiedRole.id)) {
            return await safeReply(message, `✅ ${targetMember.user.tag} already has the ${roleName} role.`);
        }
        
        // Add the role
        await targetMember.roles.add(verifiedRole);
        
        // Log verification
        await logVerification(message.client, targetMember, message.member, roleName);
        
        // Send confirmation
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ User Verified')
            .setDescription(`**${targetMember.user.tag}** has been verified as **${roleName}**!`)
            .addFields(
                { name: '👤 User', value: `${targetMember.user.tag} (${targetMember.id})`, inline: true },
                { name: '👨‍💼 Verified By', value: `${message.member.user.tag}`, inline: true },
                { name: '🎭 Role Given', value: `${roleName}`, inline: true }
            )
            .setThumbnail(targetMember.user.displayAvatarURL())
            .setTimestamp();
        
        return await safeReply(message, { embeds: [embed] });
        
    } catch (error) {
        return await safeReply(message, `❌ Failed to verify user: ${error.message}`);
    }
}

/**
 * Log verification action
 */
async function logVerification(client, targetMember, verifier, roleName) {
    if (!verificationConfig || !verificationConfig.VERIFICATION_LOG_CHANNEL_ID) {
        return;
    }
    
    try {
        const logChannel = client.channels.cache.get(verificationConfig.VERIFICATION_LOG_CHANNEL_ID);
        if (!logChannel) {
            return;
        }
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Verification Log')
            .setDescription(`**User Verified**`)
            .addFields(
                { name: '👤 User', value: `${targetMember.user.tag} (${targetMember.id})`, inline: true },
                { name: '👨‍💼 Verified By', value: `${verifier.user.tag} (${verifier.id})`, inline: true },
                { name: '🎭 Role Given', value: `${roleName}`, inline: true },
                { name: '⏰ Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            )
            .setThumbnail(targetMember.user.displayAvatarURL())
            .setFooter({ 
                text: `Verification ID: ${Math.random().toString(36).substr(2, 9)}`,
                iconURL: verifier.user.displayAvatarURL()
            })
            .setTimestamp();
        
        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        // Silently fail
    }
}

/**
 * Set up hourly ping for unverified role
 */
function setupHourlyUnverifiedPing(client) {
    if (!verificationConfig || !verificationConfig.VERIFICATION_CHAT_CHANNEL_ID || !verificationConfig.UNVERIFIED_ROLE_ID) {
        return;
    }
    
    // Ping immediately on startup
    setTimeout(() => {
        pingUnverifiedRole(client);
    }, 5000); // Wait 5 seconds for bot to be ready
    
    // Then ping every hour
    setInterval(() => {
        pingUnverifiedRole(client);
    }, verificationConfig.PING_UNVERIFIED_INTERVAL);
}

/**
 * Ping unverified role in verification chat channel
 */
async function pingUnverifiedRole(client) {
    if (!verificationConfig || !verificationConfig.VERIFICATION_CHAT_CHANNEL_ID || !verificationConfig.UNVERIFIED_ROLE_ID) {
        return;
    }
    
    try {
        const channel = client.channels.cache.get(verificationConfig.VERIFICATION_CHAT_CHANNEL_ID);
        if (!channel) {
            return;
        }
        
        const unverifiedRole = channel.guild.roles.cache.get(verificationConfig.UNVERIFIED_ROLE_ID);
        if (!unverifiedRole) {
            return;
        }
        
        await channel.send(`<@&${unverifiedRole.id}> Please join a verification room to get verified!`);
    } catch (error) {
        // Silently fail
    }
}

/**
 * Handle voice state update for verification rooms
 */
async function handleVerificationRoomJoin(client, newState) {
    if (!verificationConfig || !verificationConfig.VERIFICATION_ROOMS || !verificationConfig.VERIFICATOR_ROLE_ID) {
        return;
    }
    
    // Check if user joined a verification room
    if (!newState.channelId) return;
    if (!verificationConfig.VERIFICATION_ROOMS.includes(newState.channelId)) return;
    
    // Check if member exists
    if (!newState.member) return;
    
    try {
        const channel = newState.channel;
        if (!channel) return;
        
        const member = newState.member;
        
        // Check if member is unverified (has unverified role and doesn't have verified roles)
        const hasUnverifiedRole = verificationConfig.UNVERIFIED_ROLE_ID && 
                                   member.roles.cache.has(verificationConfig.UNVERIFIED_ROLE_ID);
        const hasVerifiedRole = member.roles.cache.has(verificationConfig.VERIFIED_ROLE_ID) ||
                               member.roles.cache.has(verificationConfig.VERIFIED_FEMALE_ROLE_ID);
        
        // Only ping if member is unverified (has unverified role and doesn't have verified role)
        if (!hasUnverifiedRole || hasVerifiedRole) {
            return; // Member is already verified or doesn't have unverified role, don't ping
        }
        
        const verificatorRole = channel.guild.roles.cache.get(verificationConfig.VERIFICATOR_ROLE_ID);
        if (!verificatorRole) {
            return;
        }
        
        // Get the verification chat channel
        const textChannel = client.channels.cache.get(verificationConfig.VERIFICATION_CHAT_CHANNEL_ID);
        
        if (textChannel) {
            await textChannel.send(`<@&${verificatorRole.id}> <@${member.id}> has joined <#${channel.id}> for verification!`);
        }
    } catch (error) {
        // Silently fail
    }
}

/**
 * Handle new member join - give unverified role (only if they don't already have it)
 */
async function handleNewMemberJoin(member) {
    if (!verificationConfig || !verificationConfig.UNVERIFIED_ROLE_ID) {
        return;
    }
    
    try {
        const unverifiedRole = member.guild.roles.cache.get(verificationConfig.UNVERIFIED_ROLE_ID);
        if (!unverifiedRole) {
            return;
        }
        
        // Check if they already have the unverified role (don't add if they already have it)
        if (member.roles.cache.has(unverifiedRole.id)) {
            return; // Already has unverified role, skip
        }
        
        // Check if they already have verified roles
        const hasVerifiedRole = member.roles.cache.has(verificationConfig.VERIFIED_ROLE_ID) ||
                               member.roles.cache.has(verificationConfig.VERIFIED_FEMALE_ROLE_ID);
        
        // Only add unverified role if they don't have verified role
        if (!hasVerifiedRole) {
            await member.roles.add(unverifiedRole);
        }
    } catch (error) {
        // Silently fail - don't log errors
    }
}

/**
 * Show verification help command
 */
async function showVerificationHelp(message) {
    if (!verificationConfig) {
        return await safeReply(message, '❌ Verification system is not configured.');
    }
    
    // Load config
    let config;
    try {
        config = require('./config.js');
    } catch {
        return await safeReply(message, '❌ Configuration error!');
    }
    
    // Check permissions - if no permission, show "unknown command" to hide commands
    if (!hasVerificationPermission(message.member, config)) {
        return; // Don't reply - let bot.js handle it as unknown command
    }
    
    const embed = new EmbedBuilder()
        .setColor('#7289da')
        .setTitle('🔐 Verification Commands')
        .setDescription('Commands for verifying new members in the server.')
        .addFields(
            { 
                name: '📋 Commands', 
                value: '`!vb @user/id` - Verify user (Male/Neutral)\n`!vg @user/id` - Verify user (Female)\n`!vhelp` - Show this help message', 
                inline: false 
            },
            { 
                name: '📝 Usage Examples', 
                value: '• `!vb @username`\n• `!vb=123456789012345678`\n• `!vb =123456789012345678`\n• `!vg @username`\n• `!vg=123456789012345678`', 
                inline: false 
            },
            { 
                name: '⚠️ Restrictions', 
                value: `• Commands only work in <#${verificationConfig.VERIFICATION_CMD_CHANNEL_ID}>\n• Only @verificator role or admins can use these commands`, 
                inline: false 
            },
            { 
                name: '📊 What Happens', 
                value: '• Removes unverified role\n• Adds verified role\n• Logs verification action', 
                inline: false 
            }
        )
        .setFooter({ text: 'Verification System' })
        .setTimestamp();
    
    return await safeReply(message, { embeds: [embed] });
}

module.exports = {
    initVerification,
    verifyUser,
    handleVerificationRoomJoin,
    handleNewMemberJoin,
    pingUnverifiedRole,
    showVerificationHelp
};

