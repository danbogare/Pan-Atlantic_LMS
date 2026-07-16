import multer from 'multer';
import { Request, RequestHandler } from 'express';

// Use memory storage for direct upload to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const allowedDocTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];

  if (allowedImageTypes.includes(file.mimetype) || allowedDocTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`));
  }
};

export const uploadCourseMedia = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
    files: 20, // Max 20 files
  },
});

// Configure fields for course creation
export const uploadCourseFields: RequestHandler = uploadCourseMedia.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'moduleFiles', maxCount: 10 }, // For lesson content files
]);

// For single thumbnail upload
export const uploadThumbnail: RequestHandler = uploadCourseMedia.single('thumbnail');

// For single lesson file upload (pdf, doc, image, etc.)
export const uploadLessonFile: RequestHandler = uploadCourseMedia.single('file');