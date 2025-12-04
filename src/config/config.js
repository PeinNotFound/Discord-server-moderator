// Copy this file to config.js and fill in your values
module.exports = {
    // Discord Bot Configuration
    DISCORD_TOKEN: process.env.DISCORD_TOKEN || 'bot_token_here',
    CLIENT_ID: process.env.CLIENT_ID || 'client_id_here',
    
    // Permission Role IDs (comma-separated for multiple roles)
    MODERATOR_ROLES: '1271140354854486232',
    ADMIN_ROLES: '1271146430744100904',
    VOICE_MODERATOR_ROLES: '123',
    
    // Rank System Admin Roles (who can manage points and view all ranks)
    RANK_ADMIN_ROLES: '1271146430744100904',
    
    // Moderation Role IDs
    WARN_ROLE_ID: 'your_warn_role_id_here',
    JAIL_ROLE_ID: 'your_jail_role_id_here',
    MUTED_ROLE_ID: 'your_muted_role_id_here',
    
    // Rank System Role IDs
    TRIAL_STAFF_ROLE_ID: 'your_staff_role_id_here',
    STAFF_ROLE_ID: 'your_staff_role_id_here',
    MODERATOR_ROLE_ID: 'your_moderator_role_id_here',
    HEAD_MODERATOR_ROLE_ID: 'your_head_moderator_role_id_here',
    MANAGER_ROLE_ID: 'your_manager_role_id_here',
    HEAD_MANAGER_ROLE_ID: 'your_head_manager_role_id_here',
    ADMINISTRATOR_ROLE_ID: 'your_administrator_role_id_here',
    
    // Temporary Rooms Category ID (for voice chat management)
    TEMP_ROOMS_CATEGORY_ID: 'category_id_here',
    
    // Bot Settings
    PREFIX: '!',
    
    // Welcome and Leave Messages
    WELCOME_MESSAGE: 'Welcome {user} to {server}! Enjoy your stay!',
    LEAVE_MESSAGE: 'Goodbye {user}! Thanks for being part of {server}.',
    
    // Welcome and Leave Log Channels
    MEMBER_JOIN_LOG_CHANNEL_ID: 'your_member_join_log_channel_id_here',
    MEMBER_LEAVE_LOG_CHANNEL_ID: 'your_member_leave_log_channel_id_here',
    
    // Separate Log Channels
    JAIL_LOG_CHANNEL_ID: 'your_jail_log_channel_id_here',
    WARN_LOG_CHANNEL_ID: 'your_warn_log_channel_id_here',
    MUTE_LOG_CHANNEL_ID: 'your_mute_log_channel_id_here',
    BAN_LOG_CHANNEL_ID: 'your_ban_log_channel_id_here',
    KICK_LOG_CHANNEL_ID: 'your_kick_log_channel_id_here',
    UNBAN_LOG_CHANNEL_ID: 'your_ban_log_channel_id_here',
    NICKNAME_LOG_CHANNEL_ID: 'your_nickname_log_channel_id_here',
    VOICE_MOD_LOG_CHANNEL_ID: 'your_voice_mod_log_channel_id_here',
    MOVE_LOG_CHANNEL_ID: 'your_move_log_channel_id_here',
    
    // Rank System Log Channel
    RANK_LOG_CHANNEL_ID: 'your_rank_log_channel_id_here'
};