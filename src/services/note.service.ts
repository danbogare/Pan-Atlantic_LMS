import { INoteRepository } from "../repositories/note.repository";
import { ICourseRepository } from "../repositories/course.repository";
import { INote } from "../models/note.model";
import { CourseNotFoundError, NoteNotFoundError } from "../errors/error";
import { Types } from "mongoose";
import { CreateNotePayload } from "../interfaces/note.interface";

export interface INoteService {
  addNote(studentId: string, data: CreateNotePayload): Promise<INote>;
  getStudentNotes(studentId: string, courseId?: string, lessonId?: string): Promise<INote[]>;
  deleteNote(id: string, studentId: string): Promise<void>;
}

export class NoteService implements INoteService {
  constructor(
    private readonly noteRepository: INoteRepository,
    private readonly courseRepository: ICourseRepository
  ) {}

  public async addNote(studentId: string, data: CreateNotePayload): Promise<INote> {
    const course = await this.courseRepository.findById(data.courseId);
    if (!course) {
      throw new CourseNotFoundError(`Course ${data.courseId} not found`);
    }

    return await this.noteRepository.create({
      student: new Types.ObjectId(studentId),
      course: new Types.ObjectId(data.courseId),
      lesson: data.lessonId ? new Types.ObjectId(data.lessonId) : undefined,
      content: data.content,
    });
  }

  public async getStudentNotes(
    studentId: string,
    courseId?: string,
    lessonId?: string
  ): Promise<INote[]> {
    return await this.noteRepository.getStudentNotes(studentId, courseId, lessonId);
  }

  public async deleteNote(id: string, studentId: string): Promise<void> {
    const deleted = await this.noteRepository.delete(id, studentId);
    if (!deleted) {
      throw new NoteNotFoundError(`Note ${id} not found`);
    }
  }
}