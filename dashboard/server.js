// Load environment variables
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const { Server } = require('socket.io');
const http = require('http');
const fs = require('fs');

// Initialize Guild Config Manager
const GuildConfigManager = require('../src/utils/guildConfigManager.js');
const guildConfigManager = new GuildConfigManager();

const DataManager = require('../src/utils/dataManager.js');
const dataManager = new DataManager('moderation-data.json');

// Load config
let config;
try {
    config = require('../src/config/config.js');
    console.log('✅ Bot config loaded');
    console.log('📋 CLIENT_ID:', config.CLIENT_ID);
} catch (error) {
    console.error('❌ Failed to load bot config.js');
    console.error('Error:', error.message);
    console.error('\n⚠️  Make sure src/config/config.js exists!');
    console.error('Copy src/config/config.example.js to src/config/config.js\n');
    process.exit(1);
}

// Load verification config if it exists
let verificationConfig = {};
try {
    verificationConfig = require('../src/config/verification-config.js');
    console.log('✅ Verification config loaded');
} catch (error) {
    console.log('⚠️  Verification config not found - verification features disabled');
}

// Dashboard configuration
const DASHBOARD_CONFIG = {
    port: process.env.DASHBOARD_PORT || 3000,
    host: '0.0.0.0',
    sessionSecret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    discordClientId: config.CLIENT_ID,
    discordClientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    callbackURL: process.env.CALLBACK_URL || 'http://localhost:3000/callback',
    useAuth: process.env.USE_AUTH === 'true' // Optional OAuth - disabled by default for testing
};

