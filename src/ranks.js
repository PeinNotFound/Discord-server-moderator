const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

// Ranks database file path
const RANKS_DB_PATH = path.join(__dirname, 'ranks-data.json');

// Rank definitions with points requirements
const RANK_TIERS = [
    {
        name: 'Trial Staff',
        points: 0,
        description: '🔰 Starting role | Mute power',
        color: '#95a5a6',
        emoji: '🔰'
    },
    {
        name: 'Staff',
        points: 5,
        description: '👮 Mute & Deafen & Move | Change nickname to others',
        color: '#3498db',
        emoji: '👮'
    },
    {
        name: 'Moderator',
        points: 150,
        description: '🛡️ All Staff perms + Delete messages + View channel logs + Server audit logs',
        color: '#9b59b6',
        emoji: '🛡️'
    },
    {
        name: 'Head Moderator',
        points: 250,
        description: '⚔️ All Moderator perms + View channels + Server insights + Manage expressions',
        color: '#e91e63',
        emoji: '⚔️'
    },
    {
        name: 'Manager',
        points: 350,
        description: '👑 All Head Moderator perms + Jail members + Kick members + Mention everyone',
        color: '#f39c12',
        emoji: '👑'
    },
    {
        name: 'Head Manager',
        points: 650,
        description: '💎 All Manager perms + Unjail + Ban + Manage roles + Manage channels',
        color: '#e67e22',
        emoji: '💎'
    },
    {
        name: 'Administrator',
        points: 2000,
        description: '⚡ Administrator privilege | Can do anything',
        color: '#e74c3c',
        emoji: '⚡'
    }
];

