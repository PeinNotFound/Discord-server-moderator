const fs = require('fs');
const path = require('path');
const { PermissionFlagsBits } = require('discord.js');

class ClanManager {
    constructor(guildId) {
        this.guildId = guildId;
        this.dataPath = path.join(__dirname, '..', 'guild-data', guildId, 'clans-data.json');
        this.ensureDataFile();
    }

    ensureDataFile() {
        const dir = path.dirname(this.dataPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(this.dataPath)) {
            this.saveData({ clans: {} });
        }
    }

    loadData() {
        try {
            const data = fs.readFileSync(this.dataPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Failed to load clan data:', error);
            return { clans: {} };
        }
    }

    saveData(data) {
        try {
            fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Failed to save clan data:', error);
        }
    }

    // Create a new clan
    async createClan(guild, leaderMember, clanName, config) {
        const data = this.loadData();
        const clanId = `clan_${Date.now()}`;

        try {
            // Create clan role
            const clanRole = await guild.roles.create({
                name: `[${clanName}]`,
                color: 0x5865F2,
                mentionable: true,
                reason: `Clan created by ${leaderMember.user.tag}`
            });

            // Create text channel in text category
            const textChannel = await guild.channels.create({
                name: `${clanName.toLowerCase().replace(/\s+/g, '-')}`,
                type: 0, // Text channel
                parent: config.clanTextCategoryId,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: clanRole.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory
                        ]
                    }
                ],
                reason: `Clan channel for ${clanName}`
            });

