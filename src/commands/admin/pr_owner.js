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
            const roleIdArg = args.find(arg => arg.startsWith('<@&') || /^[0-9]+$/.test(arg) && arg !== targetUser.id);
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

        // Get Room ID (optional)
        // We look for a 3rd argument that is a number (ID) but not the user ID or role ID
        let roomId = null;
        const potentialRoomId = args.find(arg =>
            /^[0-9]+$/.test(arg) &&
            arg !== targetUser.id &&
            arg !== roleId
        );

        if (potentialRoomId) {
            const channel = message.guild.channels.cache.get(potentialRoomId);
            if (channel) {
                roomId = potentialRoomId;
            } else {
                return await safeReply(message, `❌ Channel with ID ${potentialRoomId} not found!`);
            }
        }

        // Get guild config
        const guildConfig = client.getGuildConfig(message.guild.id);

        // Update premium role owners
        if (!guildConfig.premiumRoleOwners) {
            guildConfig.premiumRoleOwners = {};
        }

        // Save as object with ownerId and optional roomId
        guildConfig.premiumRoleOwners[roleId] = {
            ownerId: targetUser.id,
            roomId: roomId || null
        };

        // Save config
        client.guildConfig.updateGuildConfig(message.guild.id, guildConfig);

        // Send success message
        let successMsg = `✅ Successfully assigned <@${targetUser.id}> as the owner of role <@&${roleId}>!`;
        if (roomId) {
            successMsg += `\n🏠 Linked Room: <#${roomId}>`;
        }

        await safeReply(message, successMsg);
    }
};