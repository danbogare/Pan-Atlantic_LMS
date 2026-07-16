import { Model, Types } from 'mongoose';
import { ICourseModule, ICourseLesson } from '../models/courseModule.model';

export interface ICourseContentRepository {
  // Module CRUD
  createModule(moduleData: Partial<ICourseModule>): Promise<ICourseModule>;
  findModuleById(id: string): Promise<ICourseModule | null>;
  getCourseModules(courseId: string): Promise<ICourseModule[]>;
  updateModule(id: string, updateData: Partial<ICourseModule>): Promise<ICourseModule | null>;
  deleteModule(id: string): Promise<void>;
  reorderModules(courseId: string, moduleOrders: { id: string; order: number }[]): Promise<void>;
  
  // Lesson CRUD
  createLesson(lessonData: Partial<ICourseLesson>): Promise<ICourseLesson>;
  findLessonById(id: string): Promise<ICourseLesson | null>;
  getModuleLessons(moduleId: string): Promise<ICourseLesson[]>;
  updateLesson(id: string, updateData: Partial<ICourseLesson>): Promise<ICourseLesson | null>;
  deleteLesson(id: string): Promise<void>;
  reorderLessons(moduleId: string, lessonOrders: { id: string; order: number }[]): Promise<void>;
  
  // Complex Queries
  getFullCourseContent(courseId: string): Promise<any>;
  getModuleWithLessons(moduleId: string): Promise<any>;
  getNextLesson(currentLessonId: string): Promise<ICourseLesson | null>;
  getPreviousLesson(currentLessonId: string): Promise<ICourseLesson | null>;
  getCourseProgress(courseId: string, completedModuleIds: string[]): Promise<number>;
  getTotalCourseDuration(courseId: string): Promise<number>;
}

export class CourseContentRepository implements ICourseContentRepository {
  constructor(
    private readonly courseModuleModel: Model<ICourseModule>,
    private readonly lessonModel: Model<ICourseLesson>
  ) {}

  // MODULE CRUD
  public async createModule(moduleData: Partial<ICourseModule>): Promise<ICourseModule> {
    // Auto-increment order if not provided
    if (!moduleData.order && moduleData.order !== 0) {
      const lastModule = await this.courseModuleModel
        .findOne({ course: moduleData.course })
        .sort({ order: -1 })
        .exec();
      
      moduleData.order = lastModule ? lastModule.order + 1 : 0;
    }

    return await this.courseModuleModel.create(moduleData);
  }

  public async findModuleById(id: string): Promise<ICourseModule | null> {
    return await this.courseModuleModel.findById(id).exec();
  }

  public async getCourseModules(courseId: string): Promise<ICourseModule[]> {
    return await this.courseModuleModel
      .find({ course: new Types.ObjectId(courseId) })
      .sort({ order: 1 })
      .exec();
  }

  public async updateModule(
    id: string, 
    updateData: Partial<ICourseModule>
  ): Promise<ICourseModule | null> {
    return await this.courseModuleModel
      .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .exec();
  }

  public async deleteModule(id: string): Promise<void> {
    // Delete module and all its lessons
    await Promise.all([
      this.courseModuleModel.findByIdAndDelete(id),
      this.lessonModel.deleteMany({ module: id })
    ]);
  }

  public async reorderModules(
    courseId: string, 
    moduleOrders: { id: string; order: number }[]
  ): Promise<void> {
    const bulkOps = moduleOrders.map(({ id, order }) => ({
      updateOne: {
        filter: { _id: id, course: courseId },
        update: { $set: { order } }
      }
    }));

    await this.courseModuleModel.bulkWrite(bulkOps);
  }

  // LESSON CRUD
  public async createLesson(lessonData: Partial<ICourseLesson>): Promise<ICourseLesson> {
    // Auto-increment order if not provided
    if (!lessonData.order && lessonData.order !== 0) {
      const lastLesson = await this.lessonModel
        .findOne({ module: lessonData.module })
        .sort({ order: -1 })
        .exec();
      
      lessonData.order = lastLesson ? lastLesson.order + 1 : 0;
    }

    // Get course ID from module if not provided
    if (!lessonData.course) {
      const module = await this.courseModuleModel.findById(lessonData.module);
      if (module) {
        lessonData.course = module.course;
      }
    }

    return await this.lessonModel.create(lessonData);
  }

  public async findLessonById(id: string): Promise<ICourseLesson | null> {
    return await this.lessonModel.findById(id).exec();
  }

  public async getModuleLessons(moduleId: string): Promise<ICourseLesson[]> {
    return await this.lessonModel
      .find({ module: moduleId })
      .sort({ order: 1 })
      .exec();
  }

  public async updateLesson(
    id: string, 
    updateData: Partial<ICourseLesson>
  ): Promise<ICourseLesson | null> {
    return await this.lessonModel
      .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .exec();
  }

  public async deleteLesson(id: string): Promise<void> {
    await this.lessonModel.findByIdAndDelete(id);
  }

  public async reorderLessons(
    moduleId: string, 
    lessonOrders: { id: string; order: number }[]
  ): Promise<void> {
    const bulkOps = lessonOrders.map(({ id, order }) => ({
      updateOne: {
        filter: { _id: id, module: moduleId },
        update: { $set: { order } }
      }
    }));

    await this.lessonModel.bulkWrite(bulkOps);
  }

  // COMPLEX QUERIES
  public async getFullCourseContent(courseId: string): Promise<any> {
    const modules = await this.courseModuleModel
      .find({ course: courseId })
      .sort({ order: 1 })
      .lean();

    const modulesWithLessons = await Promise.all(
      modules.map(async (module: ICourseModule) => {
        const lessons = await this.lessonModel
          .find({ module: module._id })
          .sort({ order: 1 })
          .lean();
        
        return {
          ...module,
          lessons
        };
      })
    );

    return modulesWithLessons;
  }

  public async getModuleWithLessons(moduleId: string): Promise<any> {
    const module = await this.courseModuleModel.findById(moduleId).lean();
    if (!module) return null;

    const lessons = await this.lessonModel
      .find({ module: moduleId })
      .sort({ order: 1 })
      .lean();

    return {
      ...module,
      lessons
    };
  }

  public async getNextLesson(currentLessonId: string): Promise<ICourseLesson | null> {
    const currentLesson = await this.lessonModel.findById(currentLessonId);
    if (!currentLesson) return null;

    return await this.lessonModel
      .findOne({
        module: currentLesson.module,
        order: { $gt: currentLesson.order }
      })
      .sort({ order: 1 })
      .exec();
  }

  public async getPreviousLesson(currentLessonId: string): Promise<ICourseLesson | null> {
    const currentLesson = await this.lessonModel.findById(currentLessonId);
    if (!currentLesson) return null;

    return await this.lessonModel
      .findOne({
        module: currentLesson.module,
        order: { $lt: currentLesson.order }
      })
      .sort({ order: -1 })
      .exec();
  }

  public async getCourseProgress(
    courseId: string, 
    completedModuleIds: string[]
  ): Promise<number> {
    const totalModules = await this.courseModuleModel.countDocuments({
      course: courseId
    });
    
    if (totalModules === 0) return 0;
    
    return Math.round((completedModuleIds.length / totalModules) * 100);
  }

  public async getTotalCourseDuration(courseId: string): Promise<number> {
    const result = await this.lessonModel.aggregate([
      { $match: { course: new Types.ObjectId(courseId) } },
      { $group: { _id: null, totalDuration: { $sum: '$duration' } } }
    ]);

    return result[0]?.totalDuration || 0;
  }
}