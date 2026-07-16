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
  update(id: string, updateData: Partial<ICourse>): Promise<ICourse | null>;
  delete(id: string): Promise<void>;
  
  // Course with relationships
  findCourseWithDetails(id: string): Promise<any>;
  findCoursesByInstructor(instructorId: string): Promise<ICourse[]>;
  findCoursesByStudent(studentId: string): Promise<any[]>;
  
  // Enrollment
  enrollStudent(enrollmentData: Partial<IEnrollment>): Promise<IEnrollment>;
  findEnrollment(studentId: string, courseId: string): Promise<IEnrollment | null>;
  getEnrolledStudents(courseId: string): Promise<any[]>;
  getStudentEnrollments(studentId: string): Promise<any[]>;
  updateEnrollmentStatus(enrollmentId: string, status: EnrollmentStatus): Promise<IEnrollment | null>;
  getEnrollmentCount(courseId: string): Promise<number>;
  
  // Instructor Assignment
  assignInstructor(assignmentData: Partial<IInstructorAssignment>): Promise<IInstructorAssignment>;
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

  public async findAll(filter: CourseFilter = {}): Promise<ICourse[]> {
    const query: any = {};
    
    if (filter.status) query.status = filter.status;
    if (filter.level) query.level = filter.level;
    if (filter.createdBy) query.createdBy = filter.createdBy;
    if (filter.search) {
      query.$or = [
        { title: { $regex: filter.search, $options: 'i' } },
        { description: { $regex: filter.search, $options: 'i' } }
      ];
    }

    let findQuery = this.courseModel.find(query).sort({ createdAt: -1 });
    
    if (filter.page && filter.limit) {
      const skip = (filter.page - 1) * filter.limit;
      findQuery = findQuery.skip(skip).limit(filter.limit);
    }
    
    return await findQuery.exec();
  }

  public async update(id: string, updateData: Partial<ICourse>): Promise<ICourse | null> {
    return await this.courseModel
      .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .exec();
  }

  public async delete(id: string): Promise<void> {
    // Soft delete - just archive
    await this.courseModel
      .findByIdAndUpdate(id, { 
        status: CourseStatus.ARCHIVED, 
        archivedAt: new Date() 
      })
      .exec();
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
}