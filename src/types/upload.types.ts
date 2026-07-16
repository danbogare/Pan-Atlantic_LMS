// For file validation (used in middleware, not Zod)
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
];

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB