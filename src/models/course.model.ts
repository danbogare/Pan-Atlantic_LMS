import { Schema, model, Document, Types } from 'mongoose';

export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum CourseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum EnrollmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DROPPED = 'dropped',
}

export enum InstructorRole {
  LEAD = 'lead',
  ASSISTANT = 'assistant',
}

export enum AssignmentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

// COURSE SCHEMA
export interface ICourse extends Document {
  title: string;
  description: string;
  thumbnail?: string;
  level: CourseLevel;
  status: CourseStatus;
  duration: number;
  prerequisites?: string[];
  learningObjectives?: string[];
  createdBy: Types.ObjectId;
  publishedAt?: Date;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    thumbnail: { type: String },
    level: { 
      type: String, 
      enum: Object.values(CourseLevel), 
      default: CourseLevel.BEGINNER 
    },
    status: { 
      type: String, 
      enum: Object.values(CourseStatus), 
      default: CourseStatus.DRAFT 
    },
    duration: { type: Number, required: true, min: 0 },
    prerequisites: [{ type: String }],
    learningObjectives: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    publishedAt: { type: Date },
    archivedAt: { type: Date },
  },
  { timestamps: true }
);

CourseSchema.index({ status: 1, createdAt: -1 });
CourseSchema.index({ title: 'text', description: 'text' });

// ENROLLMENT SCHEMA
export interface IEnrollment extends Document {
  student: Types.ObjectId;
  course: Types.ObjectId;
  enrolledAt: Date;
  enrolledBy: Types.ObjectId;
  progress: number;
  completedAt?: Date;
  status: EnrollmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const EnrollmentSchema = new Schema<IEnrollment>(
  {
    student: { type: Types.ObjectId, ref: 'User', required: true },
    course: { type: Types.ObjectId, ref: 'Course', required: true },
    enrolledAt: { type: Date, default: Date.now },
    enrolledBy: { type: Types.ObjectId, ref: 'User', required: true },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    completedAt: { type: Date },
    status: { 
      type: String, 
      enum: Object.values(EnrollmentStatus), 
      default: EnrollmentStatus.ACTIVE 
    },
  },
  { timestamps: true }
);

EnrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
EnrollmentSchema.index({ course: 1, status: 1 });


// INSTRUCTOR ASSIGNMENT SCHEMA
export interface IInstructorAssignment extends Document {
  instructor: Types.ObjectId;
  course: Types.ObjectId;
  role: InstructorRole;
  assignedBy: Types.ObjectId;
  assignedAt: Date;
  status: AssignmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const InstructorAssignmentSchema = new Schema<IInstructorAssignment>(
  {
    instructor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    role: { 
      type: String, 
      enum: Object.values(InstructorRole), 
      default: InstructorRole.LEAD 
    },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedAt: { type: Date, default: Date.now },
    status: { 
      type: String, 
      enum: Object.values(AssignmentStatus), 
      default: AssignmentStatus.ACTIVE 
    },
  },
  { timestamps: true }
);

InstructorAssignmentSchema.index({ instructor: 1, course: 1 }, { unique: true });
InstructorAssignmentSchema.index({ course: 1, status: 1 });


export const Course = model<ICourse>('Course', CourseSchema);
export const Enrollment = model<IEnrollment>('Enrollment', EnrollmentSchema);
export const InstructorAssignment = model<IInstructorAssignment>('InstructorAssignment', InstructorAssignmentSchema);