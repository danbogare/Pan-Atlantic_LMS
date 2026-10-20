// services/course.service.ts
import { ICourseRepository } from "../repositories/course.repository";
import { ICourseContentRepository } from "../repositories/courseModule.repository";
import { ICloudinaryService } from "./storage.service";
import { IUserRepository } from "../repositories/user.repository";
import { IQuizRepository } from "../repositories/quiz.repository";
import { IDiscussionRepository } from "../repositories/discussion.repository";
import {
  AlreadyEnrolledError,
  BadRequestError,
  CourseAccessDeniedError,
  CourseHasStudentsError,
  CourseNotFoundError,
  EnrollmentNotFoundError,
  LessonNotFoundError,
  ModuleNotFoundError,
} from "../errors/error";
import { CourseStatus, EnrollmentStatus, ICourse } from "../models/course.model";
import { ContentType, ICourseLesson, ICourseModule } from "../models/courseModule.model";
import { UserRole } from "../models/user.model";
import { Types } from "mongoose";
import { AddLesson, AddModule, CourseFilter, CreateCoursePayload, PaginatedResult, UpdateCoursePayload, UpdateLesson, UpdateModule } from "../interfaces/course.interface";
import { IAuthUserPayload } from "../interfaces/auth.interface";
import { PublicCourseListQuery } from "../validators/course.validator";
import { AccessSummary, addDays, computeAccessWindow, isAccessExpired, summarizeAccess } from "../utils/course-access";

const PUBLIC_DEFAULT_PAGE_SIZE = 12;

// Fields safe to show on the public catalog (no internal ids like createdBy)
function toPublicCourse(course: ICourse) {
  return {
    _id: course._id,
    title: course.title,
    description: course.description,
    thumbnail: course.thumbnail,
    level: course.level,
    courseType: course.courseType,
    duration: course.duration,
    price: course.price,
    currency: course.currency,
    prerequisites: course.prerequisites,
    learningObjectives: course.learningObjectives,
    publishedAt: course.publishedAt,
  };
}

export type PublicCourse = ReturnType<typeof toPublicCourse>;

export interface ICourseService {
  // Courses
  createCourse(adminId: string, data: CreateCoursePayload): Promise<ICourse>;
  getCourseById(courseId: string): Promise<ICourse>;
  getAllCourses(filter?: CourseFilter): Promise<ICourse[]>;
  // Admin: every course; instructor: assigned courses; student: enrolled courses with access info
  getCoursesForUser(user: IAuthUserPayload, filter: CourseFilter): Promise<any[]>;
  getPublicCourses(query: PublicCourseListQuery): Promise<PaginatedResult<PublicCourse>>;
  getPublicCourseDetails(courseId: string): Promise<any>;
  extendStudentAccess(courseId: string, studentId: string, days: number): Promise<AccessSummary>;
  updateCourse(courseId: string, data: UpdateCoursePayload, adminId: string): Promise<ICourse | null>;
  updateThumbnail(courseId: string, file: Express.Multer.File): Promise<string>;
  deleteCourse(courseId: string): Promise<void>;
  publishCourse(courseId: string): Promise<void>;
  archiveCourse(courseId: string): Promise<void>;

  // Course details
  getFullCourseDetails(courseId: string): Promise<any>;
  getCourseWithInstructors(courseId: string): Promise<any>;
  getCourseWithInstructors(courseId: string): Promise<any>;
  getCourseWithStudents(courseId: string): Promise<any>;

  // module
  addModule(courseId: string, data: AddModule): Promise<ICourseModule>;
  getCourseModules(courseId: string): Promise<any>;
  getModuleWithLessons(moduleId: string): Promise<any>;
  updateModule(moduleId: string, data: UpdateModule): Promise<any>;
  deleteModule(moduleId: string): Promise<void>;
  reorderModules(courseId: string,moduleOrders: { id: string; order: number }[]
  ): Promise<void>;

  // Course Lesson
  addLesson(moduleId: string, data: AddLesson): Promise<ICourseLesson>;
  getModuleLessons(moduleId: string): Promise<any>;
  getLesson(lessonId: string): Promise<any>;
  updateLesson(lessonId: string, data: UpdateLesson): Promise<ICourseLesson | null>;
  deleteLesson(lessonId: string): Promise<void>;
  uploadLessonContent(lessonId: string, file: Express.Multer.File): Promise<string>;
  reorderLessons(moduleId: string, lessonOrders: { id: string; order: number }[]
  ): Promise<void>;

