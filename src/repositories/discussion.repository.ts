import { Model } from 'mongoose';
import { IDiscussion, IDiscussionReply } from '../models/discussion.model';

export interface IDiscussionRepository {
  create(discussionData: Partial<IDiscussion>): Promise<IDiscussion>;
  findById(id: string): Promise<IDiscussion | null>;
  getCourseDiscussions(courseId: string): Promise<IDiscussion[]>;
  getDiscussionWithReplies(discussionId: string): Promise<any>;
  addReply(replyData: Partial<IDiscussionReply>): Promise<IDiscussionReply>;
  getReplies(discussionId: string): Promise<IDiscussionReply[]>;
}

export class DiscussionRepository implements IDiscussionRepository {
  constructor(
    private readonly discussionModel: Model<IDiscussion>,
    private readonly replyModel: Model<IDiscussionReply>
  ) {}

  public async create(discussionData: Partial<IDiscussion>): Promise<IDiscussion> {
    return await this.discussionModel.create(discussionData);
  }

  public async findById(id: string): Promise<IDiscussion | null> {
    return await this.discussionModel
      .findById(id)
      .populate('author', 'firstName lastName')
      .exec();
  }

  public async getCourseDiscussions(courseId: string): Promise<IDiscussion[]> {
    return await this.discussionModel
      .find({ course: courseId })
      .populate('author', 'firstName lastName')
      .sort({ createdAt: -1 })
      .exec();
  }

  public async getDiscussionWithReplies(discussionId: string): Promise<any> {
    const discussion = await this.discussionModel
      .findById(discussionId)
      .populate('author', 'firstName lastName')
      .lean();

    if (!discussion) return null;

    const replies = await this.replyModel
      .find({ discussion: discussionId })
      .populate('author', 'firstName lastName')
      .sort({ createdAt: 1 })
      .lean();

    return { ...discussion, replies };
  }

  public async addReply(replyData: Partial<IDiscussionReply>): Promise<IDiscussionReply> {
    const reply = await this.replyModel.create(replyData);

    // Keep the denormalized counter in sync
    await this.discussionModel.findByIdAndUpdate(replyData.discussion, {
      $inc: { repliesCount: 1 },
    });

    return reply;
  }

  public async getReplies(discussionId: string): Promise<IDiscussionReply[]> {
    return await this.replyModel
      .find({ discussion: discussionId })
      .populate('author', 'firstName lastName')
      .sort({ createdAt: 1 })
      .exec();
  }
}