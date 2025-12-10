const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Load configuration
let config;
try {
    config = require('./config/config.js');
    console.log('✅ Config loaded successfully');
} catch (error) {
    console.error('❌ Failed to load config.js:', error.message);
    console.error('Make sure src/config/config.js exists and has valid syntax');
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

// Initialize bot configuration
const botConfig = {
    prefix: config.PREFIX || '!',
    moderatorRoles: config.MODERATOR_ROLES ? config.MODERATOR_ROLES.split(',').map(id => id.trim()) : [],
    adminRoles: config.ADMIN_ROLES ? config.ADMIN_ROLES.split(',').map(id => id.trim()) : [],
    voiceModeratorRoles: config.VOICE_MODERATOR_ROLES ? config.VOICE_MODERATOR_ROLES.split(',').map(id => id.trim()) : [],
    rankAdminRoles: config.RANK_ADMIN_ROLES ? config.RANK_ADMIN_ROLES.split(',').map(id => id.trim()) : [],
    tempRoomsCategoryId: config.TEMP_ROOMS_CATEGORY_ID,
    warnRoleId: config.WARN_ROLE_ID,
    jailRoleId: config.JAIL_ROLE_ID,
    mutedRoleId: config.MUTED_ROLE_ID,
    // Log channels
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

// Initialize utilities
const PermissionManager = require('./utils/permissions.js');
const { Logger } = require('./utils/logger.js');
const DataManager = require('./utils/dataManager.js');
const GuildConfigManager = require('./utils/guildConfigManager.js');

// Initialize guild config manager
client.guildConfig = new GuildConfigManager();
client.permissions = new PermissionManager(config);
client.logger = new Logger(botConfig);
client.dataManager = new DataManager('moderation-data.json');
client.config = botConfig;

// Helper function to get guild-specific config
client.getGuildConfig = function (guildId) {
    return this.guildConfig.loadGuildConfig(guildId);
};

// Helper function to reload guild config (for live updates)
client.reloadGuildConfig = function (guildId) {
    console.log(`🔄 Reloading configuration for guild: ${guildId}`);
    return this.guildConfig.loadGuildConfig(guildId);
};

// Initialize collections
client.commands = new Collection();
client.deletedMessages = new Map();
client.warnedUsers = new Map();
client.jailedUsers = new Map();
client.autoUnmuteTimeouts = new Map();
client.autoUnjailTimeouts = new Map();
client.lockedChannels = new Map();

// Load event handlers
const eventFiles = fs.readdirSync(path.join(__dirname, 'events')).filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
    console.log(`📝 Loaded event: ${event.name}`);
}

// Load command files
const commandFolders = fs.readdirSync(path.join(__dirname, 'commands'));
for (const folder of commandFolders) {
    const commandFiles = fs.readdirSync(path.join(__dirname, 'commands', folder)).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(`./commands/${folder}/${file}`);
        client.commands.set(command.name, command);
        console.log(`⚙️  Loaded command: ${folder}/${command.name}`);
    }
}

// Load persistent data into memory
const persistentData = client.dataManager.getAll();
if (persistentData.warnedUsers) {
    Object.entries(persistentData.warnedUsers).forEach(([userId, warnings]) => {
        client.warnedUsers.set(userId, warnings);
    });
}
if (persistentData.jailedUsers) {
    Object.entries(persistentData.jailedUsers).forEach(([userId, jailData]) => {
        client.jailedUsers.set(userId, jailData);
    });
}

// Connect to dashboard socket for live updates
const io = require('socket.io-client');
const dashboardUrl = config.DASHBOARD_URL || 'http://localhost:3000';
console.log(`🔌 Connecting to dashboard at: ${dashboardUrl}`);
const dashboardSocket = io(dashboardUrl);

dashboardSocket.on('connect', () => {
    console.log('📡 Connected to dashboard server');
});

dashboardSocket.on('embedSendRequest', async (data) => {
    const { guildId, channelId, embed, webhook } = data;
    console.log(`📬 Received embed send request for guild ${guildId}, channel ${channelId}`);

    try {
        const { EmbedBuilder } = require('discord.js');
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            console.error('Guild not found:', guildId);
            return;
        }

        const channel = guild.channels.cache.get(channelId);
        if (!channel) {
            console.error('Channel not found:', channelId);
            return;
        }

        // Check if bot has permission to send messages in the channel
        const permissions = channel.permissionsFor(client.user);
        if (!permissions || !permissions.has('SendMessages')) {
            console.error('Bot does not have permission to send messages in channel:', channelId);
            return;
        }

        // Build Discord embed
        const discordEmbed = new EmbedBuilder();

        if (embed.title) discordEmbed.setTitle(embed.title);
        if (embed.description) discordEmbed.setDescription(embed.description);
        if (embed.color) discordEmbed.setColor(embed.color);
        if (embed.url) discordEmbed.setURL(embed.url);
        if (embed.author) discordEmbed.setAuthor(embed.author);
        if (embed.thumbnail) discordEmbed.setThumbnail(embed.thumbnail.url);
        if (embed.image) discordEmbed.setImage(embed.image.url);
        if (embed.footer) discordEmbed.setFooter(embed.footer);
        if (embed.timestamp) discordEmbed.setTimestamp(new Date(embed.timestamp));
        if (embed.fields && embed.fields.length > 0) discordEmbed.addFields(embed.fields);

        // Send via webhook or normal bot message
        if (webhook && webhook.useWebhook) {
            // Get or create webhook
            const webhooks = await channel.fetchWebhooks();
            let webhook_obj = webhooks.find(wh => wh.owner.id === client.user.id);

            if (!webhook_obj) {
                // Check if bot has permission to create webhooks
                if (!permissions.has('ManageWebhooks')) {
                    console.error('Bot does not have permission to create webhooks in channel:', channelId);
                    // Fall back to normal message sending
                    await channel.send({ embeds: [discordEmbed] });
                    console.log('✅ Embed sent successfully (fallback)');
                    return;
                }

                webhook_obj = await channel.createWebhook({
                    name: webhook.username || 'Bot Webhook',
                    avatar: webhook.avatarURL
                });
            }

            await webhook_obj.send({
                username: webhook.username || 'Webhook',
                avatarURL: webhook.avatarURL,
                embeds: [discordEmbed]
            });
            console.log('✅ Embed sent via webhook');
        } else {
            await channel.send({ embeds: [discordEmbed] });
            console.log('✅ Embed sent successfully');
        }
    } catch (error) {
        console.error('Failed to send embed:', error);
    }
});

dashboardSocket.on('configUpdated', (data) => {
    const { guildId, config } = data;
    console.log(`🔄 Configuration updated for guild ${guildId}`);

    // Update local cache if needed
    if (client.config) {
        // Map guild config keys back to bot config keys if they overlap
        if (config.prefix) client.config.prefix = config.prefix;
        if (config.moderatorRoles) client.config.moderatorRoles = config.moderatorRoles;
        // Add other mappings as necessary
    }
});

// Login to Discord
client.login(config.DISCORD_TOKEN);
