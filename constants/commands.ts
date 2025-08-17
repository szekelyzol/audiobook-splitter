export const PACKAGE_MANAGERS = {
  WIN_WINGET: 'winget install -e --id yt-dlp.yt-dlp\nwinget install -e --id Gyan.FFmpeg',
  MAC_BREW: 'brew install yt-dlp ffmpeg'
} as const;