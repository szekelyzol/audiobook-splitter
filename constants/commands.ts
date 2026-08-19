export const PACKAGE_MANAGERS = {
  WIN_WINGET: 'winget install -e --id yt-dlp.yt-dlp\nwinget install -e --id Gyan.FFmpeg\nwinget install -e --id DenoLand.Deno',
  MAC_BREW: 'brew install yt-dlp ffmpeg deno'
} as const;

// YouTube currently blocks yt-dlp's default player client (android_vr) with HTTP 403.
// mweb works without requiring a PO token. This rotates over time as YouTube changes
// what it blocks - see https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide for updates.
export const YT_DLP_CLIENT_ARGS = '--extractor-args "youtube:player_client=mweb"';