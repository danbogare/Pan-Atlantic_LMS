import { Request, Response } from "express";
import { ICertificateService } from "../services/certificate.service";
import { successResponse } from "../utils/response";

export interface ICertificateController {
  getStudentCertificates: (req: Request, res: Response) => Promise<void>;
  verifyCertificate: (req: Request, res: Response) => Promise<void>;
}

export class CertificateController implements ICertificateController {
  constructor(private readonly certificateService: ICertificateService) {}

  public getStudentCertificates = async (req: Request, res: Response): Promise<void> => {
    const studentId = req.user?.id as string;
    const certificates = await this.certificateService.getStudentCertificates(studentId);
    successResponse(res, "certificates retrieved successfully", certificates);
  };

  // Unauthenticated route — no req.user here, mount outside your auth middleware
  public verifyCertificate = async (req: Request, res: Response): Promise<void> => {
    const { certificateNumber } = req.params;
    const certificate = await this.certificateService.verifyCertificate(certificateNumber as string);
    successResponse(res, "certificate is valid", certificate);
  };
}