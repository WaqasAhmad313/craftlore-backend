import type { Request, Response } from "express";
import { CareersService } from "./service.ts";
import type {
  CreateJobInput,
  UpdateJobInput,
  JobStatus,
} from "./model.ts";

/* ===== RESPONSE HELPER ===== */

class ResponseHandler {
  static success<T>(res: Response, data: T, message?: string, statusCode: number = 200): Response {
    return res.status(statusCode).json({
      success: true,
      data,
      ...(message && { message })
    });
  }

  static error(res: Response, message: string, statusCode: number = 400): Response {
    return res.status(statusCode).json({
      success: false,
      error: message
    });
  }
}

export class CareersController {
  /* -------- JOBS -------- */

  static async createJob(req: Request, res: Response): Promise<Response> {
    try {
      const payload: CreateJobInput = {
        title:            req.body.title,
        department:       req.body.department,
        location:         req.body.location,
        employment_type:  req.body.employment_type,
        description:      req.body.description,
        responsibilities: req.body.responsibilities,
        requirements:     req.body.requirements,
        compensation_range: req.body.compensation_range ?? null,
        closing_date:     req.body.closing_date ?? null,  // ← new field
      };
      const job = await CareersService.createJob(payload);
      return ResponseHandler.success(res, job, "Job created successfully", 201);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async getJob(req: Request, res: Response): Promise<Response> {
    try {
      const jobId = req.params.jobId;
      if (!jobId) {
        return ResponseHandler.error(res, "Job ID is required", 400);
      }
      const job = await CareersService.getJobById(jobId);
      if (!job) {
        return ResponseHandler.error(res, "Job not found", 404);
      }
      return ResponseHandler.success(res, job);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async getAllJobs(req: Request, res: Response): Promise<Response> {
    try {
      const { status } = req.query;
      const jobs = await CareersService.getAllJobs(status as JobStatus | undefined);
      return ResponseHandler.success(res, jobs);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async getOpenJobs(req: Request, res: Response): Promise<Response> {
    try {
      const jobs = await CareersService.getOpenJobs();
      return ResponseHandler.success(res, jobs);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async getClosedJobs(req: Request, res: Response): Promise<Response> {
    try {
      const jobs = await CareersService.getClosedJobs();
      return ResponseHandler.success(res, jobs);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async updateJob(req: Request, res: Response): Promise<Response> {
    try {
      const jobId = req.params.jobId;
      if (!jobId) {
        return ResponseHandler.error(res, "Job ID is required", 400);
      }
      const payload: UpdateJobInput = {
        ...(req.body as UpdateJobInput),
        // Explicitly carry closing_date so it can be set or cleared (null)
        closing_date: req.body.closing_date !== undefined
          ? req.body.closing_date   // could be a date string or null
          : undefined,
      };
      const job = await CareersService.updateJob(jobId, payload);
      if (!job) {
        return ResponseHandler.error(res, "Job not found", 404);
      }
      return ResponseHandler.success(res, job, "Job updated successfully");
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async deleteJob(req: Request, res: Response): Promise<Response> {
    try {
      const jobId = req.params.jobId;
      if (!jobId) {
        return ResponseHandler.error(res, "Job ID is required", 400);
      }
      const deleted = await CareersService.deleteJob(jobId);
      if (!deleted) {
        return ResponseHandler.error(res, "Job not found", 404);
      }
      return ResponseHandler.success(res, null, "Job deleted successfully");
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  /* -------- APPLICATIONS -------- */

  static async submitApplication(req: Request, res: Response): Promise<Response> {
    try {
      const jobId = req.params.jobId;
      if (!jobId) {
        return ResponseHandler.error(res, "Job ID is required", 400);
      }

      const resumeFile = req.file;
      if (!resumeFile) {
        return ResponseHandler.error(res, "Resume file is required", 400);
      }

      const payload = {
        full_name:     req.body.full_name as string,
        email:         req.body.email as string,
        portfolio_url: req.body.portfolio_url as string | undefined,
        github_url:    req.body.github_url as string | undefined,
        linkedin_url:  req.body.linkedin_url as string | undefined,
        cover_note:    req.body.cover_note as string | undefined,
      };

      const application = await CareersService.submitApplication(
        jobId,
        payload,
        resumeFile
      );

      return ResponseHandler.success(res, application, "Application submitted successfully", 201);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async getApplication(req: Request, res: Response): Promise<Response> {
    try {
      const applicationId = req.params.applicationId;
      if (!applicationId) {
        return ResponseHandler.error(res, "Application ID is required", 400);
      }
      const application = await CareersService.getApplicationById(applicationId);
      if (!application) {
        return ResponseHandler.error(res, "Application not found", 404);
      }
      return ResponseHandler.success(res, application);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async getApplicationsByJob(req: Request, res: Response): Promise<Response> {
    try {
      const jobId = req.params.jobId;
      if (!jobId) {
        return ResponseHandler.error(res, "Job ID is required", 400);
      }
      const applications = await CareersService.getApplicationsByJobId(jobId);
      return ResponseHandler.success(res, applications);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  /* -------- TALENT POOL -------- */

  static async joinTalentPool(req: Request, res: Response): Promise<Response> {
    try {
      const resumeFile = req.file;
      if (!resumeFile) {
        return ResponseHandler.error(res, "Resume file is required", 400);
      }

      const payload = {
        full_name:        req.body.full_name as string,
        email:            req.body.email as string,
        area_of_interest: req.body.area_of_interest as string,
        notes:            req.body.notes as string | undefined,
      };

      const entry = await CareersService.joinTalentPool(payload, resumeFile);
      return ResponseHandler.success(res, entry, "Successfully joined talent pool", 201);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async getTalentPoolEntry(req: Request, res: Response): Promise<Response> {
    try {
      const id = req.params.id;
      if (!id) {
        return ResponseHandler.error(res, "Talent pool entry ID is required", 400);
      }
      const entry = await CareersService.getTalentPoolEntryById(id);
      if (!entry) {
        return ResponseHandler.error(res, "Talent pool entry not found", 404);
      }
      return ResponseHandler.success(res, entry);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async getAllTalentPoolEntries(req: Request, res: Response): Promise<Response> {
    try {
      const { area_of_interest } = req.query;
      const entries = await CareersService.getAllTalentPoolEntries(
        area_of_interest as string | undefined
      );
      return ResponseHandler.success(res, entries);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }
}