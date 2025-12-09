const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { safeReply } = require('../../utils/logger.js');

module.exports = {
    name: 'clear',
    description: 'Delete a specified number of messages',
    args: true,
    usage: '<number>',
    permissions: ['ManageMessages'],
    aliases: ['purge', 'sweep', 'clean'],

    async execute(message, args, client) {
        // Check permissions
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return safeReply(message, '❌ You do not have permission to manage messages.');
        }

        const amount = parseInt(args[0]);

        if (isNaN(amount)) {
            return safeReply(message, '❌ Please provide a valid number of messages to delete.');
        } else if (amount < 1 || amount > 100) {
            return safeReply(message, '❌ You can only delete between 1 and 100 messages at a time.');
        }

        try {
            // Delete messages (plus the command message itself usually gets caught in the fetch if not careful, 
            // but bulkDelete handles IDs. We typically delete the command message first or include it)

            // Delete the command message first to be clean
            try { await message.delete(); } catch (e) { }

            const deleted = await message.channel.bulkDelete(amount, true);

            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setDescription(`✅ Successfully deleted **${deleted.size}** messages.`)
                .setFooter({ text: `Action by ${message.author.tag}` });

            const reply = await message.channel.send({ embeds: [embed] });

            // Auto-delete the success message after 3 seconds
            setTimeout(() => {
                reply.delete().catch(() => { });
            }, 3000);

        } catch (error) {
            console.error(error);
            safeReply(message, '❌ There was an error trying to clear messages in this channel! Messages older than 14 days cannot be bulk deleted.');
        }
    }
};
