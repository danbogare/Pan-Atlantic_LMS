import { Schema, model, Document, Types } from 'mongoose';

export interface IDiscussion extends Document {
  course: Types.ObjectId;
  author: Types.ObjectId;
  title: string;
  body: string;
  repliesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const DiscussionSchema = new Schema<IDiscussion>(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    repliesCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

DiscussionSchema.index({ course: 1, createdAt: -1 });

export interface IDiscussionReply extends Document {
  discussion: Types.ObjectId;
  author: Types.ObjectId;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

const DiscussionReplySchema = new Schema<IDiscussionReply>(
  {
    discussion: { type: Schema.Types.ObjectId, ref: 'Discussion', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true },
  },
  { timestamps: true }
);

DiscussionReplySchema.index({ discussion: 1, createdAt: 1 });

export const Discussion = model<IDiscussion>('Discussion', DiscussionSchema);
export const DiscussionReply = model<IDiscussionReply>('DiscussionReply', DiscussionReplySchema);