const fs = require('fs');
const path = require('path');

/**
 * Guild-specific configuration and data manager
 * Each server gets its own directory with:
 * - config.json (server-specific settings)
 * - moderation-data.json (warns, jails, etc.)
 * - ranks-data.json (rank points)
 * - backups/ (server backups)
 */

class GuildConfigManager {
    constructor(baseDataPath = 'guild-data') {
        this.baseDataPath = path.join(__dirname, '..', baseDataPath);
        this.ensureBaseDirectory();
    }

    /**
     * Ensure base data directory exists
     */
    ensureBaseDirectory() {
        if (!fs.existsSync(this.baseDataPath)) {
            fs.mkdirSync(this.baseDataPath, { recursive: true });
            console.log(`📁 Created guild data directory: ${this.baseDataPath}`);
        }
    }

    /**
     * Get guild-specific directory path
     */
    getGuildPath(guildId) {
        return path.join(this.baseDataPath, guildId);
    }

    /**
     * Ensure guild directory exists
     */
    ensureGuildDirectory(guildId) {
        const guildPath = this.getGuildPath(guildId);
        if (!fs.existsSync(guildPath)) {
            fs.mkdirSync(guildPath, { recursive: true });
            
            // Create subdirectories
            fs.mkdirSync(path.join(guildPath, 'backups'), { recursive: true });
            
            console.log(`📁 Created directory for guild: ${guildId}`);
        }
        return guildPath;
    }

    /**
     * Get default configuration for a new guild
     */
    getDefaultConfig() {
        return {
            // Permission Role IDs
            moderatorRoles: [],
            adminRoles: [],
            voiceModeratorRoles: [],
            rankAdminRoles: [],
            
            // Moderation Role IDs
            warnRoleId: null,
            jailRoleId: null,
            mutedRoleId: null,
            
            // Rank System Role IDs
            trialStaffRoleId: null,
            staffRoleId: null,
            moderatorRoleId: null,
            headModeratorRoleId: null,
            managerRoleId: null,
            headManagerRoleId: null,
            administratorRoleId: null,
            
            // Settings
            prefix: '!',
            botEnabled: true, // Bot active status for this guild
            
            // Log Channel IDs
            jailLogChannelId: null,
            warnLogChannelId: null,
            muteLogChannelId: null,
            banLogChannelId: null,
            kickLogChannelId: null,
            unbanLogChannelId: null,
            nicknameLogChannelId: null,
            voiceModLogChannelId: null,
            moveLogChannelId: null,
            memberLeaveLogChannelId: null,
            rankLogChannelId: null,
            
            // Verification (if enabled)
            verificationEnabled: false,
            verifiedRoleId: null,
            verifiedFemaleRoleId: null,
            unverifiedRoleId: null,
            verificatorRoleId: null,
            verificationCmdChannelId: null,
            verificationChatChannelId: null,
            verificationLogChannelId: null,
            verificationRooms: [],
            
            // Command Settings
            disabledCommands: [],
            commandAliases: {},
                
            // Clan System
            clanSystemEnabled: false,
            clanTextCategoryId: '',
            clanVoiceCategoryId: ''
        };
    }

    /**
     * Load guild configuration
     */
    loadGuildConfig(guildId) {
        const guildPath = this.ensureGuildDirectory(guildId);
        const configPath = path.join(guildPath, 'config.json');
        
        try {
            if (fs.existsSync(configPath)) {
                const data = fs.readFileSync(configPath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error(`Error loading config for guild ${guildId}:`, error);
        }
        
        // Return default config if file doesn't exist
        const defaultConfig = this.getDefaultConfig();
        this.saveGuildConfig(guildId, defaultConfig);
        return defaultConfig;
    }

    /**
     * Save guild configuration
     */
    saveGuildConfig(guildId, config) {
        const guildPath = this.ensureGuildDirectory(guildId);
        const configPath = path.join(guildPath, 'config.json');
        
        try {
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        } catch (error) {
            console.error(`Error saving config for guild ${guildId}:`, error);
        }
    }

    /**
     * Update specific config values for a guild
     */
    updateGuildConfig(guildId, updates) {
        const config = this.loadGuildConfig(guildId);
        Object.assign(config, updates);
        this.saveGuildConfig(guildId, config);
        return config;
    }

    /**
     * Load guild moderation data
     */
    loadGuildData(guildId, dataFile = 'moderation-data.json') {
        const guildPath = this.ensureGuildDirectory(guildId);
        const dataPath = path.join(guildPath, dataFile);
        
        try {
            if (fs.existsSync(dataPath)) {
                const data = fs.readFileSync(dataPath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error(`Error loading ${dataFile} for guild ${guildId}:`, error);
        }
        
        // Return default data structure
        if (dataFile === 'moderation-data.json') {
            return { jailedUsers: {}, warnedUsers: {} };
        } else if (dataFile === 'ranks-data.json') {
            return { users: {} };
        }
        return {};
    }

    /**
     * Save guild data
     */
    saveGuildData(guildId, data, dataFile = 'moderation-data.json') {
        const guildPath = this.ensureGuildDirectory(guildId);
        const dataPath = path.join(guildPath, dataFile);
        
        try {
            fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error(`Error saving ${dataFile} for guild ${guildId}:`, error);
        }
    }

    /**
     * Get guild backup directory
     */
    getGuildBackupPath(guildId) {
        const guildPath = this.ensureGuildDirectory(guildId);
        return path.join(guildPath, 'backups');
    }

    /**
     * Get all configured guilds
     */
    getAllGuilds() {
        try {
            const files = fs.readdirSync(this.baseDataPath);
            return files.filter(file => {
                const filePath = path.join(this.baseDataPath, file);
                return fs.statSync(filePath).isDirectory();
            });
        } catch (error) {
            return [];
        }
    }
}

module.exports = GuildConfigManager;
