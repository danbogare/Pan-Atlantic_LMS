import { Schema, model, Document, Types } from 'mongoose';

export enum AttemptStatus {
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',       // auto-graded MCQs done, free-text pending review
  GRADED = 'graded',             // all free-text scored, final score locked
}

export interface IAnswer {
  question: Types.ObjectId;
  selectedOption?: string;   // for MULTIPLE_CHOICE
  textAnswer?: string;       // for FREE_TEXT
  pointsAwarded?: number;    // filled on auto-grade (MCQ) or manual grade (free text)
}

export interface IQuizAttempt extends Document {
  student: Types.ObjectId;
  quiz: Types.ObjectId;
  lesson: Types.ObjectId;
  course: Types.ObjectId;
  answers: IAnswer[];
  status: AttemptStatus;
  score?: number; // percentage
  passed?: boolean;
  gradedBy?: Types.ObjectId;
  gradedAt?: Date;
  startedAt: Date;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AnswerSchema = new Schema<IAnswer>(
  {
    question: { type: Schema.Types.ObjectId, required: true },
    selectedOption: { type: String },
    textAnswer: { type: String },
    pointsAwarded: { type: Number },
  },
  { _id: false }
);

const QuizAttemptSchema = new Schema<IQuizAttempt>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    quiz: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    lesson: { type: Schema.Types.ObjectId, ref: 'CourseLesson', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    answers: { type: [AnswerSchema], default: [] },
    status: {
      type: String,
      enum: Object.values(AttemptStatus),
      default: AttemptStatus.IN_PROGRESS,
    },
    score: { type: Number, min: 0, max: 100 },
    passed: { type: Boolean },
    gradedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    gradedAt: { type: Date },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date },
  },
  { timestamps: true }
);

// One active attempt per student per quiz — service enforces "no second in-progress attempt"
QuizAttemptSchema.index({ student: 1, quiz: 1, startedAt: -1 });
QuizAttemptSchema.index({ course: 1, status: 1 });

export const QuizAttempt = model<IQuizAttempt>('QuizAttempt', QuizAttemptSchema);