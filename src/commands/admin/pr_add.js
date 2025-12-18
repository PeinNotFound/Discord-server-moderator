const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'pr_add',
    description: 'Give your managed premium role to a member (Premium Role Owners only)',
    usage: '!pr_add @user',
    permission: 'moderation', // We'll check custom permissions in the execute function

    async execute(message, args, client) {
        // Get target user
        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return await safeReply(message, '❌ Please mention a user to give the premium role to!');
        }

        // Get target member
        const targetMember = await message.guild.members.fetch(targetUser.id);
        if (!targetMember) {
            return await safeReply(message, '❌ User not found in server!');
        }

        // Check if the command user is a premium role owner
        const guildConfig = client.getGuildConfig(message.guild.id);
        const premiumRoleOwners = guildConfig.premiumRoleOwners || {};

        // Find which role this user owns
        let ownedRoleId = null;
        let linkedRoomId = null;

        for (const [roleId, data] of Object.entries(premiumRoleOwners)) {
            // Handle both legacy (string) and new (object) formats
            const ownerId = typeof data === 'object' ? data.ownerId : data;

            if (ownerId === message.author.id) {
                ownedRoleId = roleId;
                if (typeof data === 'object' && data.roomId) {
                    linkedRoomId = data.roomId;
                }
                break;
            }
        }

        if (!ownedRoleId) {
            return await safeReply(message, '❌ You are not assigned as an owner of any premium role!');
        }

        // Check if role exists
        const role = await message.guild.roles.fetch(ownedRoleId);
        if (!role) {
            return await safeReply(message, '❌ Your managed premium role was not found!');
        }

        // Check if target user already has the role
        if (targetMember.roles.cache.has(ownedRoleId)) {
            return await safeReply(message, `❌ <@${targetUser.id}> already has the role <@&${ownedRoleId}>!`);
        }

        try {
            // Add role to target user
            await targetMember.roles.add(role);

            let replyMsg = `✅ Successfully gave <@&${ownedRoleId}> to <@${targetUser.id}>!`;

            // If there's a linked room, add permissions
            if (linkedRoomId) {
                const room = message.guild.channels.cache.get(linkedRoomId);
                if (room) {
                    try {
                        await room.permissionOverwrites.edit(targetUser.id, {
                            ViewChannel: true,
                            Connect: true,
                            Speak: true
                        });
                        replyMsg += `\n🏠 Added access to premium room: ${room.name}`;
                    } catch (roomErr) {
                        console.error('Failed to update room permissions:', roomErr);
                        replyMsg += `\n⚠️ Failed to update room permissions: ${roomErr.message}`;
                    }
                } else {
                    replyMsg += `\n⚠️ Linked room (ID: ${linkedRoomId}) not found!`;
                }
            }

            // Send success message
            await safeReply(message, replyMsg);
        } catch (error) {
            if (error.code === 50013) {
                await safeReply(message, '❌ I don\'t have permission to add roles/perms! Please give me the **Manage Roles** and **Manage Channels** permissions.');
            } else {
                await safeReply(message, `❌ Failed to execute: ${error.message}`);
            }
        }
    }
};