// controllers/course.controller.ts
import { Request, Response } from "express";
import { ICourseService } from "../services/course.service";
import { createdSuccessResponse, successResponse } from "../utils/response";
import { CreateCourseInput } from "../validators/course.validator";
import { CreateCoursePayload } from "../interfaces/course.interface";

export interface ICourseController {
  createCourse: (req: Request, res: Response) => Promise<void>;
  getFullCourseDetails: (req: Request, res: Response) => Promise<void>;
  getAllCourses: (req: Request, res: Response) => Promise<void>;
  updateCourse: (req: Request, res: Response) => Promise<void>;
  deleteCourse: (req: Request, res: Response) => Promise<void>;
  publishCourse: (req: Request, res: Response) => Promise<void>;
  
  addModule: (req: Request, res: Response) => Promise<void>;
  getCourseModules: (req: Request, res: Response) => Promise<void>;
  updateModule: (req: Request, res: Response) => Promise<void>;
  deleteModule: (req: Request, res: Response) => Promise<void>;
  reorderModules: (req: Request, res: Response) => Promise<void>;
  
  addLesson: (req: Request, res: Response) => Promise<void>;
  getModuleLessons: (req: Request, res: Response) => Promise<void>;
  updateLesson: (req: Request, res: Response) => Promise<void>;
  deleteLesson: (req: Request, res: Response) => Promise<void>;
  uploadLessonContent: (req: Request, res: Response) => Promise<void>;
  reorderLessons: (req: Request, res: Response) => Promise<void>;
  
  getCourseWithInstructors: (req: Request, res: Response) => Promise<void>;
  getCourseWithStudents: (req: Request, res: Response) => Promise<void>;
  getCourseStats: (req: Request, res: Response) => Promise<void>;
  enrollStudent: (req: Request, res: Response) => Promise<void>;
}

export class CourseController implements ICourseController {
  constructor(private readonly courseService: ICourseService) {}

  // COURSE OPERATIONS

  public createCourse = async (req: Request<{}, {}, CreateCourseInput>, res: Response): Promise<void> => {
    const adminId = req.user?.id as string;
    const thumbnailFile = req.file as Express.Multer.File | undefined;
    const {title, description, level, duration, prerequisites, learningObjectives, instructorIds} = req.body;

    const data: CreateCoursePayload = {
      title,
      description,
      level,
      duration,
      prerequisites,
      learningObjectives,
      instructorIds,
      thumbnailFile
    };

    const course = await this.courseService.createCourse(adminId, data);

    createdSuccessResponse(res, "Course created successfully", course);
  };

  public getFullCourseDetails = async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params;
    const course = await this.courseService.getFullCourseDetails(courseId as string);
    successResponse(res, "Course details retrieved successfully", course);
  };

  public getAllCourses = async (req: Request, res: Response): Promise<void> => {
    const { status, level, search, page, limit } = req.query;
    
    const courses = await this.courseService.getAllCourses({
      status: status as any,
      level: level as any,
      search: search as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    successResponse(res, "Courses retrieved successfully", courses);
  };

  public updateCourse = async (req: Request, res: Response): Promise<void> => {
    const adminId = req.user?.id as string;
    const { courseId } = req.params;
    const updatedCourse = await this.courseService.updateCourse(courseId as string, req.body, adminId);
    successResponse(res, "Course updated successfully", updatedCourse);
  };

  public deleteCourse = async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params;
    await this.courseService.deleteCourse(courseId as string);
    successResponse(res, "Course deleted successfully", {});
  };

  public publishCourse = async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params;
    await this.courseService.publishCourse(courseId as string);
    successResponse(res, "Course published successfully", {});
  };


  // MODULE OPERATIONS

  public addModule = async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params;
    const module = await this.courseService.addModule(courseId as string, req.body);
    createdSuccessResponse(res, "Module added successfully", module);
  };

  public getCourseModules = async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params;
    const modules = await this.courseService.getCourseModules(courseId as string);
    successResponse(res, "Modules retrieved successfully", modules);
  };

  public updateModule = async (req: Request, res: Response): Promise<void> => {
    const { moduleId } = req.params;
    const updatedModule = await this.courseService.updateModule(moduleId as string, req.body);
    successResponse(res, "Module updated successfully", updatedModule);
  };

  public deleteModule = async (req: Request, res: Response): Promise<void> => {
    const { moduleId } = req.params;
    await this.courseService.deleteModule(moduleId as string);
    successResponse(res, "Module deleted successfully", {});
  };

  public reorderModules = async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params;
    const { moduleOrders } = req.body;
    await this.courseService.reorderModules(courseId as string, moduleOrders);
    successResponse(res, "Modules reordered successfully", {});
  };

  // LESSON OPERATIONS
  public addLesson = async (req: Request, res: Response): Promise<void> => {
    const { moduleId } = req.params;
    const file = req.file as Express.Multer.File | undefined;

    const lesson = await this.courseService.addLesson(moduleId as string, {
      ...req.body,
      file,
    });

    createdSuccessResponse(res, "Lesson added successfully", lesson);
  };

  public getModuleLessons = async (req: Request, res: Response): Promise<void> => {
    const { moduleId } = req.params;
    const lessons = await this.courseService.getModuleLessons(moduleId as string);
    successResponse(res, "Lessons retrieved successfully", lessons);
  };

  public updateLesson = async (req: Request, res: Response): Promise<void> => {
    const { lessonId } = req.params;
    const updatedLesson = await this.courseService.updateLesson(lessonId as string, req.body);
    successResponse(res, "Lesson updated successfully", updatedLesson);
  };

  public deleteLesson = async (req: Request, res: Response): Promise<void> => {
    const { lessonId } = req.params;
    await this.courseService.deleteLesson(lessonId as string);
    successResponse(res, "Lesson deleted successfully", {});
  };

  public uploadLessonContent = async (req: Request, res: Response): Promise<void> => {
    const { lessonId } = req.params;
    const file = req.file as Express.Multer.File;

    if (!file) {
      throw new Error("No file uploaded");
    }

    const url = await this.courseService.uploadLessonContent(lessonId as string, file);
    successResponse(res, "File uploaded successfully", { url });
  };

  public reorderLessons = async (req: Request, res: Response): Promise<void> => {
    const { moduleId } = req.params;
    const { lessonOrders } = req.body;
    await this.courseService.reorderLessons(moduleId as string, lessonOrders);
    successResponse(res, "Lessons reordered successfully", {});
  };

  // COURSE RELATIONSHIPS

  public getCourseWithInstructors = async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params;
    const course = await this.courseService.getCourseWithInstructors(courseId as string);
    successResponse(res, "Course instructors retrieved successfully", course);
  };

  public getCourseWithStudents = async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params;
    const course = await this.courseService.getCourseWithStudents(courseId as string);
    successResponse(res, "Course students retrieved successfully", course);
  };

  public getCourseStats = async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params;
    const stats = await this.courseService.getCourseStats(courseId as string);
    successResponse(res, "Course stats retrieved successfully", stats);
  };

  public enrollStudent = async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params;
    const { studentId } = req.body;
    const adminId = req.user?.id as string;

    const enrollment = await this.courseService.enrollStudent(courseId as string, studentId, adminId);
    createdSuccessResponse(res, "Student enrolled successfully", enrollment);
  };
}