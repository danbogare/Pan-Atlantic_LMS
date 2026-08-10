import { Schema, model, Document, Types } from 'mongoose';

export interface INote extends Document {
  student: Types.ObjectId;
  course: Types.ObjectId;
  lesson?: Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    lesson: { type: Schema.Types.ObjectId, ref: 'CourseLesson' },
    content: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

NoteSchema.index({ student: 1, course: 1, createdAt: -1 });

export const Note = model<INote>('Note', NoteSchema);