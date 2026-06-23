import { Response } from "express";

// type ApiResponse<T> = {
//   success: boolean;
//   message: string;
//   data: T;
// };

export const response = <T>(
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data: T
) => {
  return res.status(statusCode).json({
    success,
    message,
    data,
  });
};

export const successResponse = <T>(
  res: Response,
  message: string,
  data: T
) => response(res, 200, true, message, data);

export const createdSuccessResponse = <T>(
  res: Response,
  message: string,
  data: T
) => response(res, 201, true, message, data);

export const errorResponse = (
  res: Response,
  statusCode: number,
  message: string
) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};