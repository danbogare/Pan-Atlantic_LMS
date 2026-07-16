// services/cloudinary.service.ts
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { ICloudinaryConfig } from '../config/env';

export interface ICloudinaryService {
  uploadImage(file: Express.Multer.File, folder: string): Promise<string>;
  uploadVideo(file: Express.Multer.File, folder: string): Promise<string>;
  uploadDocument(file: Express.Multer.File, folder: string): Promise<string>;
  deleteFile(publicId: string): Promise<void>;
}

export class CloudinaryService implements ICloudinaryService {
  constructor(cloudinaryConfig: ICloudinaryConfig) {
    cloudinary.config({
      cloud_name: cloudinaryConfig.cloudName,
      api_key: cloudinaryConfig.apiKey,
      api_secret: cloudinaryConfig.apiSecret,
    });
  }

  async uploadImage(file: Express.Multer.File, folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `lms/${folder}`,
          resource_type: 'image',
          transformation: [
            { quality: 'auto', fetch_format: 'auto' },
            { width: 1280, height: 720, crop: 'limit' }
          ]
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result!.secure_url);
        }
      );

      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);
      bufferStream.pipe(uploadStream);
    });
  }

  async uploadVideo(file: Express.Multer.File, folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `lms/${folder}`,
          resource_type: 'video',
          eager: [{ streaming_profile: 'hd', format: 'm3u8' }],
          eager_async: true,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result!.secure_url);
        }
      );

      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);
      bufferStream.pipe(uploadStream);
    });
  }

  async uploadDocument(file: Express.Multer.File, folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `lms/${folder}`,
          resource_type: 'raw',
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result!.secure_url);
        }
      );

      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);
      bufferStream.pipe(uploadStream);
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}