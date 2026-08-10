import { Model } from 'mongoose';
import { INote } from '../models/note.model';

export interface INoteRepository {
  create(noteData: Partial<INote>): Promise<INote>;
  findById(id: string): Promise<INote | null>;
  getStudentNotes(studentId: string, courseId?: string, lessonId?: string): Promise<INote[]>;
  delete(id: string, studentId: string): Promise<boolean>;
}

export class NoteRepository implements INoteRepository {
  constructor(private readonly noteModel: Model<INote>) {}

  public async create(noteData: Partial<INote>): Promise<INote> {
    return await this.noteModel.create(noteData);
  }

  public async findById(id: string): Promise<INote | null> {
    return await this.noteModel.findById(id).exec();
  }

  public async getStudentNotes(
    studentId: string,
    courseId?: string,
    lessonId?: string
  ): Promise<INote[]> {
    const query: any = { student: studentId };
    if (courseId) query.course = courseId;
    if (lessonId) query.lesson = lessonId;

    return await this.noteModel
      .find(query)
      .populate('course', 'title')
      .populate('lesson', 'title')
      .sort({ createdAt: -1 })
      .exec();
  }

  public async delete(id: string, studentId: string): Promise<boolean> {
    // Scoped to studentId so a student can't delete someone else's note by guessing an id
    const result = await this.noteModel.findOneAndDelete({ _id: id, student: studentId }).exec();
    return !!result;
  }
}