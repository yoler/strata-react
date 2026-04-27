export const IMAGE_UPLOAD_MAX_FILES = 3;
export const IMAGE_UPLOAD_MAX_FILE_SIZE = 5 * 1024 * 1024;
export const IMAGE_UPLOAD_ACCEPTED_MIME_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;
export const IMAGE_UPLOAD_ACCEPTED_MIME_TYPE_SET = new Set<string>(IMAGE_UPLOAD_ACCEPTED_MIME_TYPES);
