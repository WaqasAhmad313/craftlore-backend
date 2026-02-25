import type { Response } from "express";

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = "Request successful",
  statusCode = 200
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  return res.status(statusCode).json(response);
};

export const sendCreated = <T>(
  res: Response,
  data: T,
  message = "Resource created successfully"
): Response => {
  return sendSuccess(res, data, message, 201);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 400
): Response => {
  const response: ApiResponse = {
    success: false,
    message,
  };
  return res.status(statusCode).json(response);
};