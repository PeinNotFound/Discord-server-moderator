const antiRaid = require('../modules/anti-raid.js');
const verification = require('../modules/verification.js');
const { initClanSystem } = require('../modules/clans.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'clientReady',
    once: true,
    
    async execute(client) {
        console.log(`✅ ${client.user.tag} is online!`);
        console.log(`📊 Serving ${client.guilds.cache.size} servers`);
        client.user.setActivity('Moderating servers', { type: 'WATCHING' });
        
        // Debug: Show configured roles
        console.log('🔧 Configured Roles:');
        console.log(`   Moderator Roles: ${client.config.moderatorRoles.join(', ') || 'None'}`);
        console.log(`   Admin Roles: ${client.config.adminRoles.join(', ') || 'None'}`);
        console.log(`   Voice Moderator Roles: ${client.config.voiceModeratorRoles.join(', ') || 'None'}`);
        console.log(`   Prefix: ${client.config.prefix}`);
        
        // Initialize Anti-Raid Protection
        antiRaid.initAntiRaid(client, client.config);
        
        // Initialize Verification System
        verification.initVerification(client, client.config);
        
        // Initialize Clan System
        initClanSystem(client, client.config);
        
        // Save bot guilds list for dashboard filtering
        saveBotGuilds(client.guilds.cache);
        
        // Save guild channels for each server
        client.guilds.cache.forEach(guild => {
            saveGuildChannels(guild);
        });
        
        console.log('🚀 Bot is fully operational!');
    }
};

function saveBotGuilds(guilds) {
    try {
        const guildDataPath = path.join(__dirname, '..', '..', 'guild-data');
        if (!fs.existsSync(guildDataPath)) {
            fs.mkdirSync(guildDataPath, { recursive: true });
        }
        
        const botGuilds = guilds.map(guild => ({
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            memberCount: guild.memberCount
        }));
        
        const botGuildsPath = path.join(guildDataPath, 'bot-guilds.json');
        fs.writeFileSync(botGuildsPath, JSON.stringify(botGuilds, null, 2));
        
        console.log(`💾 Saved ${botGuilds.length} bot guilds for dashboard filtering`);
    } catch (error) {
        console.error('Failed to save bot guilds:', error);
    }
}

function saveGuildChannels(guild) {
    try {
        const guildPath = path.join(__dirname, '..', '..', 'guild-data', guild.id);
        if (!fs.existsSync(guildPath)) {
            fs.mkdirSync(guildPath, { recursive: true });
        }
        
        const channels = guild.channels.cache
            .filter(ch => ch.type === 0) // Text channels only
            .map(ch => ({
                id: ch.id,
                name: ch.name,
                type: ch.type
            }));
        
        const channelsPath = path.join(guildPath, 'channels.json');
        fs.writeFileSync(channelsPath, JSON.stringify(channels, null, 2));
        
        console.log(`💾 Saved ${channels.length} channels for guild: ${guild.name}`);
    } catch (error) {
        console.error(`Failed to save channels for guild ${guild.id}:`, error);
    }
}
