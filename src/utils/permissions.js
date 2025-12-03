const { PermissionFlagsBits } = require('discord.js');

/**
 * Permission checking utilities
 */

class PermissionManager {
    constructor(config) {
        this.config = config;
        this.moderatorRoles = config.MODERATOR_ROLES ? config.MODERATOR_ROLES.split(',').map(id => id.trim()) : [];
        this.adminRoles = config.ADMIN_ROLES ? config.ADMIN_ROLES.split(',').map(id => id.trim()) : [];
        this.voiceModeratorRoles = config.VOICE_MODERATOR_ROLES ? config.VOICE_MODERATOR_ROLES.split(',').map(id => id.trim()) : [];
        this.rankAdminRoles = config.RANK_ADMIN_ROLES ? config.RANK_ADMIN_ROLES.split(',').map(id => id.trim()) : [];
    }

    hasModeratorRole(member) {
        if (!member || !member.roles) return false;
        return member.roles.cache.some(role => this.moderatorRoles.includes(role.id));
    }

    hasAdminRole(member) {
        if (!member || !member.roles) return false;
        return member.roles.cache.some(role => this.adminRoles.includes(role.id));
    }

    hasVoiceModeratorRole(member) {
        if (!member || !member.roles) return false;
        return member.roles.cache.some(role => this.voiceModeratorRoles.includes(role.id));
    }

    hasRankAdminRole(member) {
        if (!member || !member.roles) return false;
        // Check if user has rank admin role OR is server owner
        if (member.id === member.guild.ownerId) return true;
        return member.roles.cache.some(role => this.rankAdminRoles.includes(role.id));
    }

    hasPermission(member, commandType) {
        if (!member) return false;
        
        // Check if user is server owner (always allow)
        if (member.id === member.guild.ownerId) {
            return true;
        }
        
        // Check configured roles first
        switch (commandType) {
            case 'moderation':
                return this.hasModeratorRole(member) || this.hasAdminRole(member);
            case 'voice':
                return this.hasVoiceModeratorRole(member) || this.hasAdminRole(member);
            case 'admin':
                return this.hasAdminRole(member);
            case 'rank_admin':
                return this.hasRankAdminRole(member);
            default:
                return false;
        }
    }

    isStaffMember(member, botConfig) {
        const staffRoleIds = [
            botConfig.trialStaffRoleId,
            botConfig.staffRoleId,
            botConfig.moderatorRoleId,
            botConfig.headModeratorRoleId,
            botConfig.managerRoleId,
            botConfig.headManagerRoleId,
            botConfig.administratorRoleId
        ].filter(id => id && !id.startsWith('your_'));
        
        return member.roles.cache.some(role => staffRoleIds.includes(role.id));
    }
}

module.exports = PermissionManager;