// Show warning if OAuth is disabled
if (!DASHBOARD_CONFIG.useAuth) {
    console.log('⚠️  OAuth is DISABLED - Dashboard is open for testing');
    console.log('💡 Set USE_AUTH=true in .env to enable Discord login\n');
} else {
    console.log('✅ OAuth is ENABLED');
    console.log('🔐 Client ID:', DASHBOARD_CONFIG.discordClientId);
    console.log('🔗 Callback URL:', DASHBOARD_CONFIG.callbackURL);
    console.log('⚠️  Make sure this EXACT URL is in Discord Developer Portal!\n');
}

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session configuration
app.use(session({
    secret: DASHBOARD_CONFIG.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Discord OAuth Strategy - Request guilds scope to get user's servers
passport.use(new DiscordStrategy({
    clientID: DASHBOARD_CONFIG.discordClientId,
    clientSecret: DASHBOARD_CONFIG.discordClientSecret,
    callbackURL: DASHBOARD_CONFIG.callbackURL,
    scope: ['identify', 'guilds'] // Added guilds scope to get user's servers
}, (accessToken, refreshToken, profile, done) => {
    // Filter guilds to only include those where the user has ADMINISTRATOR permission (0x8)
    if (profile.guilds) {
        profile.guilds = profile.guilds.filter(guild =>
            (guild.permissions & 0x8) === 0x8 // Check for Administrator permission
        );
    }
    return done(null, profile);
}));

// Auth middleware
function ensureAuthenticated(req, res, next) {
    // If OAuth is disabled, allow access
    if (!DASHBOARD_CONFIG.useAuth) {
        req.user = req.user || { id: 'test-user', username: 'Test User', avatar: '', guilds: [] };
        return next();
    }

    // Otherwise require authentication
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
}

// Routes
app.get('/', (req, res) => {
    // If OAuth disabled, redirect directly to dashboard
    if (!DASHBOARD_CONFIG.useAuth) {
        return res.redirect('/dashboard');
    }
    res.render('index', { user: req.user });
});

app.get('/login', passport.authenticate('discord'));

app.get('/callback',
    passport.authenticate('discord', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect('/dashboard');
    }
);

app.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

// Helper function to get all config keys
function getAllConfigKeys() {
    const mainConfigKeys = Object.keys(config).filter(key =>
        !['DISCORD_TOKEN', 'CLIENT_ID'].includes(key) // Exclude sensitive keys
    );

    const verificationConfigKeys = Object.keys(verificationConfig).filter(key =>
        key !== 'VERIFICATION_ROOMS' // We'll handle this separately
    );

    return {
        main: mainConfigKeys,
        verification: verificationConfigKeys,
        verificationRooms: verificationConfig.VERIFICATION_ROOMS || []
    };
}

// Helper function to update config file while preserving structure
function updateConfigFile(filePath, newConfig) {
    try {
        // Read the existing file content
        let fileContent = fs.readFileSync(filePath, 'utf8');

        // Update each config value in the file
        Object.keys(newConfig).forEach(key => {
            const value = newConfig[key];
            let formattedValue;

            // Handle different value types
            if (typeof value === 'string') {
                formattedValue = `'${value}'`;
            } else if (Array.isArray(value)) {
                formattedValue = '[\n' + value.map(item => `        '${item}'`).join(',\n') + '\n    ]';
            } else if (typeof value === 'number') {
                formattedValue = value;
            } else {
                formattedValue = `'${value}'`; // Default to string
            }

            // Create regex pattern to match the config line
            // Match: KEY: 'value' OR KEY: 'value1,value2' OR KEY: 'value1','value2'
            const regex = new RegExp(`(${key}:\\s*)('[^']*'(?:,\\s*'[^']*')*)`, 'g');
            fileContent = fileContent.replace(regex, `$1${formattedValue}`);
        });

        // Write the updated content back to the file
        fs.writeFileSync(filePath, fileContent);
        return true;
    } catch (error) {
        console.error('Failed to update config file:', error);
        return false;
    }
}

app.get('/dashboard', ensureAuthenticated, (req, res) => {
    // Load bot data
    // Load bot data handles
    // DataManager is now loaded globally
    const data = dataManager.getAll();

    // Get all config keys for the UI
    const configKeys = getAllConfigKeys();

    // Load bot guilds from file
    let botGuilds = [];
    const botGuildsPath = path.join(__dirname, '..', 'guild-data', 'bot-guilds.json');
    if (fs.existsSync(botGuildsPath)) {
        try {
            const botGuildsData = fs.readFileSync(botGuildsPath, 'utf8');
            botGuilds = JSON.parse(botGuildsData);
        } catch (error) {
            console.error('Failed to load bot guilds:', error);
        }
    }

    // Get bot guild IDs for filtering
    const botGuildIds = botGuilds.map(g => g.id);

    // Filter guilds to only include those where:
    // 1. The user has administrative privileges
    // 2. The bot is present in the server
    let userGuilds = [];
    if (req.user.guilds) {
        userGuilds = req.user.guilds.filter(guild =>
            (guild.permissions & 0x8) === 0x8 && // Check for Administrator permission
            botGuildIds.includes(guild.id) // Bot must be in the server
        );
    }

    // Process Premium Rooms Data for display
    // We need to pass this safely to the view
    const premiumRoomsData = [];
    if (config.premiumRoleOwners) {
        // This is global config - for guild specific we should look at guild config
        // But the dashboard currently seems to focus on global config or mixes them?
        // The dashboard view uses 'config' object passed below.

        // Let's format the data for the view
        for (const [roleId, data] of Object.entries(config.premiumRoleOwners)) {
            const ownerId = typeof data === 'object' ? data.ownerId : data;
            const roomId = typeof data === 'object' ? data.roomId : null;

            premiumRoomsData.push({
                roleId: roleId,
                ownerId: ownerId,
                roomId: roomId
            });
        }
    }

    res.render('dashboard', {
        user: {
            ...req.user,
            guilds: userGuilds
        },
        stats: {
            warnedUsers: Object.keys(data.warnedUsers || {}).length,
            jailedUsers: Object.keys(data.jailedUsers || {}).length
        },
        config: {
            prefix: config.PREFIX || '!',
            moderatorRoles: config.MODERATOR_ROLES || '',
            adminRoles: config.ADMIN_ROLES || '',
            main: config,
            verification: verificationConfig,
            keys: configKeys,
            premiumRooms: premiumRoomsData
        }
    });
});

// API Routes for live updates - Guild-specific stats
app.get('/api/stats/:guildId', ensureAuthenticated, (req, res) => {
    const { guildId } = req.params;

    // Load guild-specific data
    const data = guildConfigManager.loadGuildData(guildId, 'moderation-data.json');

    res.json({
        warnedUsers: Object.keys(data.warnedUsers || {}).length,
        jailedUsers: Object.keys(data.jailedUsers || {}).length,
        timestamp: Date.now()
    });
});

// Legacy stats endpoint (uses global data)
app.get('/api/stats', ensureAuthenticated, (req, res) => {
    const DataManager = require('../src/utils/dataManager.js');
    const dataManager = new DataManager('moderation-data.json');
    const data = dataManager.getAll();

    res.json({
        warnedUsers: Object.keys(data.warnedUsers || {}).length,
        jailedUsers: Object.keys(data.jailedUsers || {}).length,
        timestamp: Date.now()
    });
});

app.get('/api/modactions', ensureAuthenticated, (req, res) => {
    const fs = require('fs');
    const path = require('path');

    const logFile = path.join(__dirname, '..', 'src', 'logs', 'moderation-actions.json');

    if (!fs.existsSync(logFile)) {
        return res.json({ actions: [] });
    }

    try {
        const data = fs.readFileSync(logFile, 'utf8');
        const actions = JSON.parse(data);

        // Sort by timestamp (newest first)
        actions.sort((a, b) => b.timestamp - a.timestamp);

        // Limit to last 50 actions
        const limitedActions = actions.slice(0, 50);

        res.json({ actions: limitedActions });
    } catch (error) {
        console.error('Failed to read mod actions:', error);
        res.json({ actions: [] });
    }
});

// Moderation API endpoints
app.post('/api/moderate/warn', ensureAuthenticated, async (req, res) => {
    // In a real implementation, this would interact with the bot
    res.json({ success: true, message: 'Warning issued' });
});

app.post('/api/moderate/mute', ensureAuthenticated, async (req, res) => {
    res.json({ success: true, message: 'User muted' });
});

app.post('/api/moderate/kick', ensureAuthenticated, async (req, res) => {
    res.json({ success: true, message: 'User kicked' });
});

app.post('/api/moderate/ban', ensureAuthenticated, async (req, res) => {
    res.json({ success: true, message: 'User banned' });
});

// API endpoint to get guild-specific configuration
app.get('/api/config/:guildId', ensureAuthenticated, (req, res) => {
    const { guildId } = req.params;

    // Load guild-specific config
    const guildConfig = guildConfigManager.loadGuildConfig(guildId);

    // Load main config
    const mainConfig = config;

    res.json({
        guildId: guildId,
        guildConfig: guildConfig,
        mainConfig: mainConfig,
        keys: {
            guild: Object.keys(guildConfig),
            main: Object.keys(mainConfig).filter(key => !['DISCORD_TOKEN', 'CLIENT_ID'].includes(key))
        }
    });
});

// API endpoint to get all available commands
app.get('/api/commands', ensureAuthenticated, (req, res) => {
    const commandsPath = path.join(__dirname, '..', 'src', 'commands');
    const commandsList = [];

    try {
        const folders = fs.readdirSync(commandsPath);

        for (const folder of folders) {
            const folderPath = path.join(commandsPath, folder);
            if (fs.statSync(folderPath).isDirectory()) {
                const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

                for (const file of files) {
                    try {
                        const command = require(path.join(folderPath, file));
                        commandsList.push({
                            name: command.name,
                            description: command.description || 'No description',
                            category: folder,
                            permission: command.permission || 'none',
                            usage: command.usage || `!${command.name}`
                        });
                    } catch (error) {
                        console.error(`Error loading command ${file}:`, error.message);
                    }
                }
            }
        }

        res.json({ commands: commandsList });
    } catch (error) {
        console.error('Failed to load commands:', error);
        res.json({ commands: [] });
    }
});

// API endpoint to get guild command settings
app.get('/api/commands/:guildId', ensureAuthenticated, (req, res) => {
    const { guildId } = req.params;
    const guildConfig = guildConfigManager.loadGuildConfig(guildId);

    res.json({
        disabledCommands: guildConfig.disabledCommands || [],
        commandAliases: guildConfig.commandAliases || {}
    });
});

// API endpoint to get guild channels
app.get('/api/channels/:guildId', ensureAuthenticated, async (req, res) => {
    const { guildId } = req.params;

    try {
        // In production, you'd fetch channels from Discord API
        // For now, return empty array - will be populated when bot connects
        const channelsPath = path.join(__dirname, '..', 'guild-data', guildId, 'channels.json');

        if (fs.existsSync(channelsPath)) {
            const data = fs.readFileSync(channelsPath, 'utf8');
            const channels = JSON.parse(data);
            res.json({ channels });
        } else {
            res.json({ channels: [] });
        }
    } catch (error) {
        console.error('Failed to load channels:', error);
        res.json({ channels: [] });
    }
});

// API endpoint to send embed message
app.post('/api/embed/:guildId/send', ensureAuthenticated, async (req, res) => {
    const { guildId } = req.params;
    const { channelId, embed, webhook } = req.body;

    try {
        // Store the embed send request
        const embedRequestPath = path.join(__dirname, '..', 'guild-data', guildId, 'embed-requests.json');
        const guildPath = path.join(__dirname, '..', 'guild-data', guildId);

        if (!fs.existsSync(guildPath)) {
            fs.mkdirSync(guildPath, { recursive: true });
        }

        let requests = [];
        if (fs.existsSync(embedRequestPath)) {
            requests = JSON.parse(fs.readFileSync(embedRequestPath, 'utf8'));
        }

        requests.push({
            channelId,
            embed,
            webhook,
            timestamp: Date.now(),
            status: 'pending'
        });

        fs.writeFileSync(embedRequestPath, JSON.stringify(requests, null, 2));

        // Emit event for bot to process
        io.emit('embedSendRequest', { guildId, channelId, embed, webhook });

        res.json({ success: true, message: 'Embed message queued for sending. Check bot console for delivery status.' });
    } catch (error) {
        console.error('Failed to queue embed:', error);
        res.json({ success: false, message: 'Failed to send embed' });
    }
});

// API endpoint to update guild command settings
app.post('/api/commands/:guildId/update', ensureAuthenticated, (req, res) => {
    const { guildId } = req.params;
    const { disabledCommands, commandAliases } = req.body;

    console.log(`[DEBUG] Updating commands for guild ${guildId}`);
    console.log(`[DEBUG] Received aliases payload:`, JSON.stringify(commandAliases, null, 2));

    try {
        const guildConfig = guildConfigManager.loadGuildConfig(guildId);

        if (disabledCommands !== undefined) {
            guildConfig.disabledCommands = disabledCommands;
        }

        if (commandAliases !== undefined) {
            guildConfig.commandAliases = commandAliases;
        }

        guildConfigManager.saveGuildConfig(guildId, guildConfig);

        res.json({
            success: true,
            message: 'Command settings updated successfully'
        });
    } catch (error) {
        console.error('Failed to update command settings:', error);
        res.json({ success: false, message: 'Failed to update command settings' });
    }
});

// API endpoint to get all configuration (legacy)
app.get('/api/config', ensureAuthenticated, (req, res) => {
    res.json({
        main: config,
        verification: verificationConfig,
        keys: getAllConfigKeys()
    });
});

// API endpoint to update guild-specific configuration
app.post('/api/config/:guildId/update', ensureAuthenticated, (req, res) => {
    const { guildId } = req.params;
    const { config: newConfig } = req.body;

    try {
        // Update guild config
        const updatedConfig = guildConfigManager.updateGuildConfig(guildId, newConfig);

        // Emit configuration update event via WebSocket
        io.emit('configUpdated', { guildId, config: updatedConfig });

        res.json({
            success: true,
            message: 'Guild configuration updated successfully',
            config: updatedConfig
        });
    } catch (error) {
        console.error('Failed to update guild config:', error);
        res.json({ success: false, message: 'Failed to update configuration' });
    }
});

// API endpoint to update configuration (legacy)
app.post('/api/config/update', ensureAuthenticated, (req, res) => {
    const { type, config: newConfig } = req.body;

    try {
        let configPath;
        let currentConfig;

        // Determine which config file to update
        if (type === 'main') {
            configPath = path.join(__dirname, '..', 'src', 'config', 'config.js');
            currentConfig = config;
        } else if (type === 'verification') {
            configPath = path.join(__dirname, '..', 'src', 'config', 'verification-config.js');
            currentConfig = verificationConfig;
        } else {
            return res.json({ success: false, message: 'Invalid config type' });
        }

        // Update the config file
        const success = updateConfigFile(configPath, newConfig);

        if (success) {
            // Update the in-memory config
            if (type === 'main') {
                Object.assign(config, newConfig);
            } else if (type === 'verification') {
                Object.assign(verificationConfig, newConfig);
            }

            res.json({ success: true, message: 'Config updated successfully' });
        } else {
            res.json({ success: false, message: 'Failed to update config file' });
        }
    } catch (error) {
        console.error('Failed to update config:', error);
        res.json({ success: false, message: 'Failed to update config' });
    }
});

// WebSocket for real-time updates
io.on('connection', (socket) => {
    console.log('📱 Dashboard client connected');

    socket.on('disconnect', () => {
        console.log('📱 Dashboard client disconnected');
    });

    // Emit stats update every 5 seconds
    const statsInterval = setInterval(() => {
        const DataManager = require('../src/utils/dataManager.js');
        const dataManager = new DataManager('moderation-data.json');
        const data = dataManager.getAll();

        socket.emit('statsUpdate', {
            warnedUsers: Object.keys(data.warnedUsers || {}).length,
            jailedUsers: Object.keys(data.jailedUsers || {}).length
        });
    }, 5000);

    socket.on('disconnect', () => {
        clearInterval(statsInterval);
    });
});

// Start server
server.listen(DASHBOARD_CONFIG.port, DASHBOARD_CONFIG.host, () => {
    console.log('🌐 ===============================================');
    console.log('🌐 Discord Bot Dashboard Started!');
    console.log('🌐 ===============================================');
    console.log(`🌐 Local:    http://localhost:${DASHBOARD_CONFIG.port}`);
    console.log(`🌐 Network:  http://YOUR_SERVER_IP:${DASHBOARD_CONFIG.port}`);
    console.log('🌐 ===============================================');
    console.log('🔐 Login with Discord to access dashboard');
    console.log('🌐 ===============================================');
});