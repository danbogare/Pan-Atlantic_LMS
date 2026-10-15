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
  reorderLessonsSchema,
  enrollInCourseSchema,
  extendAccessSchema,
} from "../validators/course.validator";
import { ICourseAccessMiddleware, CourseResolver } from "../middlewares/course-access.middleware";
import { uploadThumbnail, uploadLessonFile } from "../middlewares/upload.middleware";
import { IDiscussionController } from "../controllers/discussion.controller";
import { createDiscussionSchema, createReplySchema } from "../validators/discussion.validator";

export class CourseRouter {
  private readonly router = Router();

  constructor(
    private readonly courseController: ICourseController,
    private readonly authMiddleware: IAuthMiddleware,
    private readonly discussionController: IDiscussionController,
    private readonly courseAccess: ICourseAccessMiddleware,
  ) {
    this.initializeRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private initializeRoutes(): void {
    // Apply auth to all routes
    this.router.use(asyncHandler(this.authMiddleware.requireAuth));

    // AUTHENTICATED ROUTES
    // Content routes need course access: admin, an assigned instructor, or a student whose
    // enrollment is active and not expired. Student/stats views need admin or an assigned instructor.
    const learn = (resolve: CourseResolver) => asyncHandler(this.courseAccess.requireLearnAccess(resolve));
    const manage = (resolve: CourseResolver) => asyncHandler(this.courseAccess.requireManageAccess(resolve));
    const course = this.courseAccess.fromParam("courseId");
    const discussion = this.courseAccess.fromDiscussionParam("discussionId", "courseId");

    // List courses visible to the caller (admin: all, instructor: assigned, student: enrolled)
    this.router.get("/", asyncHandler(this.courseController.getAllCourses));

    // Get course full details (modules, lessons, instructors, stats)
    this.router.get("/:courseId", learn(course), asyncHandler(this.courseController.getFullCourseDetails));

    // Get course with instructors
    this.router.get("/:courseId/instructors", learn(course), asyncHandler(this.courseController.getCourseWithInstructors));

    // Get course with students
    this.router.get("/:courseId/students", manage(course), asyncHandler(this.courseController.getCourseWithStudents));

    // Get course stats
    this.router.get("/:courseId/stats", manage(course), asyncHandler(this.courseController.getCourseStats));

    // Get course modules with lessons
    this.router.get("/:courseId/modules", learn(course), asyncHandler(this.courseController.getCourseModules));

    // Get module lessons
    this.router.get(
      "/modules/:moduleId/lessons",
      learn(this.courseAccess.fromModuleParam("moduleId")),
      asyncHandler(this.courseController.getModuleLessons)
    );

    // Discussions
    this.router.get("/:courseId/discussions", learn(course), asyncHandler(this.discussionController.getCourseDiscussions));

    this.router.get(
      "/:courseId/discussions/:discussionId",
      learn(discussion),
      asyncHandler(this.discussionController.getDiscussionById)
    );

    this.router.post(
      "/:courseId/discussions",
      validate(createDiscussionSchema),
      learn(course),
      asyncHandler(this.discussionController.createDiscussion)
    );

    this.router.post(
      "/:courseId/discussions/:discussionId/replies",
      validate(createReplySchema),
      learn(discussion),
      asyncHandler(this.discussionController.addReply)
    );

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
      validate(enrollInCourseSchema),
      asyncHandler(this.courseController.enrollStudent)
    );

    // Extend/renew a student's access to a course
    this.router.put(
      "/:courseId/students/:studentId/access",
      validate(extendAccessSchema),
      asyncHandler(this.courseController.extendStudentAccess)
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