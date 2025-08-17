export const isValidYouTubeUrl = (raw: string): boolean => {
  const url = raw.trim();
  const re = /^(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com\/watch\?v=[\w-]+|youtu\.be\/[\w-]+|youtube\.com\/embed\/[\w-]+|youtube-nocookie\.com\/embed\/[\w-]+|youtube\.com\/v\/[\w-]+)$/i;
  return re.test(url);
};

export const normalizeYouTubeUrl = (raw: string): string => {
  const url = raw.trim();
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
};