  enrollStudent(courseId: string, studentId: string, enrolledBy: string): Promise<any>
  getCourseStats(courseId: string): Promise<any>
}

export class CourseService implements ICourseService {
  constructor(
    private readonly courseRepo: ICourseRepository,
    private readonly contentRepo: ICourseContentRepository,
    private readonly cloudinaryService: ICloudinaryService,
    private readonly userRepo: IUserRepository,
    private readonly quizRepo: IQuizRepository,
    private readonly discussionRepo: IDiscussionRepository,
  ) {}

  // Create a new course with optional thumbnail
  public async createCourse(adminId: string, data: CreateCoursePayload): Promise<ICourse> {
    // Upload thumbnail if provided
    let thumbnailUrl: string | undefined;
    if (data.thumbnailFile) {
      thumbnailUrl = await this.cloudinaryService.uploadImage(
        data.thumbnailFile,
        'courses/thumbnails'
      );
    }

    // Create the course
    const course = await this.courseRepo.create({
      title: data.title,
      description: data.description,
      thumbnail: thumbnailUrl,
      level: data.level,
      courseType: data.courseType,
      duration: data.duration,
      price: data.price,
      prerequisites: data.prerequisites || [],
      learningObjectives: data.learningObjectives || [],
      createdBy: new Types.ObjectId(adminId),
    });

    const courseId = course._id.toString();

    // Assign instructors if provided
    if (data.instructorIds && data.instructorIds.length > 0) {
      await Promise.all(
        data.instructorIds.map((instructorId) =>
          this.courseRepo.assignInstructor({
            instructor: new Types.ObjectId(instructorId),
            course: new Types.ObjectId(courseId),
            assignedBy: new Types.ObjectId(adminId),
          })
        )
      );
    }

    return course;
  }

