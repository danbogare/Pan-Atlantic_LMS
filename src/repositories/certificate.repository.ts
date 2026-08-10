import { Model } from 'mongoose';
import { ICertificate } from '../models/certificate.model';

export interface ICertificateRepository {
  issue(certificateData: Partial<ICertificate>): Promise<ICertificate>;
  findByStudentAndCourse(studentId: string, courseId: string): Promise<ICertificate | null>;
  getStudentCertificates(studentId: string): Promise<ICertificate[]>;
  verifyByCertificateNumber(certificateNumber: string): Promise<ICertificate | null>;
}

export class CertificateRepository implements ICertificateRepository {
  constructor(private readonly certificateModel: Model<ICertificate>) {}

  public async issue(certificateData: Partial<ICertificate>): Promise<ICertificate> {
    // Guard against double-issuance beyond just relying on the unique index —
    // lets callers treat re-issuing as a safe no-op instead of a thrown error.
    const existing = await this.certificateModel.findOne({
      student: certificateData.student,
      course: certificateData.course,
    });
    if (existing) return existing;

    return await this.certificateModel.create(certificateData);
  }

  public async findByStudentAndCourse(
    studentId: string,
    courseId: string
  ): Promise<ICertificate | null> {
    return await this.certificateModel
      .findOne({ student: studentId, course: courseId })
      .exec();
  }

  public async getStudentCertificates(studentId: string): Promise<ICertificate[]> {
    return await this.certificateModel
      .find({ student: studentId })
      .populate('course', 'title level duration')
      .sort({ issuedAt: -1 })
      .exec();
  }

  // Unauthenticated lookup — used for public "verify this certificate" pages
  public async verifyByCertificateNumber(certificateNumber: string): Promise<ICertificate | null> {
    return await this.certificateModel
      .findOne({ certificateNumber })
      .populate('student', 'firstName lastName')
      .populate('course', 'title level')
      .exec();
  }
}