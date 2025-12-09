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

        // Restore Jail Timeouts
        restoreJailTimeouts(client);

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

function restoreJailTimeouts(client) {
    console.log('🔄 Restoring jail timeouts...');
    const data = client.dataManager.getAll();
    if (!data.jailedUsers) return;

    let restoredCount = 0;
    const now = Date.now();

    Object.entries(data.jailedUsers).forEach(async ([userId, jailData]) => {
        const guild = client.guilds.cache.get(jailData.guildId);
        if (!guild) return;

        const remainingTime = jailData.jailTime - now;

        if (remainingTime <= 0) {
            // Time expired while bot was offline - unjail immediately
            console.log(`⏰ Jail time expired for user ${userId}, unjailing now...`);
            await unjailUser(client, guild, userId);
        } else {
            // Set timeout for remaining time
            console.log(`⏳ Restoring jail timer for ${userId}: ${Math.round(remainingTime / 1000 / 60)}m remaining`);

            // Clear existing timeout if any
            if (client.autoUnjailTimeouts.has(userId)) {
                clearTimeout(client.autoUnjailTimeouts.get(userId));
            }

            const timeoutId = setTimeout(async () => {
                await unjailUser(client, guild, userId);
            }, remainingTime);

            client.autoUnjailTimeouts.set(userId, timeoutId);
            restoredCount++;
        }
    });

    console.log(`✅ Restored ${restoredCount} jail timers`);
}

async function unjailUser(client, guild, userId) {
    try {
        const member = await guild.members.fetch(userId).catch(() => null);

        // Get jail role
        let jailRole;
        if (client.config.jailRoleId && client.config.jailRoleId !== 'your_jail_role_id_here') {
            jailRole = guild.roles.cache.get(client.config.jailRoleId);
        } else {
            jailRole = guild.roles.cache.find(role => role.name === 'Jailed');
        }

        if (!jailRole) {
            console.error(`❌ Jail role not found for guild ${guild.name}`);
            return;
        }

        // Remove from database first to prevent loop
        const data = client.dataManager.getAll();
        const jailData = data.jailedUsers[userId]; // Get data before deleting
        delete data.jailedUsers[userId];
        client.dataManager.save();
        client.autoUnjailTimeouts.delete(userId);

        if (!member) {
            console.log(`⚠️ User ${userId} not found in guild, removed from jail DB only.`);
            return;
        }

        // Remove jail role
        if (member.roles.cache.has(jailRole.id)) {
            await member.roles.remove(jailRole);
        }

        // Restore roles
        if (jailData && jailData.originalRoles && jailData.originalRoles.length > 0) {
            const rolesToRestore = [];
            for (const roleId of jailData.originalRoles) {
                const role = guild.roles.cache.get(roleId);
                if (role && role.id !== guild.id) { // explicit safety check
                    rolesToRestore.push(role);
                }
            }

            if (rolesToRestore.length > 0) {
                await member.roles.add(rolesToRestore);
            }
        }

        // Log action (if logger available)
        if (client.logger) {
            await client.logger.logAction(guild, 'UNJAIL', client.user, member, 'Jail time expired (automatic release)');
        }

        console.log(`🔓 Automatically unjailed ${member.user.tag}`);

    } catch (error) {
        console.error(`Failed to auto-unjail user ${userId}:`, error);
    }
}
