const { EmbedBuilder } = require('discord.js');

/**
 * Centralized logging utilities
 */

const fs = require('fs');
const path = require('path');

class Logger {
    constructor(config) {
        this.config = config;
        this.logDir = path.join(__dirname, '..', 'logs');
        
        // Create logs directory if it doesn't exist
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    /**
     * Log an action to the appropriate channel
     */
    async logAction(guild, action, moderator, target, reason = 'No reason provided') {
        const { logChannelId, embedColor, actionEmoji } = this.getLogConfig(action);
        
        // Log to file
        this.logToFile(action, moderator, target, reason);
        
        // If specific log channel is not configured, skip logging
        if (!logChannelId || logChannelId.startsWith('your_')) {
            return;
        }
        
        const logChannel = guild.channels.cache.get(logChannelId);
        if (!logChannel) return;
        
        // Handle both real user objects and system/auto actions
        const moderatorTag = moderator.user ? moderator.user.tag : moderator.tag || 'System';
        const moderatorId = moderator.id || 'N/A';
        const moderatorAvatar = (moderator.user && typeof moderator.user.displayAvatarURL === 'function') 
            ? moderator.user.displayAvatarURL() 
            : guild.iconURL();
        
        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(`${actionEmoji} Moderation Action: ${action}`)
            .setDescription(`**Action performed by:** ${moderatorTag}`)
            .addFields(
                { name: '👤 Target User', value: `${target.user ? target.user.tag : target.tag}`, inline: true },
                { name: '🆔 User ID', value: `${target.id}`, inline: true },
                { name: '📝 Reason', value: reason, inline: false },
                { name: '⏰ Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '🏠 Server', value: guild.name, inline: true }
            )
            .setThumbnail(target.user ? target.user.displayAvatarURL() : guild.iconURL())
            .setFooter({ 
                text: `Moderator ID: ${moderatorId} • Action ID: ${Math.random().toString(36).substr(2, 9)}`,
                iconURL: moderatorAvatar
            })
            .setTimestamp();
        
        try {
            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Failed to log action:', error);
        }
    }

    /**
     * Get log configuration for different action types
     */
    getLogConfig(action) {
        const configs = {
            'JAIL': {
                logChannelId: this.config.jailLogChannelId,
                embedColor: '#ff6b6b',
                actionEmoji: '🔒'
            },
            'UNJAIL': {
                logChannelId: this.config.jailLogChannelId,
                embedColor: '#2ecc71',
                actionEmoji: '🔓'
            },
            'WARN': {
                logChannelId: this.config.warnLogChannelId,
                embedColor: '#ffa500',
                actionEmoji: '⚠️'
            },
            'UNWARN': {
                logChannelId: this.config.warnLogChannelId,
                embedColor: '#2ecc71',
                actionEmoji: '✅'
            },
            'MUTE': {
                logChannelId: this.config.muteLogChannelId,
                embedColor: '#7289da',
                actionEmoji: '🔇'
            },
            'UNMUTE': {
                logChannelId: this.config.muteLogChannelId,
                embedColor: '#7289da',
                actionEmoji: '🔊'
            },
            'FORCE_MUTE': {
                logChannelId: this.config.muteLogChannelId,
                embedColor: '#7289da',
                actionEmoji: '🔇'
            },
            'FORCE_UNMUTE': {
                logChannelId: this.config.muteLogChannelId,
                embedColor: '#7289da',
                actionEmoji: '🔊'
            },
            'BAN': {
                logChannelId: this.config.banLogChannelId,
                embedColor: '#8B0000',
                actionEmoji: '🚫'
            },
            'KICK': {
                logChannelId: this.config.kickLogChannelId,
                embedColor: '#ff6b6b',
                actionEmoji: '👢'
            },
            'UNBAN': {
                logChannelId: this.config.unbanLogChannelId,
                embedColor: '#00ff00',
                actionEmoji: '🔓'
            },
            'NICKNAME': {
                logChannelId: this.config.nicknameLogChannelId,
                embedColor: '#9932cc',
                actionEmoji: '📝'
            }
        };

        return configs[action] || {
            logChannelId: null,
            embedColor: '#7289da',
            actionEmoji: '📋'
        };
    }
    
    /**
     * Log action to file for dashboard
     */
    logToFile(action, moderator, target, reason) {
        const logEntry = {
            timestamp: Date.now(),
            action: action,
            moderator: {
                id: moderator.id,
                username: moderator.user ? moderator.user.username : moderator.username || 'System',
                discriminator: moderator.user ? moderator.user.discriminator : moderator.discriminator || '0000'
            },
            target: {
                id: target.id,
                username: target.user ? target.user.username : target.username || 'Unknown',
                discriminator: target.user ? target.user.discriminator : target.discriminator || '0000'
            },
            reason: reason
        };
        
        const logFile = path.join(this.logDir, 'moderation-actions.json');
        
        let logs = [];
        if (fs.existsSync(logFile)) {
            try {
                const data = fs.readFileSync(logFile, 'utf8');
                logs = JSON.parse(data);
            } catch (error) {
                console.error('Failed to read log file:', error);
            }
        }
        
        logs.push(logEntry);
        
        // Keep only last 1000 entries
        if (logs.length > 1000) {
            logs = logs.slice(-1000);
        }
        
        try {
            fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
        } catch (error) {
            console.error('Failed to write log file:', error);
        }
    }
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

module.exports = { Logger, safeReply };
