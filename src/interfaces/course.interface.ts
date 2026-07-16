import { CourseLevel, CourseStatus } from "../models/course.model";
import { ContentType } from "../models/courseModule.model";

export interface CreateCoursePayload {
    title: string;
    description: string;
    level: CourseLevel;
    duration: number;
    prerequisites?: string[];
    learningObjectives?: string[];
    instructorIds?: string[];
    thumbnailFile?: Express.Multer.File;
}

export interface UpdateCoursePayload {
    title?: string;
    description?: string;
    level?: CourseLevel;
    duration?: number;
    prerequisites?: string[];
    learningObjectives?: string[];
    instructorIds?: string[];
}

export interface CourseFilter {
  status?: CourseStatus;
  level?: string;
  createdBy?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CourseStats {
  totalStudents: number;
  activeStudents: number;
  completedStudents: number;
  totalInstructors: number;
  completionRate: number;
  averageProgress: number;
}

export interface AddModule {
    title: string;
    description?: string;
    order: number;
    duration: number;
}

export interface UpdateModule {
    title?: string;
    description?: string;
    order?: number;
    duration?: number;
}

export interface AddLesson {
    title: string;
    description?: string;
    order: number;
    contentType: ContentType;
    contentLink?: string;
    file?: Express.Multer.File;
    duration: number;
    isPreview: boolean;
}

export interface UpdateLesson {
    title?: string;
    description?: string;
    order?: number;
    contentType?: ContentType;
    contentLink?: string;
    duration?: number;
    isPreview?: boolean;
}