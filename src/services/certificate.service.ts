import { ICertificateRepository } from "../repositories/certificate.repository";
import { ICertificate } from "../models/certificate.model";
import { CertificateNotFoundError } from "../errors/error";
import { Types } from "mongoose";

export interface ICertificateService {
  issueCertificate(studentId: string, courseId: string, enrollmentId: string): Promise<ICertificate>;
  getStudentCertificates(studentId: string): Promise<ICertificate[]>;
  verifyCertificate(certificateNumber: string): Promise<ICertificate>;
}

export class CertificateService implements ICertificateService {
  constructor(private readonly certificateRepository: ICertificateRepository) {}

  // Idempotent by design (repo checks for an existing one) — safe to call
  // every time an enrollment hits 100%, even on retries.
  public async issueCertificate(
    studentId: string,
    courseId: string,
    enrollmentId: string
  ): Promise<ICertificate> {
    return await this.certificateRepository.issue({
      student: new Types.ObjectId(studentId),
      course: new Types.ObjectId(courseId),
      enrollment: new Types.ObjectId(enrollmentId),
    });
  }

  public async getStudentCertificates(studentId: string): Promise<ICertificate[]> {
    return await this.certificateRepository.getStudentCertificates(studentId);
  }

  public async verifyCertificate(certificateNumber: string): Promise<ICertificate> {
    const certificate = await this.certificateRepository.verifyByCertificateNumber(certificateNumber);
    if (!certificate) {
      throw new CertificateNotFoundError(`Certificate ${certificateNumber} not found`);
    }
    return certificate;
  }
}