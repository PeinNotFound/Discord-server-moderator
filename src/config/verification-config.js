// Copy this file to verification-config.js and fill in your values
// Verification System Configuration
module.exports = {
    // Verification Roles
    VERIFIED_ROLE_ID: 'your_verified_role_id_here', // Male/Neutral verified role
    VERIFIED_FEMALE_ROLE_ID: 'your_verified_female_role_id_here', // Female verified role
    UNVERIFIED_ROLE_ID: 'your_unverified_role_id_here', // Unverified role
    VERIFICATOR_ROLE_ID: 'your_verificator_role_id_here', // Role to ping when someone joins verification room
    
    // Channels
    VERIFICATION_CMD_CHANNEL_ID: 'your_verification_cmd_channel_id_here', // Channel where verification commands work
    VERIFICATION_CHAT_CHANNEL_ID: 'your_verification_chat_channel_id_here', // Channel to ping @unverified hourly
    VERIFICATION_LOG_CHANNEL_ID: 'your_verification_log_channel_id_here', // Channel to log verification actions
    
    // Verification Rooms (voice channels where people get verified)
    // Add as many verification room IDs as needed
    VERIFICATION_ROOMS: [
        'your_verification_room_1_id_here',
        'your_verification_room_2_id_here',
        'your_verification_room_3_id_here',
        'your_verification_room_4_id_here'
    ],
    
    // Settings
    PING_UNVERIFIED_INTERVAL: 3600000 // 1 hour in milliseconds (1000ms * 60s * 60m = 3600000ms)
};

