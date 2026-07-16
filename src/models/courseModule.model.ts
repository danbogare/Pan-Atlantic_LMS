import { Schema, model, Document, Types } from 'mongoose';

export enum ContentType {
  VIDEO = 'video',
  DOCUMENT = 'document',
  QUIZ = 'quiz',
  ESSAY = 'essay',
  ASSIGNMENT = 'assignment'
}

export interface ICourseModule extends Document {
  title: string;
  description: string;
  course: Types.ObjectId;
  order: number;
  duration: number;
  createdAt: Date;
  updatedAt: Date;
}

const CourseModuleSchema = new Schema<ICourseModule>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    order: { type: Number, required: true, min: 0 },
    duration: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// No two modules in the same course can have the same order number
CourseModuleSchema.index(
  { course: 1, order: 1 }, 
  { unique: true }
);

export interface ICourseLesson extends Document {
  title: string;
  description?: string;
  module: Types.ObjectId;
  course: Types.ObjectId;
  order: number;
  contentType: ContentType;
  contentLink?: string;
  contentFile?: string;
  duration: number;
  isPreview: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LessonSchema = new Schema<ICourseLesson>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    module: { type: Schema.Types.ObjectId, ref: 'CourseModule', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    order: { type: Number, required: true, min: 0 },
    contentType: { 
      type: String, 
      enum: Object.values(ContentType), 
      required: true 
    },
    contentLink: { type: String },
    contentFile: {type: String},

    duration: { type: Number, default: 0, min: 0 },
    isPreview: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// No two lessons in the same module can have the same order number
LessonSchema.index(
  { module: 1, order: 1 }, 
  { unique: true }
);
LessonSchema.index({ course: 1, order: 1 });


export const CourseModule = model<ICourseModule>('CourseModule', CourseModuleSchema);
export const CourseLesson = model<ICourseLesson>('CourseLesson', LessonSchema);