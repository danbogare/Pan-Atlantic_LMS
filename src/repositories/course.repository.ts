import { Model, Types } from 'mongoose';
import { ICourse, CourseStatus, 
    IEnrollment, EnrollmentStatus, 
    IInstructorAssignment, AssignmentStatus, InstructorRole } from '../models/course.model';
import { CourseFilter, CourseStats } from '../interfaces/course.interface';

export interface ICourseRepository {
  // Course CRUD
  create(courseData: Partial<ICourse>): Promise<ICourse>;
  findById(id: string): Promise<ICourse | null>;
  findAll(filter?: CourseFilter): Promise<ICourse[]>;
  findPaginated(filter: CourseFilter & { page: number; limit: number }): Promise<{ items: ICourse[]; total: number }>;
  update(id: string, updateData: Partial<ICourse>): Promise<ICourse | null>;
  delete(id: string): Promise<void>;
  
  // Course with relationships
  findCourseWithDetails(id: string): Promise<any>;
  findCoursesByInstructor(instructorId: string): Promise<ICourse[]>;
  findCoursesByStudent(studentId: string): Promise<any[]>;
  
  // Enrollment
  enrollStudent(enrollmentData: Partial<IEnrollment>): Promise<IEnrollment>;
  findEnrollment(studentId: string, courseId: string): Promise<IEnrollment | null>;
  findEnrollmentsByStudent(studentId: string): Promise<IEnrollment[]>;
  updateEnrollmentAccess(
    enrollmentId: string,
    access: { accessStartsAt?: Date; accessExpiresAt: Date | null }
  ): Promise<IEnrollment | null>;
  getEnrolledStudents(courseId: string): Promise<any[]>;
  getStudentEnrollments(studentId: string): Promise<any[]>;
  updateEnrollmentStatus(enrollmentId: string, status: EnrollmentStatus): Promise<IEnrollment | null>;
  getEnrollmentCount(courseId: string): Promise<number>;
  // Every enrollment regardless of status (active, completed or dropped)
  countAllEnrollments(courseId: string): Promise<number>;
  
  // Instructor Assignment
  assignInstructor(assignmentData: Partial<IInstructorAssignment>): Promise<IInstructorAssignment>;
  findAssignedCourseIds(instructorId: string): Promise<string[]>;
  removeInstructor(instructorId: string, courseId: string): Promise<void>;
  getCourseInstructors(courseId: string): Promise<any[]>;
  updateInstructorRole(instructorId: string, courseId: string, role: InstructorRole): Promise<IInstructorAssignment | null>;
  getInstructorCourses(instructorId: string): Promise<any[]>;
  
  // Complex Queries
  getCourseStats(courseId: string): Promise<CourseStats>;
  searchCourses(searchTerm: string): Promise<ICourse[]>;
  getPublishedCoursesWithDetails(): Promise<any[]>;
  isStudentEnrolled(studentId: string, courseId: string): Promise<boolean>;
  isInstructorAssigned(instructorId: string, courseId: string): Promise<boolean>;

  updateEnrollmentProgress(enrollmentId: string, progress: number): Promise<IEnrollment | null>
}

export class CourseRepository implements ICourseRepository {
  constructor(
    private readonly courseModel: Model<ICourse>,
    private readonly enrollmentModel: Model<IEnrollment>,
    private readonly instructorAssignmentModel: Model<IInstructorAssignment>
  ) {}

  // COURSE CRUD
  public async create(courseData: Partial<ICourse>): Promise<ICourse> {
    return await this.courseModel.create(courseData);
  }

  public async findById(id: string): Promise<ICourse | null> {
    return await this.courseModel.findById(id).exec();
  }

  private buildCourseQuery(filter: CourseFilter): Record<string, unknown> {
    const query: Record<string, unknown> = {};

    if (filter.status) query.status = filter.status;
    else if (filter.statusNot) query.status = { $ne: filter.statusNot };
    if (filter.level) query.level = filter.level;
    if (filter.courseType) query.courseType = filter.courseType;
    if (filter.createdBy) query.createdBy = filter.createdBy;
    if (filter.courseIds) query._id = { $in: filter.courseIds };
    if (filter.search) {
      // Escape regex metacharacters so user input is matched literally
      const pattern = filter.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { title: { $regex: pattern, $options: 'i' } },
        { description: { $regex: pattern, $options: 'i' } }
      ];
    }

