import { Router } from "express";
import { INoteController } from "../controllers/note.controller";
import { IAuthMiddleware } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/async-handler.middleware";
import { validate } from "../middlewares/validation.middleware";
import { createNoteSchema } from "../validators/note.validator";

export class NoteRouter {
  private readonly router = Router();

  constructor(
    private readonly noteController: INoteController,
    private readonly authMiddleware: IAuthMiddleware
  ) {
    this.initializeRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private initializeRoutes(): void {
    this.router.use(asyncHandler(this.authMiddleware.requireAuth));

    this.router.get("/", asyncHandler(this.noteController.getStudentNotes));

    this.router.post(
      "/",
      validate(createNoteSchema),
      asyncHandler(this.noteController.addNote)
    );

    this.router.delete("/:id", asyncHandler(this.noteController.deleteNote));
  }
}