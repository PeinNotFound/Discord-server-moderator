const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'pr_owner',
    description: 'Assign a user as the owner of a premium role (Admin only)',
    usage: '!pr_owner @user @role',
    permission: 'admin',
    
    async execute(message, args, client) {
        if (!client.permissions.hasPermission(message.member, 'admin')) {
            return await safeReply(message, '❌ You don\'t have permission to use this command!');
        }
        
        // Get target user
        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return await safeReply(message, '❌ Please mention a user to assign as premium role owner!');
        }
        
        // Get target member
        const targetMember = await message.guild.members.fetch(targetUser.id);
        if (!targetMember) {
            return await safeReply(message, '❌ User not found in server!');
        }
        
        // Get role
        const roleMention = message.mentions.roles.first();
        let roleId = null;
        
        if (roleMention) {
            roleId = roleMention.id;
        } else {
            // Try to get role by ID from args
            const roleIdArg = args.find(arg => arg.startsWith('<@&') || /^[0-9]+$/.test(arg));
            if (roleIdArg) {
                if (roleIdArg.startsWith('<@&')) {
                    roleId = roleIdArg.slice(3, -1);
                } else {
                    roleId = roleIdArg;
                }
            }
        }
        
        if (!roleId) {
            return await safeReply(message, '❌ Please mention a role or provide a role ID!');
        }
        
        // Check if role exists
        const role = await message.guild.roles.fetch(roleId);
        if (!role) {
            return await safeReply(message, '❌ Role not found!');
        }
        
        // Get guild config
        const guildConfig = client.getGuildConfig(message.guild.id);
        
        // Update premium role owners
        if (!guildConfig.premiumRoleOwners) {
            guildConfig.premiumRoleOwners = {};
        }
        
        guildConfig.premiumRoleOwners[roleId] = targetUser.id;
        
        // Save config
        client.guildConfig.updateGuildConfig(message.guild.id, guildConfig);
        
        // Send success message
        await safeReply(message, `✅ Successfully assigned <@${targetUser.id}> as the owner of role <@&${roleId}>!`);
    }
};