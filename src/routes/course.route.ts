// routes/course.routes.ts
import { Router } from "express";
import { ICourseController } from "../controllers/course.controller";
import { IAuthMiddleware } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/async-handler.middleware";
import { validate } from "../middlewares/validation.middleware";
import { 
  createCourseSchema, 
  updateCourseSchema,
  createModuleSchema,
  updateModuleSchema,
  createLessonSchema,
  updateLessonSchema,
  reorderModulesSchema,
  reorderLessonsSchema
} from "../validators/course.validator";
import { uploadThumbnail, uploadLessonFile } from "../middlewares/upload.middleware";

export class CourseRouter {
  private readonly router = Router();

  constructor(
    private readonly courseController: ICourseController,
    private readonly authMiddleware: IAuthMiddleware
  ) {
    this.initializeRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private initializeRoutes(): void {
    // Apply auth to all routes
    this.router.use(asyncHandler(this.authMiddleware.requireAuth));

    // PUBLIC ROUTES (Any authenticated user)
    
    // Get all courses
    this.router.get("/", asyncHandler(this.courseController.getAllCourses));

    // Get course full details (modules, lessons, instructors, stats)
    this.router.get("/:courseId", asyncHandler(this.courseController.getFullCourseDetails));

    // Get course with instructors
    this.router.get("/:courseId/instructors", asyncHandler(this.courseController.getCourseWithInstructors));

    // Get course with students
    this.router.get("/:courseId/students", asyncHandler(this.courseController.getCourseWithStudents));

    // Get course stats
    this.router.get("/:courseId/stats", asyncHandler(this.courseController.getCourseStats));

    // Get course modules with lessons
    this.router.get("/:courseId/modules", asyncHandler(this.courseController.getCourseModules));

    // Get module lessons
    this.router.get("/modules/:moduleId/lessons", asyncHandler(this.courseController.getModuleLessons));

    // ADMIN & INSTRUCTOR ROUTES
    this.router.use(asyncHandler(this.authMiddleware.requireAdmin));

    // Add module to course
    this.router.post(
      "/:courseId/modules",
      validate(createModuleSchema),
      asyncHandler(this.courseController.addModule)
    );

    // Update module
    this.router.put(
      "/modules/:moduleId",
      validate(updateModuleSchema),
      asyncHandler(this.courseController.updateModule)
    );

    // Reorder modules
    this.router.put(
      "/:courseId/modules/reorder",
      validate(reorderModulesSchema),
      asyncHandler(this.courseController.reorderModules)
    );

    // Add lesson to module (multipart - file upload)
    this.router.post(
      "/modules/:moduleId/lessons",
      uploadLessonFile,
      validate(createLessonSchema),
      asyncHandler(this.courseController.addLesson)
    );

    // Update lesson
    this.router.put(
      "/lessons/:lessonId",
      validate(updateLessonSchema),
      asyncHandler(this.courseController.updateLesson)
    );

    // Delete lesson
    this.router.delete(
      "/lessons/:lessonId",
      asyncHandler(this.courseController.deleteLesson)
    );

    // Upload lesson content file
    this.router.post(
      "/lessons/:lessonId/content",
      uploadLessonFile,
      asyncHandler(this.courseController.uploadLessonContent)
    );

    // Reorder lessons
    this.router.put(
      "/modules/:moduleId/lessons/reorder",
      validate(reorderLessonsSchema),
      asyncHandler(this.courseController.reorderLessons)
    );

    // Enroll student in course
    this.router.post(
      "/:courseId/enroll",
      asyncHandler(this.courseController.enrollStudent)
    );

    // ADMIN ONLY ROUTES
    this.router.use(asyncHandler(this.authMiddleware.requireAdmin));

    // Create course (multipart - thumbnail)
    this.router.post(
      "/",
      uploadThumbnail,
      validate(createCourseSchema),
      asyncHandler(this.courseController.createCourse)
    );

    // Update course
    this.router.put(
      "/:courseId",
      validate(updateCourseSchema),
      asyncHandler(this.courseController.updateCourse)
    );

    // Delete course (archive)
    this.router.delete(
      "/:courseId",
      asyncHandler(this.courseController.deleteCourse)
    );

    // Publish course
    this.router.patch(
      "/:courseId/publish",
      asyncHandler(this.courseController.publishCourse)
    );

    // Delete module
    this.router.delete(
      "/modules/:moduleId",
      asyncHandler(this.courseController.deleteModule)
    );
  }
}