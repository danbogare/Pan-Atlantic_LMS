import { Request, Response } from "express";
import { IBadgeService } from "../services/badge.service";
import { createdSuccessResponse, successResponse } from "../utils/response";
import { CreateBadgeInput, UpdateBadgeInput } from "../validators/badge.validator";

export interface IBadgeController {
  getStudentBadges: (req: Request, res: Response) => Promise<void>;
  createBadge: (req: Request<{}, {}, CreateBadgeInput>, res: Response) => Promise<void>;
  getAllBadges: (req: Request, res: Response) => Promise<void>;
  updateBadge: (req: Request<{ id: string }, {}, UpdateBadgeInput>, res: Response) => Promise<void>;
  deactivateBadge: (req: Request<{ id: string }>, res: Response) => Promise<void>;
}

export class BadgeController implements IBadgeController {
  constructor(private readonly badgeService: IBadgeService) {}

  public getStudentBadges = async (req: Request, res: Response): Promise<void> => {
    const studentId = req.user?.id as string;
    const badges = await this.badgeService.getStudentBadges(studentId);
    successResponse(res, "badges retrieved successfully", badges);
  };

  public createBadge = async (req: Request<{}, {}, CreateBadgeInput>, res: Response): Promise<void> => {
    const badge = await this.badgeService.createBadge(req.body);
    createdSuccessResponse(res, "badge created successfully", badge);
  };

  public getAllBadges = async (_req: Request, res: Response): Promise<void> => {
    const badges = await this.badgeService.getAllBadges();
    successResponse(res, "badges retrieved successfully", badges);
  };

  public updateBadge = async (req: Request<{ id: string }, {}, UpdateBadgeInput>, res: Response): Promise<void> => {
    const { id } = req.params;
    const badge = await this.badgeService.updateBadge(id, req.body);
    successResponse(res, "badge updated successfully", badge);
  };

  public deactivateBadge = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    await this.badgeService.deactivateBadge(id as string);
    successResponse(res, "badge deactivated successfully", {});
  };
}

