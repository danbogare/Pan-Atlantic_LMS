import { Request, Response } from "express";
import { IStatsService } from "../services/stats.service";
import { successResponse } from "../utils/response";

export interface IStatsController {
  getPlatformStats: (req: Request, res: Response) => Promise<void>;
  getInstructorStats: (req: Request, res: Response) => Promise<void>;
}

export class StatsController implements IStatsController {
  constructor(private readonly statsService: IStatsService) {}

  public getPlatformStats = async (_req: Request, res: Response): Promise<void> => {
    const stats = await this.statsService.getPlatformStats();
    successResponse(res, "Stats retrieved successfully", stats);
  };

  public getInstructorStats = async (req: Request, res: Response): Promise<void> => {
    const instructorId = req.user?.id as string;
    const stats = await this.statsService.getInstructorStats(instructorId);
    successResponse(res, "instructor stats retrieved successfully", stats);
  };
}