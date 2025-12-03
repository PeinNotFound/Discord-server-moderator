const { checkClanCategory } = require('../../modules/clans.js');

module.exports = {
    name: 'moveclan',
    description: '[Leader] Move all clan members to your voice channel',
    usage: '&moveclan',
    permission: 'member',
    
    async execute(message, args, client) {
        const guildConfig = client.getGuildConfig(message.guild.id);
        const categoryCheck = checkClanCategory(message, guildConfig);
        if (!categoryCheck.allowed) return message.reply(categoryCheck.message);

        const clanManager = client.clanManagers.get(message.guild.id);
        const clan = clanManager.getClanByMember(message.author.id);

        if (!clan) return message.reply('❌ You are not in a clan!');
        if (!clanManager.isLeader(clan.id, message.author.id)) {
            return message.reply('❌ Only the clan leader can move all members!');
        }

        const leaderVoice = message.member.voice.channel;
        if (!leaderVoice) {
            return message.reply('❌ You must be in a voice channel to use this command!');
        }

        let moved = 0;
        let failed = 0;

        for (const memberId of clan.members) {
            if (memberId === message.author.id) continue; // Skip leader

            try {
                const member = await message.guild.members.fetch(memberId);
                if (member.voice.channel) {
                    await member.voice.setChannel(leaderVoice);
                    moved++;
                }
            } catch (error) {
                failed++;
            }
        }

        return message.reply(`✅ Moved **${moved}** members to your voice channel!${failed > 0 ? `\n⚠️ Failed to move ${failed} members.` : ''}`);
    }
};