    return query;
  }

  public async findAll(filter: CourseFilter = {}): Promise<ICourse[]> {
    const query = this.buildCourseQuery(filter);

    let findQuery = this.courseModel.find(query).sort({ createdAt: -1 });
    
    if (filter.page && filter.limit) {
      const skip = (filter.page - 1) * filter.limit;
      findQuery = findQuery.skip(skip).limit(filter.limit);
    }
    
    return await findQuery.exec();
  }

  public async findPaginated(
    filter: CourseFilter & { page: number; limit: number }
  ): Promise<{ items: ICourse[]; total: number }> {
    const query = this.buildCourseQuery(filter);
    const [items, total] = await Promise.all([
      this.courseModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((filter.page - 1) * filter.limit)
        .limit(filter.limit)
        .exec(),
      this.courseModel.countDocuments(query).exec(),
    ]);
    return { items, total };
  }

  public async update(id: string, updateData: Partial<ICourse>): Promise<ICourse | null> {
    return await this.courseModel
      .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .exec();
  }

  public async delete(id: string): Promise<void> {
    // Hard delete - removes the course and its instructor assignments
    await Promise.all([
      this.courseModel.findByIdAndDelete(id).exec(),
      this.instructorAssignmentModel.deleteMany({ course: id }).exec(),
    ]);
  }

  // COURSE WITH RELATIONSHIPS
  public async findCourseWithDetails(id: string): Promise<any> {
    const course = await this.courseModel.findById(id).lean();
    if (!course) return null;

    const [enrollmentCount, instructors] = await Promise.all([
      this.enrollmentModel.countDocuments({ 
        course: new Types.ObjectId(id), 
        status: EnrollmentStatus.ACTIVE 
      }),
      this.instructorAssignmentModel
        .find({ course: id, status: AssignmentStatus.ACTIVE })
        .populate('instructor', 'firstName lastName email')
        .lean()
    ]);

    return {
      ...course,
      enrollmentCount,
      instructors
    };
  }

  public async findCoursesByInstructor(instructorId: string): Promise<ICourse[]> {
    const assignments = await this.instructorAssignmentModel
      .find({ 
        instructor: instructorId, 
        status: AssignmentStatus.ACTIVE 
      })
      .select('course')
      .lean();

    const courseIds = assignments.map(a => a.course);
    
    return await this.courseModel
      .find({ _id: { $in: courseIds } })
      .sort({ createdAt: -1 })
      .exec();
  }

  public async findCoursesByStudent(studentId: string): Promise<any[]> {
    const enrollments = await this.enrollmentModel
      .find({ student: studentId })
      .populate({
        path: 'course',
        match: { status: { $ne: CourseStatus.ARCHIVED } }
      })
      .lean();

    return enrollments.filter(e => e.course);
  }

  // ENROLLMENT OPERATIONS
  public async enrollStudent(enrollmentData: Partial<IEnrollment>): Promise<IEnrollment> {
    // Check if already enrolled
    const existing = await this.enrollmentModel.findOne({
      student: enrollmentData.student,
      course: enrollmentData.course
    });

    if (existing) {
      throw new Error('Student is already enrolled in this course');
    }

    return await this.enrollmentModel.create(enrollmentData);
  }

  public async findEnrollment(studentId: string, courseId: string): Promise<IEnrollment | null> {
    return await this.enrollmentModel
      .findOne({ student: studentId, course: courseId })
      .exec();
  }

  public async findEnrollmentsByStudent(studentId: string): Promise<IEnrollment[]> {
    return await this.enrollmentModel.find({ student: studentId }).exec();
  }

  public async updateEnrollmentAccess(
    enrollmentId: string,
    access: { accessStartsAt?: Date; accessExpiresAt: Date | null }
  ): Promise<IEnrollment | null> {
    return await this.enrollmentModel
      .findByIdAndUpdate(enrollmentId, { $set: access }, { new: true })
      .exec();
  }

  public async getEnrolledStudents(courseId: string): Promise<any[]> {
    return await this.enrollmentModel
      .find({ course: courseId })
      .populate('student', 'firstName lastName email')
      .sort({ enrolledAt: -1 })
      .lean();
  }

  public async getStudentEnrollments(studentId: string): Promise<any[]> {
    return await this.enrollmentModel
      .find({ student: studentId })
      .populate('course', 'title description thumbnail level')
      .sort({ enrolledAt: -1 })
      .lean();
  }

  public async updateEnrollmentStatus(
    enrollmentId: string, 
    status: EnrollmentStatus
  ): Promise<IEnrollment | null> {
    const updateData: any = { status };
    
    if (status === EnrollmentStatus.COMPLETED) {
      updateData.completedAt = new Date();
      updateData.progress = 100;
    }
    
    return await this.enrollmentModel
      .findByIdAndUpdate(enrollmentId, updateData, { new: true })
      .exec();
  }

  public async getEnrollmentCount(courseId: string): Promise<number> {
    return await this.enrollmentModel.countDocuments({
      course: courseId,
      status: EnrollmentStatus.ACTIVE
    });
  }

  public async countAllEnrollments(courseId: string): Promise<number> {
    return await this.enrollmentModel.countDocuments({ course: courseId });
  }

  // INSTRUCTOR ASSIGNMENT OPERATIONS
  public async assignInstructor(
    assignmentData: Partial<IInstructorAssignment>
  ): Promise<IInstructorAssignment> {
    // Check if already assigned
    const existing = await this.instructorAssignmentModel.findOne({
      instructor: assignmentData.instructor,
      course: assignmentData.course
    });

    if (existing) {
      throw new Error('Instructor is already assigned to this course');
    }

    return await this.instructorAssignmentModel.create(assignmentData);
  }

  public async findAssignedCourseIds(instructorId: string): Promise<string[]> {
    const assignments = await this.instructorAssignmentModel
      .find({ instructor: instructorId, status: AssignmentStatus.ACTIVE })
      .select('course')
      .lean();
    return assignments.map((a) => a.course.toString());
  }

  public async removeInstructor(instructorId: string, courseId: string): Promise<void> {
    await this.instructorAssignmentModel.findOneAndUpdate(
      { instructor: instructorId, course: courseId },
      { status: AssignmentStatus.INACTIVE, endedAt: new Date() }
    );
  }

  public async getCourseInstructors(courseId: string): Promise<any[]> {
    return await this.instructorAssignmentModel
      .find({ course: courseId, status: AssignmentStatus.ACTIVE })
      .populate('instructor', 'firstName lastName email')
      .lean();
  }

  public async updateInstructorRole(
    instructorId: string, 
    courseId: string, 
    role: InstructorRole
  ): Promise<IInstructorAssignment | null> {
    return await this.instructorAssignmentModel
      .findOneAndUpdate(
        { instructor: instructorId, course: courseId },
        { role },
        { new: true }
      )
      .exec();
  }

  public async getInstructorCourses(instructorId: string): Promise<any[]> {
    const assignments = await this.instructorAssignmentModel
      .find({ instructor: instructorId, status: AssignmentStatus.ACTIVE })
      .populate('course')
      .lean();
    
    return assignments.map(a => ({
      ...a.course,
      instructorRole: a.role,
      assignedAt: a.assignedAt
    }));
  }

  // COMPLEX QUERIES
  public async getCourseStats(courseId: string): Promise<CourseStats> {
    const stats = await this.enrollmentModel.aggregate([
      { $match: { course: new Types.ObjectId(courseId) } },
      {
        $group: {
          _id: null,
          totalStudents: { $sum: 1 },
          activeStudents: {
            $sum: {
              $cond: [{ $eq: ['$status', EnrollmentStatus.ACTIVE] }, 1, 0]
            }
          },
          completedStudents: {
            $sum: {
              $cond: [{ $eq: ['$status', EnrollmentStatus.COMPLETED] }, 1, 0]
            }
          },
          averageProgress: { $avg: '$progress' }
        }
      }
    ]);

    const instructorCount = await this.instructorAssignmentModel.countDocuments({
      course: courseId,
      status: AssignmentStatus.ACTIVE
    });

    const data = stats[0] || {
      totalStudents: 0,
      activeStudents: 0,
      completedStudents: 0,
      averageProgress: 0
    };

    return {
      ...data,
      totalInstructors: instructorCount,
      completionRate: data.totalStudents > 0 
        ? (data.completedStudents / data.totalStudents) * 100 
        : 0
    };
  }

  public async searchCourses(searchTerm: string): Promise<ICourse[]> {
    return await this.courseModel.find({
      status: CourseStatus.PUBLISHED,
      $or: [
        { title: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { tags: { $regex: searchTerm, $options: 'i' } }
      ]
    }).exec();
  }

  public async getPublishedCoursesWithDetails(): Promise<any[]> {
    const courses = await this.courseModel
      .find({ status: CourseStatus.PUBLISHED })
      .sort({ createdAt: -1 })
      .lean();

    const coursesWithCounts = await Promise.all(
      courses.map(async (course) => {
        const enrollmentCount = await this.enrollmentModel.countDocuments({
          course: course._id,
          status: EnrollmentStatus.ACTIVE
        });

        return {
          ...course,
          enrollmentCount
        };
      })
    );

    return coursesWithCounts;
  }

  public async isStudentEnrolled(studentId: string, courseId: string): Promise<boolean> {
    const enrollment = await this.enrollmentModel.findOne({
      student: studentId,
      course: courseId,
      status: { $ne: EnrollmentStatus.DROPPED }
    });
    return !!enrollment;
  }

  public async isInstructorAssigned(instructorId: string, courseId: string): Promise<boolean> {
    const assignment = await this.instructorAssignmentModel.findOne({
      instructor: instructorId,
      course: courseId,
      status: AssignmentStatus.ACTIVE
    });
    return !!assignment;
  }

  public async updateEnrollmentProgress(enrollmentId: string, progress: number): Promise<IEnrollment | null> {
    return await this.enrollmentModel
      .findByIdAndUpdate(enrollmentId, { progress }, { new: true })
      .exec();
  }
}