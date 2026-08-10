import { Schema, model, Document, Types } from 'mongoose';

export interface ILessonProgress extends Document {
  student: Types.ObjectId;
  course: Types.ObjectId;
  lesson: Types.ObjectId;
  module: Types.ObjectId;
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LessonProgressSchema = new Schema<ILessonProgress>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    lesson: { type: Schema.Types.ObjectId, ref: 'CourseLesson', required: true },
    module: { type: Schema.Types.ObjectId, ref: 'CourseModule', required: true },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

LessonProgressSchema.index({ student: 1, lesson: 1 }, { unique: true });
LessonProgressSchema.index({ student: 1, course: 1 });

export const LessonProgress = model<ILessonProgress>('LessonProgress', LessonProgressSchema);