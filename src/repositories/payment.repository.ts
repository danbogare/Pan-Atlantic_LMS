import { Model } from 'mongoose';
import { IPayment, PaymentStatus } from '../models/payment.model';

export interface IPaymentRepository {
  create(paymentData: Partial<IPayment>): Promise<IPayment>;
  findByTxRef(txRef: string): Promise<IPayment | null>;
  // Same as findByTxRef with the course's display fields populated
  findByTxRefWithCourse(txRef: string): Promise<IPayment | null>;
  update(id: string, updateData: Partial<IPayment>): Promise<IPayment | null>;
  // Moves a payment out of `pending` only; returns null if it was already settled (e.g. a concurrent verification)
  settlePending(txRef: string, updateData: Partial<IPayment>): Promise<IPayment | null>;
}

export class PaymentRepository implements IPaymentRepository {
  constructor(private readonly paymentModel: Model<IPayment>) {}

  public async create(paymentData: Partial<IPayment>): Promise<IPayment> {
    return await this.paymentModel.create(paymentData);
  }

  public async findByTxRef(txRef: string): Promise<IPayment | null> {
    return await this.paymentModel.findOne({ txRef }).exec();
  }

  public async findByTxRefWithCourse(txRef: string): Promise<IPayment | null> {
    return await this.paymentModel
      .findOne({ txRef })
      .populate('course', 'title thumbnail price currency duration')
      .exec();
  }

  public async update(id: string, updateData: Partial<IPayment>): Promise<IPayment | null> {
    return await this.paymentModel
      .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .exec();
  }

  public async settlePending(txRef: string, updateData: Partial<IPayment>): Promise<IPayment | null> {
    return await this.paymentModel
      .findOneAndUpdate({ txRef, status: PaymentStatus.PENDING }, updateData, { new: true, runValidators: true })
      .exec();
  }
}