// Load ranks database
function loadRanksDB() {
    try {
        if (fs.existsSync(RANKS_DB_PATH)) {
            const data = fs.readFileSync(RANKS_DB_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading ranks database:', error);
    }
    return { users: {} };
}

// Save ranks database
function saveRanksDB(data) {
    try {
        fs.writeFileSync(RANKS_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving ranks database:', error);
    }
}

// Get user data from database
function getUserData(userId) {
    const db = loadRanksDB();
    if (!db.users[userId]) {
        db.users[userId] = {
            points: 0,
            history: []
        };
        saveRanksDB(db);
    }
    return db.users[userId];
}

// Calculate current rank based on points
function getRankFromPoints(points) {
    let currentRank = RANK_TIERS[0];
    
    for (let i = 0; i < RANK_TIERS.length; i++) {
        if (points >= RANK_TIERS[i].points) {
            currentRank = RANK_TIERS[i];
        } else {
            break;
        }
    }
    
    return currentRank;
}

// Get next rank in progression
function getNextRank(currentRankPoints) {
    for (let i = 0; i < RANK_TIERS.length; i++) {
        if (RANK_TIERS[i].points > currentRankPoints) {
            return RANK_TIERS[i];
        }
    }
    return null; // Max rank reached
}

// Add points to user
async function addPoints(guild, userId, amount, reason, moderator, rankConfig) {
    const db = loadRanksDB();
    
    if (!db.users[userId]) {
        db.users[userId] = {
            points: 0,
            history: []
        };
    }
    
    const oldPoints = db.users[userId].points;
    const oldRank = getRankFromPoints(oldPoints);
    
    db.users[userId].points += amount;
    const newPoints = db.users[userId].points;
    const newRank = getRankFromPoints(newPoints);
    
    // Add to history
    db.users[userId].history.push({
        timestamp: Date.now(),
        change: amount,
        reason: reason,
        moderator: moderator.id,
        oldPoints: oldPoints,
        newPoints: newPoints
    });
    
    saveRanksDB(db);
    
    // Check if rank changed
    const rankChanged = oldRank.name !== newRank.name;
    
    return {
        oldPoints,
        newPoints,
        oldRank,
        newRank,
        rankChanged
    };
}

// Remove points from user
async function removePoints(guild, userId, amount, reason, moderator, rankConfig) {
    const db = loadRanksDB();
    
    if (!db.users[userId]) {
        db.users[userId] = {
            points: 0,
            history: []
        };
    }
    
    const oldPoints = db.users[userId].points;
    const oldRank = getRankFromPoints(oldPoints);
    
    db.users[userId].points = Math.max(0, db.users[userId].points - amount);
    const newPoints = db.users[userId].points;
    const newRank = getRankFromPoints(newPoints);
    
    // Add to history
    db.users[userId].history.push({
        timestamp: Date.now(),
        change: -amount,
        reason: reason,
        moderator: moderator.id,
        oldPoints: oldPoints,
        newPoints: newPoints
    });
    
    saveRanksDB(db);
    
    // Check if rank changed
    const rankChanged = oldRank.name !== newRank.name;
    
    return {
        oldPoints,
        newPoints,
        oldRank,
        newRank,
        rankChanged
    };
}

// Update user's Discord role based on rank
async function updateUserRole(guild, member, newRank, rankConfig) {
    try {
        // Get all rank role IDs
        const allRankRoleIds = [
            rankConfig.trialStaffRoleId,
            rankConfig.staffRoleId,
            rankConfig.moderatorRoleId,
            rankConfig.headModeratorRoleId,
            rankConfig.managerRoleId,
            rankConfig.headManagerRoleId,
            rankConfig.administratorRoleId
        ].filter(id => id && id !== 'your_role_id_here');
        
        // Remove all rank roles first
        const rolesToRemove = member.roles.cache.filter(role => allRankRoleIds.includes(role.id));
        if (rolesToRemove.size > 0) {
            await member.roles.remove(rolesToRemove);
        }
        
        // Add the new rank role
        let newRoleId = null;
        switch (newRank.name) {
            case 'Trial Staff':
                newRoleId = rankConfig.trialStaffRoleId;
                break;
            case 'Staff':
                newRoleId = rankConfig.staffRoleId;
                break;
            case 'Moderator':
                newRoleId = rankConfig.moderatorRoleId;
                break;
            case 'Head Moderator':
                newRoleId = rankConfig.headModeratorRoleId;
                break;
            case 'Manager':
                newRoleId = rankConfig.managerRoleId;
                break;
            case 'Head Manager':
                newRoleId = rankConfig.headManagerRoleId;
                break;
            case 'Administrator':
                newRoleId = rankConfig.administratorRoleId;
                break;
        }
        
        if (newRoleId && newRoleId !== 'your_role_id_here') {
            const newRole = guild.roles.cache.get(newRoleId);
            if (newRole) {
                await member.roles.add(newRole);
                console.log(`Updated ${member.user.tag} to ${newRank.name} role`);
            }
        }
    } catch (error) {
        console.error('Error updating user role:', error);
    }
}

// Send DM notification for points change
async function sendPointsChangeDM(member, change, reason, oldPoints, newPoints) {
    try {
        const isPositive = change > 0;
        const embed = new EmbedBuilder()
            .setColor(isPositive ? '#2ecc71' : '#e74c3c')
            .setTitle(`${isPositive ? '✨ Points Added' : '⚠️ Points Removed'}`)
            .setDescription(`Your points have been ${isPositive ? 'increased' : 'decreased'}`)
            .addFields(
                { name: '📊 Change', value: `${isPositive ? '+' : ''}${change} points`, inline: true },
                { name: '💰 New Total', value: `${newPoints} points`, inline: true },
                { name: '📝 Reason', value: reason || 'No reason provided', inline: false }
            )
            .setFooter({ text: `Previous: ${oldPoints} points` })
            .setTimestamp();
        
        await member.send({ embeds: [embed] });
    } catch (error) {
        console.log('Could not send DM to user:', error.message);
    }
}

// Send DM notification for rank promotion/demotion
async function sendRankChangeDM(member, oldRank, newRank, newPoints) {
    try {
        const isPromotion = newRank.points > oldRank.points;
        const nextRank = getNextRank(newRank.points);
        
        const embed = new EmbedBuilder()
            .setColor(newRank.color)
            .setTitle(`${isPromotion ? '🎉 Rank Promotion!' : '⚠️ Rank Demotion'}`)
            .setDescription(`You have been ${isPromotion ? 'promoted to' : 'demoted to'} **${newRank.emoji} ${newRank.name}**!`)
            .addFields(
                { name: '📊 Current Points', value: `${newPoints} points`, inline: true },
                { name: '🎯 Current Rank', value: `${newRank.emoji} ${newRank.name}`, inline: true },
                { name: '📋 Permissions', value: newRank.description, inline: false }
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();
        
        if (nextRank) {
            const pointsNeeded = nextRank.points - newPoints;
            embed.addFields({
                name: '⏭️ Next Rank',
                value: `${nextRank.emoji} **${nextRank.name}** (${pointsNeeded} points needed)`,
                inline: false
            });
        } else {
            embed.addFields({
                name: '👑 Achievement Unlocked',
                value: 'You have reached the maximum rank!',
                inline: false
            });
        }
        
        await member.send({ embeds: [embed] });
    } catch (error) {
        console.log('Could not send DM to user:', error.message);
    }
}

// Log points change to rank log channel
async function logPointsChange(guild, member, change, reason, moderator, oldPoints, newPoints, rankLogChannelId) {
    try {
        if (!rankLogChannelId || rankLogChannelId === 'your_rank_log_channel_id_here') {
            return;
        }
        
        const logChannel = guild.channels.cache.get(rankLogChannelId);
        if (!logChannel) {
            console.log('Rank log channel not found');
            return;
        }
        
        const isPositive = change > 0;
        const embed = new EmbedBuilder()
            .setColor(isPositive ? '#2ecc71' : '#e74c3c')
            .setTitle(`${isPositive ? '✨ Points Added' : '⚠️ Points Removed'}`)
            .addFields(
                { name: '👤 User', value: `${member.user.tag}\n<@${member.id}>`, inline: true },
                { name: '🆔 User ID', value: member.id, inline: true },
                { name: '📊 Change', value: `${isPositive ? '+' : ''}${change} points`, inline: true },
                { name: '💰 Old Points', value: `${oldPoints}`, inline: true },
                { name: '💰 New Points', value: `${newPoints}`, inline: true },
                { name: '🔄 Difference', value: `${newPoints - oldPoints}`, inline: true },
                { name: '📝 Reason', value: reason || 'No reason provided', inline: false },
                { name: '👮 Moderator', value: `${moderator.user.tag}\n<@${moderator.id}>`, inline: true },
                { name: '⏰ Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setFooter({ text: `Action by ${moderator.user.tag}`, iconURL: moderator.user.displayAvatarURL() })
            .setTimestamp();
        
        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error logging points change:', error);
    }
}

// Log rank change to rank log channel
async function logRankChange(guild, member, oldRank, newRank, newPoints, rankLogChannelId) {
    try {
        if (!rankLogChannelId || rankLogChannelId === 'your_rank_log_channel_id_here') {
            return;
        }
        
        const logChannel = guild.channels.cache.get(rankLogChannelId);
        if (!logChannel) {
            return;
        }
        
        const isPromotion = newRank.points > oldRank.points;
        const embed = new EmbedBuilder()
            .setColor(newRank.color)
            .setTitle(`${isPromotion ? '🎉 Rank Promotion' : '⚠️ Rank Demotion'}`)
            .setDescription(`**${member.user.tag}** has been ${isPromotion ? 'promoted' : 'demoted'}!`)
            .addFields(
                { name: '👤 User', value: `<@${member.id}>`, inline: true },
                { name: '🆔 User ID', value: member.id, inline: true },
                { name: '📊 Points', value: `${newPoints}`, inline: true },
                { name: '⬇️ Previous Rank', value: `${oldRank.emoji} ${oldRank.name}`, inline: true },
                { name: '⬆️ New Rank', value: `${newRank.emoji} ${newRank.name}`, inline: true },
                { name: '🔄 Change', value: isPromotion ? '📈 Promoted' : '📉 Demoted', inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();
        
        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error logging rank change:', error);
    }
}

// Create rank display embed
function createRankEmbed(member, points) {
    const currentRank = getRankFromPoints(points);
    const nextRank = getNextRank(currentRank.points);
    
    const embed = new EmbedBuilder()
        .setColor(currentRank.color)
        .setTitle(`${currentRank.emoji} Rank Information`)
        .setDescription(`**${member.user.tag}**'s current rank status`)
        .addFields(
            { name: '💰 Total Points', value: `${points} points`, inline: true },
            { name: '🎯 Current Rank', value: `${currentRank.emoji} **${currentRank.name}**`, inline: true },
            { name: '📋 Permissions', value: currentRank.description, inline: false }
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();
    
    if (nextRank) {
        const pointsNeeded = nextRank.points - points;
        const progress = Math.round(((points - currentRank.points) / (nextRank.points - currentRank.points)) * 100);
        
        // Create progress bar
        const barLength = 20;
        const filledLength = Math.round((barLength * progress) / 100);
        const emptyLength = barLength - filledLength;
        const progressBar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);
        
        embed.addFields(
            { name: '⏭️ Next Rank', value: `${nextRank.emoji} **${nextRank.name}**`, inline: true },
            { name: '📈 Points Needed', value: `${pointsNeeded} points`, inline: true },
            { name: '📊 Progress', value: `${progressBar} ${progress}%\n${points}/${nextRank.points} points`, inline: false }
        );
    } else {
        embed.addFields({
            name: '👑 Maximum Rank',
            value: 'You have reached the highest rank available!',
            inline: false
        });
    }
    
    return embed;
}

module.exports = {
    RANK_TIERS,
    loadRanksDB,
    saveRanksDB,
    getUserData,
    getRankFromPoints,
    getNextRank,
    addPoints,
    removePoints,
    updateUserRole,
    sendPointsChangeDM,
    sendRankChangeDM,
    logPointsChange,
    logRankChange,
    createRankEmbed
};

