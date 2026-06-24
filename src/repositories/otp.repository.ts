import { Model } from 'mongoose';
import { IOtp, OtpPurpose } from '../models/otp.model';

export interface IOtpRepository {
  create(otpData: Partial<IOtp>): Promise<IOtp>;
  findLatest(userId: string, purpose: OtpPurpose): Promise<IOtp | null>;
  deleteMany(userId: string, purpose: OtpPurpose): Promise<void>;
}

export class OtpRepository implements IOtpRepository {
  constructor(private readonly model: Model<IOtp>) {}

  public async create(otpData: Partial<IOtp>): Promise<IOtp> {
    return await this.model.create(otpData);
  }

  public async findLatest(userId: string, purpose: OtpPurpose): Promise<IOtp | null> {
    return await this.model
      .findOne({ userId, purpose })
      .sort({ createdAt: -1 })
      .exec();
  }

  public async deleteMany(userId: string, purpose: OtpPurpose): Promise<void> {
    await this.model.deleteMany({ userId, purpose }).exec();
  }
}