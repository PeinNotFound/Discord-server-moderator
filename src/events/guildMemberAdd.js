const verification = require('../modules/verification.js');

module.exports = {
    name: 'guildMemberAdd',
    
    async execute(member, client) {
        // Handle verification - give unverified role
        try {
            await verification.handleNewMemberJoin(member);
        } catch (error) {
            console.error('Failed to handle new member join for verification:', error);
        }
    }
};
