// Shared between the login page (server action) and the client-side
// "Connect Twitch" helper — keep in sync with the mobile app's
// signInWithTwitch scopes (StreamHub src/services/authService.ts).
//
// user:read:follows is required by the import-twitch-follows edge function
// (Twitch /helix/channels/followed); without it the import silently returns
// zero follows.
export const TWITCH_IMPORT_SCOPES = 'user:read:email user:read:follows';
