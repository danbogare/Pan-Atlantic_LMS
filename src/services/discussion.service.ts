import { IDiscussionRepository } from "../repositories/discussion.repository";
import { ICourseRepository } from "../repositories/course.repository";
import { IDiscussion, IDiscussionReply } from "../models/discussion.model";
import { CourseNotFoundError, DiscussionNotFoundError } from "../errors/error";
import { Types } from "mongoose";
import { CreateDiscussionPayload } from "../interfaces/discussion.interface";

export interface IDiscussionService {
  createDiscussion(courseId: string, authorId: string, data: CreateDiscussionPayload): Promise<IDiscussion>;
  getCourseDiscussions(courseId: string): Promise<IDiscussion[]>;
  getDiscussionWithReplies(discussionId: string): Promise<any>;
  addReply(discussionId: string, authorId: string, body: string): Promise<IDiscussionReply>;
}

export class DiscussionService implements IDiscussionService {
  constructor(
    private readonly discussionRepository: IDiscussionRepository,
    private readonly courseRepository: ICourseRepository
  ) {}

  public async createDiscussion(
    courseId: string,
    authorId: string,
    data: CreateDiscussionPayload
  ): Promise<IDiscussion> {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new CourseNotFoundError(`Course ${courseId} not found`);
    }

    return await this.discussionRepository.create({
      course: new Types.ObjectId(courseId),
      author: new Types.ObjectId(authorId),
      title: data.title,
      body: data.body,
    });
  }

  public async getCourseDiscussions(courseId: string): Promise<IDiscussion[]> {
    return await this.discussionRepository.getCourseDiscussions(courseId);
  }

  public async getDiscussionWithReplies(discussionId: string): Promise<any> {
    const discussion = await this.discussionRepository.getDiscussionWithReplies(discussionId);
    if (!discussion) {
      throw new DiscussionNotFoundError(`Discussion ${discussionId} not found`);
    }
    return discussion;
  }

  public async addReply(discussionId: string, authorId: string, body: string): Promise<IDiscussionReply> {
    const discussion = await this.discussionRepository.findById(discussionId);
    if (!discussion) {
      throw new DiscussionNotFoundError(`Discussion ${discussionId} not found`);
    }

    return await this.discussionRepository.addReply({
      discussion: new Types.ObjectId(discussionId),
      author: new Types.ObjectId(authorId),
      body,
    });
  }
}