            // Create voice channel in voice category
            const voiceChannel = await guild.channels.create({
                name: `${clanName} VC`,
                type: 2, // Voice channel
                parent: config.clanVoiceCategoryId,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: clanRole.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.Connect,
                            PermissionFlagsBits.Speak
                        ]
                    }
                ],
                reason: `Clan voice channel for ${clanName}`
            });

            // Add role to leader
            await leaderMember.roles.add(clanRole);

            // Save clan data
            data.clans[clanId] = {
                id: clanId,
                name: clanName,
                tag: '',
                leaderId: leaderMember.id,
                coLeaders: [],
                members: [leaderMember.id],
                roleId: clanRole.id,
                textChannelId: textChannel.id,
                voiceChannelId: voiceChannel.id,
                chatManagers: [],
                mutedMembers: [],
                createdAt: Date.now()
            };

            this.saveData(data);
            return { success: true, clan: data.clans[clanId] };
        } catch (error) {
            console.error('Failed to create clan:', error);
            return { success: false, error: error.message };
        }
    }

    // Get clan by member ID
    getClanByMember(memberId) {
        const data = this.loadData();
        for (const clanId in data.clans) {
            const clan = data.clans[clanId];
            if (clan.members.includes(memberId)) {
                return clan;
            }
        }
        return null;
    }

    // Get clan by ID
    getClan(clanId) {
        const data = this.loadData();
        return data.clans[clanId] || null;
    }

    // Check if user is leader
    isLeader(clanId, memberId) {
        const clan = this.getClan(clanId);
        return clan && clan.leaderId === memberId;
    }

    // Check if user is co-leader
    isCoLeader(clanId, memberId) {
        const clan = this.getClan(clanId);
        return clan && clan.coLeaders.includes(memberId);
    }

    // Check if user has leadership (leader or co-leader)
    hasLeadership(clanId, memberId) {
        return this.isLeader(clanId, memberId) || this.isCoLeader(clanId, memberId);
    }

    // Add member to clan
    async addMember(guild, clanId, memberId) {
        const data = this.loadData();
        const clan = data.clans[clanId];
        
        if (!clan) return { success: false, error: 'Clan not found' };
        if (clan.members.includes(memberId)) return { success: false, error: 'Member already in clan' };

        try {
            const member = await guild.members.fetch(memberId);
            const role = await guild.roles.fetch(clan.roleId);
            
            await member.roles.add(role);
            clan.members.push(memberId);
            
            this.saveData(data);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Remove member from clan
    async removeMember(guild, clanId, memberId) {
        const data = this.loadData();
        const clan = data.clans[clanId];
        
        if (!clan) return { success: false, error: 'Clan not found' };
        if (!clan.members.includes(memberId)) return { success: false, error: 'Member not in clan' };

        try {
            const member = await guild.members.fetch(memberId);
            const role = await guild.roles.fetch(clan.roleId);
            
            await member.roles.remove(role);
            clan.members = clan.members.filter(id => id !== memberId);
            clan.coLeaders = clan.coLeaders.filter(id => id !== memberId);
            clan.chatManagers = clan.chatManagers.filter(id => id !== memberId);
            
            this.saveData(data);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Set clan tag
    setClanTag(clanId, tag) {
        const data = this.loadData();
        const clan = data.clans[clanId];
        
        if (!clan) return { success: false, error: 'Clan not found' };
        
        clan.tag = tag;
        this.saveData(data);
        return { success: true };
    }

    // Add co-leader
    addCoLeader(clanId, memberId) {
        const data = this.loadData();
        const clan = data.clans[clanId];
        
        if (!clan) return { success: false, error: 'Clan not found' };
        if (!clan.members.includes(memberId)) return { success: false, error: 'Member not in clan' };
        if (clan.coLeaders.includes(memberId)) return { success: false, error: 'Already a co-leader' };
        
        clan.coLeaders.push(memberId);
        this.saveData(data);
        return { success: true };
    }

    // Remove co-leader
    removeCoLeader(clanId, memberId) {
        const data = this.loadData();
        const clan = data.clans[clanId];
        
        if (!clan) return { success: false, error: 'Clan not found' };
        if (!clan.coLeaders.includes(memberId)) return { success: false, error: 'Not a co-leader' };
        
        clan.coLeaders = clan.coLeaders.filter(id => id !== memberId);
        this.saveData(data);
        return { success: true };
    }

    // Delete clan
    async deleteClan(guild, clanId) {
        const data = this.loadData();
        const clan = data.clans[clanId];
        
        if (!clan) return { success: false, error: 'Clan not found' };

        try {
            // Delete role
            const role = await guild.roles.fetch(clan.roleId);
            if (role) await role.delete();

            // Delete channels
            const textChannel = await guild.channels.fetch(clan.textChannelId);
            if (textChannel) await textChannel.delete();

            const voiceChannel = await guild.channels.fetch(clan.voiceChannelId);
            if (voiceChannel) await voiceChannel.delete();

            // Remove from data
            delete data.clans[clanId];
            this.saveData(data);
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Get all clans
    getAllClans() {
        const data = this.loadData();
        return data.clans;
    }

    // Get clan stats
    getClanStats(clanId) {
        const clan = this.getClan(clanId);
        if (!clan) return null;

        return {
            name: clan.name,
            tag: clan.tag,
            memberCount: clan.members.length,
            coLeaderCount: clan.coLeaders.length,
            createdAt: clan.createdAt
        };
    }
}

// Initialize clan system for a guild
function initClanSystem(client, config) {
    console.log('🏰 Clan System Initialized');
    
    // Store clan managers for each guild
    client.clanManagers = new Map();
    
    // Create manager for each guild
    client.guilds.cache.forEach(guild => {
        client.clanManagers.set(guild.id, new ClanManager(guild.id));
    });
}

// Helper function to check if command is in clan category
function checkClanCategory(message, guildConfig) {
    if (!guildConfig.clanSystemEnabled) {
        return { allowed: false, message: '⚠️ Clan system is not enabled on this server.' };
    }

    const parentId = message.channel.parentId;
    const isTextCategory = parentId === guildConfig.clanTextCategoryId;
    const isVoiceCategory = parentId === guildConfig.clanVoiceCategoryId;

    if (!isTextCategory && !isVoiceCategory) {
        return { allowed: false, message: '❌ Clan commands can only be used in clan channels!' };
    }

    return { allowed: true };
}

module.exports = { ClanManager, initClanSystem, checkClanCategory };
