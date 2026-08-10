import { Request, Response } from "express";
import { IStatsService } from "../services/stats.service";
import { successResponse } from "../utils/response";

export interface IStatsController {
  getPlatformStats: (req: Request, res: Response) => Promise<void>;
}

export class StatsController implements IStatsController {
  constructor(private readonly statsService: IStatsService) {}

  public getPlatformStats = async (_req: Request, res: Response): Promise<void> => {
    const stats = await this.statsService.getPlatformStats();
    successResponse(res, "Stats retrieved successfully", stats);
  };
}