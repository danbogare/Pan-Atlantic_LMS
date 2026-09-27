import { Schema, model, Document, Types } from 'mongoose';

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  FREE_TEXT = 'free_text',
}

export interface IOption {
  key: string; // "A", "B", "C", "D"
  text: string;
}

export interface IQuestion {
  _id: Types.ObjectId;
  text: string;
  type: QuestionType;
  options?: IOption[]; // required for MULTIPLE_CHOICE
  correctOption?: string; // key of the correct option, e.g. "B"
  points: number;
}

export interface IQuiz extends Document {
  lesson: Types.ObjectId;
  course: Types.ObjectId;
  title: string;
  questions: IQuestion[];
  timeLimit?: number; // minutes
  passingScore: number; // percentage, e.g. 70
  createdAt: Date;
  updatedAt: Date;
}

const OptionSchema = new Schema<IOption>(
  {
    key: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const QuestionSchema = new Schema<IQuestion>({
  text: { type: String, required: true },
  type: {
    type: String,
    enum: Object.values(QuestionType),
    required: true,
  },
  options: {
    type: [OptionSchema],
    validate: {
      validator: function (this: IQuestion, options: IOption[]) {
        if (this.type === QuestionType.MULTIPLE_CHOICE) {
          return Array.isArray(options) && options.length >= 2;
        }
        return true;
      },
      message: 'Multiple choice questions require at least 2 options',
    },
  },
  correctOption: {
    type: String,
    validate: {
      validator: function (this: IQuestion, value: string) {
        if (this.type === QuestionType.MULTIPLE_CHOICE) {
          return !!value && this.options?.some((o) => o.key === value);
        }
        return true;
      },
      message: 'correctOption must match one of the provided option keys',
    },
  },
  points: { type: Number, required: true, min: 1, default: 1 },
});

const QuizSchema = new Schema<IQuiz>(
  {
    lesson: { type: Schema.Types.ObjectId, ref: 'CourseLesson', required: true, unique: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true },
    questions: {
      type: [QuestionSchema],
      validate: {
        validator: (q: IQuestion[]) => q.length > 0,
        message: 'A quiz must have at least one question',
      },
    },
    timeLimit: { type: Number, min: 1 },
    passingScore: { type: Number, required: true, min: 0, max: 100, default: 70 },
  },
  { timestamps: true }
);

QuizSchema.index({ course: 1 });

export const Quiz = model<IQuiz>('Quiz', QuizSchema);