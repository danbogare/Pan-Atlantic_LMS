import { Request, Response } from "express";
import { INoteService } from "../services/note.service";
import { createdSuccessResponse, successResponse } from "../utils/response";
import { CreateNoteInput } from "../validators/note.validator";
import { CreateNotePayload } from "../interfaces/note.interface";

export interface INoteController {
  addNote: (req: Request<{}, {}, CreateNoteInput>, res: Response) => Promise<void>;
  getStudentNotes: (req: Request, res: Response) => Promise<void>;
  deleteNote: (req: Request, res: Response) => Promise<void>;
}

export class NoteController implements INoteController {
  constructor(private readonly noteService: INoteService) {}

  public addNote = async (req: Request<{}, {}, CreateNoteInput>, res: Response): Promise<void> => {
    const studentId = req.user?.id as string;
    const { courseId, lessonId, content } = req.body;

    const payload: CreateNotePayload = { courseId, lessonId, content };
    const note = await this.noteService.addNote(studentId, payload);

    createdSuccessResponse(res, "note added successfully", note);
  };

  public getStudentNotes = async (req: Request, res: Response): Promise<void> => {
    const studentId = req.user?.id as string;
    const { courseId, lessonId } = req.query;

    const notes = await this.noteService.getStudentNotes(
      studentId,
      courseId as string | undefined,
      lessonId as string | undefined
    );

    successResponse(res, "notes retrieved successfully", notes);
  };

  public deleteNote = async (req: Request, res: Response): Promise<void> => {
    const studentId = req.user?.id as string;
    const { id } = req.params;

    await this.noteService.deleteNote(id as string, studentId);

    successResponse(res, "note deleted successfully", {});
  };
}