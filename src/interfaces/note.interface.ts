export interface CreateNotePayload {
  courseId: string;
  lessonId?: string;
  content: string;
}