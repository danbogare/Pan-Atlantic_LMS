import { Schema, model, Document } from 'mongoose';

export enum UserRole {
  ADMIN = 'admin',
  SUPERVISOR = 'supervisor',
  INSTRUCTOR = 'instructor',
  STUDENT = 'student'
}

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  learningStreak?: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true,
    index: true 
  },
  passwordHash: { type: String, required: true },
  role: { 
    type: String, 
    enum: Object.values(UserRole), 
    default: UserRole.STUDENT 
  },
  isActive: { type: Boolean, default: true },
  mustChangePassword: { type: Boolean, default: false },
  learningStreak: { type: Number, default: 0 }
}, {
  timestamps: true 
});

export const User = model<IUser>('User', UserSchema);