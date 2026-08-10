import { Request, Response } from "express";
import { IDiscussionService } from "../services/discussion.service";
import { createdSuccessResponse, successResponse } from "../utils/response";
import { CreateDiscussionInput, CreateReplyInput } from "../validators/discussion.validator";

export interface IDiscussionController {
  createDiscussion: (req: Request<{ courseId: string }, {}, CreateDiscussionInput>, res: Response) => Promise<void>;
  getCourseDiscussions: (req: Request, res: Response) => Promise<void>;
  getDiscussionById: (req: Request, res: Response) => Promise<void>;
  addReply: (req: Request<{ courseId: string; discussionId: string }, {}, CreateReplyInput>, res: Response) => Promise<void>;
}

export class DiscussionController implements IDiscussionController {
  constructor(private readonly discussionService: IDiscussionService) {}

  public createDiscussion = async (
    req: Request<{ courseId: string }, {}, CreateDiscussionInput>,
    res: Response
  ): Promise<void> => {
    const { courseId } = req.params;
    const authorId = req.user?.id as string;
    const { title, body } = req.body;

    const discussion = await this.discussionService.createDiscussion(courseId, authorId, { title, body });

    createdSuccessResponse(res, "discussion created successfully", discussion);
  };

  public getCourseDiscussions = async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params;
    const discussions = await this.discussionService.getCourseDiscussions(courseId as string);
    successResponse(res, "discussions retrieved successfully", discussions);
  };

  public getDiscussionById = async (req: Request, res: Response): Promise<void> => {
    const { discussionId } = req.params;
    const discussion = await this.discussionService.getDiscussionWithReplies(discussionId as string);
    successResponse(res, "discussion retrieved successfully", discussion);
  };

  public addReply = async (
    req: Request<{ courseId: string; discussionId: string }, {}, CreateReplyInput>,
    res: Response
  ): Promise<void> => {
    const { discussionId } = req.params;
    const authorId = req.user?.id as string;
    const { body } = req.body;

    const reply = await this.discussionService.addReply(discussionId, authorId, body);

    createdSuccessResponse(res, "reply added successfully", reply);
  };
}