  // Get course by ID
  public async getCourseById(courseId: string): Promise<ICourse> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) {
      throw new CourseNotFoundError(`Course ${courseId} not found`);
    }
    return course;
  }

  // Get all courses
  public async getAllCourses(filter?: CourseFilter): Promise<ICourse[]> {
    return await this.courseRepo.findAll(filter);
  }

  public async getCoursesForUser(user: IAuthUserPayload, filter: CourseFilter): Promise<any[]> {
    if (user.role === UserRole.ADMIN) {
      return await this.courseRepo.findAll(filter);
    }

    if (user.role === UserRole.INSTRUCTOR) {
      const courseIds = await this.courseRepo.findAssignedCourseIds(user.id);
      return await this.courseRepo.findAll({ ...filter, courseIds });
    }

    if (user.role === UserRole.STUDENT) {
      const enrollments = (await this.courseRepo.findEnrollmentsByStudent(user.id))
        .filter((e) => e.status !== EnrollmentStatus.DROPPED);
      const enrollmentByCourse = new Map(enrollments.map((e) => [e.course.toString(), e]));

      const courses = await this.courseRepo.findAll({
        ...filter,
        statusNot: CourseStatus.ARCHIVED,
        courseIds: [...enrollmentByCourse.keys()],
      });

      return courses.map((course) => ({
        ...course.toObject(),
        access: summarizeAccess(enrollmentByCourse.get(course._id.toString())!),
      }));
    }

    throw new CourseAccessDeniedError();
  }

  // PUBLIC CATALOG (no auth) — published courses only, no lesson content except previews

  public async getPublicCourses(query: PublicCourseListQuery): Promise<PaginatedResult<PublicCourse>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? PUBLIC_DEFAULT_PAGE_SIZE;

    const { items, total } = await this.courseRepo.findPaginated({
      ...query,
      status: CourseStatus.PUBLISHED,
      page,
      limit,
    });

    return {
      items: items.map(toPublicCourse),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getPublicCourseDetails(courseId: string): Promise<any> {
    const course = Types.ObjectId.isValid(courseId) ? await this.courseRepo.findById(courseId) : null;
    if (!course || course.status !== CourseStatus.PUBLISHED) {
      throw new CourseNotFoundError(`Course ${courseId} not found`);
    }

    const [modules, instructors] = await Promise.all([
      this.contentRepo.getFullCourseContent(courseId),
      this.courseRepo.getCourseInstructors(courseId),
    ]);

    return {
      ...toPublicCourse(course),
      instructors: instructors
        .filter((a: any) => a.instructor)
        .map((a: any) => ({
          firstName: a.instructor.firstName,
          lastName: a.instructor.lastName,
          role: a.role,
        })),
      modules: modules.map((m: any) => ({
        _id: m._id,
        title: m.title,
        description: m.description,
        order: m.order,
        duration: m.duration,
        lessons: (m.lessons ?? []).map((l: any) => ({
          _id: l._id,
          title: l.title,
          description: l.description,
          order: l.order,
          duration: l.duration,
          contentType: l.contentType,
          isPreview: l.isPreview,
          // Only preview lessons expose their content publicly
          ...(l.isPreview ? { contentLink: l.contentLink, contentFile: l.contentFile } : {}),
        })),
      })),
    };
  }

  // Update a course
  public async updateCourse(courseId: string, data: UpdateCoursePayload, adminId: string): Promise<ICourse | null> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) {
      throw new CourseNotFoundError(`Course ${courseId} not found`);
    }

    // Update course fields
    const updatedCourse = await this.courseRepo.update(courseId, data);

    // Update instructors if provided
    if (data.instructorIds) {
      const currentInstructors = await this.courseRepo.getCourseInstructors(courseId);
      const currentIds = currentInstructors.map((i: any) => i.instructor._id.toString());

      // Remove instructors not in new list
      const toRemove = currentIds.filter((id: string) => !data.instructorIds!.includes(id));
      await Promise.all(
        toRemove.map((id: string) => this.courseRepo.removeInstructor(id, courseId))
      );

      // Add new instructors
      const toAdd = data.instructorIds.filter((id) => !currentIds.includes(id));
      await Promise.all(
        toAdd.map((instructorId) =>
          this.courseRepo.assignInstructor({
            instructor: new Types.ObjectId(instructorId),
            course: new Types.ObjectId(courseId),
            assignedBy: new Types.ObjectId(adminId),
          })
        )
      );
    }

    return updatedCourse;
  }

  // update course thumbnail
  public async updateThumbnail(courseId: string, file: Express.Multer.File): Promise<string> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) {
      throw new CourseNotFoundError(`Course ${courseId} not found`);
    }

    const thumbnailUrl = await this.cloudinaryService.uploadImage(
      file,
      'courses/thumbnails'
    );

    await this.courseRepo.update(courseId, { thumbnail: thumbnailUrl } as any);

    return thumbnailUrl;
  }

  // Permanently delete a course and its content. Refused while any student (active, completed or
  // dropped) is enrolled, so student records like progress and certificates are never orphaned.
  public async deleteCourse(courseId: string): Promise<void> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) {
      throw new CourseNotFoundError(`Course ${courseId} not found`);
    }

    const studentCount = await this.courseRepo.countAllEnrollments(courseId);
    if (studentCount > 0) {
      throw new CourseHasStudentsError(studentCount);
    }

    await Promise.all([
      this.contentRepo.deleteCourseContent(courseId),
      this.quizRepo.deleteByCourse(courseId),
      this.discussionRepo.deleteByCourse(courseId),
    ]);
    await this.courseRepo.delete(courseId);
  }

  // Publish a course
  public async publishCourse(courseId: string): Promise<void> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) {
      throw new CourseNotFoundError(`Course ${courseId} not found`);
    }
    await this.courseRepo.update(courseId, {
      status: CourseStatus.PUBLISHED,
      publishedAt: new Date(),
    } as any);
  }

  // soft delete
  public async archiveCourse(courseId: string): Promise<void> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) {
      throw new CourseNotFoundError(`Course ${courseId} not found`);
    }
    await this.courseRepo.update(courseId, {
      status: CourseStatus.ARCHIVED,
      archivedAt: new Date(),
    } as any);
  }

  // FULL COURSE DETAILS

  // Get full course with modules, lessons, instructors, and stats
  public async getFullCourseDetails(courseId: string): Promise<any> {
    const [course, modules, instructors, enrollmentCount, stats] = await Promise.all([
      this.courseRepo.findById(courseId),
      this.contentRepo.getFullCourseContent(courseId),
      this.courseRepo.getCourseInstructors(courseId),
      this.courseRepo.getEnrollmentCount(courseId),
      this.courseRepo.getCourseStats(courseId),
    ]);

    if (!course) {
      throw new CourseNotFoundError(`Course ${courseId} not found`);
    }

    return {
      ...course.toObject(),
      instructors,
      modules,
      enrollmentCount,
      stats,
    };
  }


  // Get course with instructors
  public async getCourseWithInstructors(courseId: string): Promise<any> {
    const [course, instructors] = await Promise.all([
      this.courseRepo.findById(courseId),
      this.courseRepo.getCourseInstructors(courseId),
    ]);

    if (!course) {
      throw new CourseNotFoundError(`Course ${courseId} not found`);
    }

    return {
      ...course.toObject(),
      instructors,
    };
  }


  // Get course with students
  public async getCourseWithStudents(courseId: string): Promise<any> {
    const [course, students] = await Promise.all([
      this.courseRepo.findById(courseId),
      this.courseRepo.getEnrolledStudents(courseId),
    ]);

    if (!course) {
      throw new CourseNotFoundError(`Course ${courseId} not found`);
    }

    return {
      ...course.toObject(),
      students,
    };
  }

  // MODULE OPERATIONS
  
  // Add a module
  public async addModule(courseId: string, data: AddModule): Promise<ICourseModule> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) {
      throw new CourseNotFoundError(`Course ${courseId} not found`);
    }

    return await this.contentRepo.createModule({
      title: data.title,
      description: data.description || '',
      course: new Types.ObjectId(courseId),
      order: data.order,
      duration: data.duration,
    });
  }

  // Get all modules
  public async getCourseModules(courseId: string): Promise<any> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) {
      throw new CourseNotFoundError(`Course ${courseId} not found`);
    }

    return await this.contentRepo.getFullCourseContent(courseId);
  }

  // Get a module with lessons
  public async getModuleWithLessons(moduleId: string): Promise<any> {
    const module = await this.contentRepo.getModuleWithLessons(moduleId);
    if (!module) {
      throw new ModuleNotFoundError(`Module ${moduleId} not found`);
    }
    return module;
  }


  // Update a module
  public async updateModule(moduleId: string, data: UpdateModule): Promise<any> {
    const updated = await this.contentRepo.updateModule(moduleId, data);
    if (!updated) {
      throw new ModuleNotFoundError(`Module ${moduleId} not found`);
    }
    return updated;
  }

  // Delete a module
  public async deleteModule(moduleId: string): Promise<void> {
    await this.contentRepo.deleteModule(moduleId);
  }

  // Reorder modules in a course
  public async reorderModules(courseId: string,moduleOrders: { id: string; order: number }[]
  ): Promise<void> {
    await this.contentRepo.reorderModules(courseId, moduleOrders);
  }

  // LESSON OPERATIONS

  // Add a lesson to a module (with optional file upload)
  public async addLesson(moduleId: string, data: AddLesson): Promise<ICourseLesson> {
    // Get module to retrieve courseId
    const module = await this.contentRepo.findModuleById(moduleId);
    if (!module) {
      throw new ModuleNotFoundError(`Module ${moduleId} not found`);
    }

    const courseId = module.course.toString();
    let contentFileUrl: string | undefined;

    // Upload file if provided
    if (data.file) {
      if (data.contentType === ContentType.VIDEO) {
        contentFileUrl = await this.cloudinaryService.uploadVideo(
          data.file,
          `courses/${courseId}/videos`
        );
      } else if (data.contentType === ContentType.DOCUMENT) {
        contentFileUrl = await this.cloudinaryService.uploadDocument(
          data.file,
          `courses/${courseId}/documents`
        );
      }
    }

    // Create the lesson
    return await this.contentRepo.createLesson({
      title: data.title,
      description: data.description || '',
      module: new Types.ObjectId(moduleId),
      course: new Types.ObjectId(courseId),
      order: data.order,
      contentType: data.contentType,
      contentLink: data.contentLink || '',
      contentFile: contentFileUrl || '',
      duration: data.duration,
      isPreview: data.isPreview,
    });
  }

  // Get all lessons for a module
  public async getModuleLessons(moduleId: string): Promise<any> {
    return await this.contentRepo.getModuleLessons(moduleId);
  }

  // Get a single lesson
  public async getLesson(lessonId: string): Promise<any> {
    return await this.contentRepo.findLessonById(lessonId);
  }

  // Update a lesson
  public async updateLesson(lessonId: string, data: UpdateLesson): Promise<ICourseLesson | null> {
    const updated = await this.contentRepo.updateLesson(lessonId, data);
    if (!updated) {
      throw new LessonNotFoundError(`Lesson ${lessonId} not found`);
    }
    return updated;
  }

  // Delete a lesson
  public async deleteLesson(lessonId: string): Promise<void> {
    await this.contentRepo.deleteLesson(lessonId);
  }

  
  // Upload/replace content file for a lesson
  public async uploadLessonContent(lessonId: string, file: Express.Multer.File): Promise<string> {
    // Get lesson to determine content type and course
    const lesson = await this.contentRepo.findLessonById(lessonId);
    if (!lesson) {
      throw new LessonNotFoundError(`Lesson ${lessonId} not found`);
    }

    let url: string;

    // Determine upload type based on content type or mimetype
    if (lesson.contentType === ContentType.VIDEO || file.mimetype.startsWith('video/')) {
      url = await this.cloudinaryService.uploadVideo(
        file,
        `courses/${lesson.course}/videos`
      );
    } else if (file.mimetype.startsWith('image/')) {
      url = await this.cloudinaryService.uploadImage(
        file,
        `courses/${lesson.course}/images`
      );
    } else {
      url = await this.cloudinaryService.uploadDocument(
        file,
        `courses/${lesson.course}/documents`
      );
    }

    // Update lesson with file URL
    await this.contentRepo.updateLesson(lessonId, { contentFile: url } as any);

    return url;
  }

  // Reorder lessons within a module
  public async reorderLessons(moduleId: string, lessonOrders: { id: string; order: number }[]
  ): Promise<void> {
    await this.contentRepo.reorderLessons(moduleId, lessonOrders);
  }

  // ENROLLMENT OPERATIONS

  // Enroll a student in a course
  public async enrollStudent(courseId: string, studentId: string, enrolledBy: string): Promise<any> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) {
      throw new CourseNotFoundError(`Course ${courseId} not found`);
    }

    const student = await this.userRepo.findById(studentId);
    if (!student || student.role !== UserRole.STUDENT) {
      throw new BadRequestError("studentId must belong to an existing student");
    }

    if (await this.courseRepo.findEnrollment(studentId, courseId)) {
      throw new AlreadyEnrolledError();
    }

    return await this.courseRepo.enrollStudent({
      student: new Types.ObjectId(studentId),
      course: new Types.ObjectId(courseId),
      enrolledBy : new Types.ObjectId(enrolledBy),
      ...computeAccessWindow(course.duration ?? 0),
    });
  }

  // Extend or renew a student's access. Active access grows from its current expiry; expired,
  // unlimited or legacy access gets a fresh window from the next day. days = 0 removes the expiry.
  public async extendStudentAccess(courseId: string, studentId: string, days: number): Promise<AccessSummary> {
    const enrollment = await this.courseRepo.findEnrollment(studentId, courseId);
    if (!enrollment) {
      throw new EnrollmentNotFoundError(`Student ${studentId} is not enrolled in course ${courseId}`);
    }

    const now = new Date();
    let access: { accessStartsAt?: Date; accessExpiresAt: Date | null };

    if (days === 0) {
      access = { accessExpiresAt: null };
    } else if (enrollment.accessExpiresAt && !isAccessExpired(enrollment, now)) {
      access = { accessExpiresAt: addDays(new Date(enrollment.accessExpiresAt), days) };
    } else {
      access = computeAccessWindow(days, now);
    }

    const updated = await this.courseRepo.updateEnrollmentAccess(enrollment._id.toString(), access);
    return summarizeAccess(updated!, now);
  }


  // Get course stats (enrollment, completion, etc.)
  public async getCourseStats(courseId: string): Promise<any> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) {
      throw new CourseNotFoundError(`Course ${courseId} not found`);
    }

    return await this.courseRepo.getCourseStats(courseId);
  }
}