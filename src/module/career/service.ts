import CareersModel from "./model.ts";
import { CareersFileUploader } from "./uploader.ts";
import type {
  CreateJobInput,
  UpdateJobInput,
  CreateApplicationInput,
  CreateTalentPoolInput,
  Job,
  Application,
  TalentPoolEntry,
  JobStatus,
} from "./model.ts";

/* ===== RESPONSE STRUCTURES ===== */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export class CareersService {
  /* -------- VALIDATION HELPERS -------- */

  private static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private static validateResumeFile(file: Express.Multer.File): void {
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (file.size > MAX_SIZE) {
      throw new Error("Resume file must be less than 5MB");
    }

    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new Error("Resume must be PDF, DOC, or DOCX format");
    }
  }

  /**
   * Validates that closing_date is a valid future ISO date string.
   * Accepts "YYYY-MM-DD" or full ISO timestamp.
   * Throws if invalid or in the past.
   */
  private static validateClosingDate(closing_date: string): void {
    const parsed = new Date(closing_date);
    if (isNaN(parsed.getTime())) {
      throw new Error("Invalid closing date format. Use YYYY-MM-DD or ISO timestamp.");
    }
    // Strip time — compare at day granularity so "today" is still valid
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsed < today) {
      throw new Error("Closing date must be today or a future date.");
    }
  }

  /* -------- JOBS -------- */

  static async createJob(payload: CreateJobInput): Promise<Job> {
    if (!payload.title?.trim()) {
      throw new Error("Job title is required");
    }
    if (!payload.department?.trim()) {
      throw new Error("Department is required");
    }
    if (!payload.location?.trim()) {
      throw new Error("Location is required");
    }
    if (!payload.description?.trim()) {
      throw new Error("Job description is required");
    }
    if (!payload.responsibilities || payload.responsibilities.length === 0) {
      throw new Error("At least one responsibility is required");
    }
    if (!payload.requirements || payload.requirements.length === 0) {
      throw new Error("At least one requirement is required");
    }
    if (payload.closing_date) {
      this.validateClosingDate(payload.closing_date);
    }

    return CareersModel.createJob(payload);
  }

  static async getJobById(id: string): Promise<Job | null> {
    const job = await CareersModel.getJobById(id);
    // If the job is open but its closing_date has passed, close it now.
    // The DB trigger handles this on writes; this covers plain reads.
    if (job && job.status === "open" && job.days_until_closing === 0) {
      await CareersModel.closeExpiredJobs();
      return CareersModel.getJobById(id); // re-fetch with updated status
    }
    return job;
  }

  static async getAllJobs(status?: JobStatus): Promise<Job[]> {
    return CareersModel.getAllJobs(status);
  }

  static async getOpenJobs(): Promise<Job[]> {
    // Opportunistically close any jobs whose closing_date has passed.
    // This is a safety net — the DB trigger + pg_cron are the primary
    // mechanism, but this ensures correctness even without cron.
    await CareersModel.closeExpiredJobs();
    return CareersModel.getAllJobs("open");
  }

  static async getClosedJobs(): Promise<Job[]> {
    return CareersModel.getAllJobs("closed");
  }

  static async updateJob(id: string, payload: UpdateJobInput): Promise<Job | null> {
    const existingJob = await CareersModel.getJobById(id);
    if (!existingJob) {
      throw new Error("Job not found");
    }

    if (payload.title !== undefined && !payload.title.trim()) {
      throw new Error("Job title cannot be empty");
    }
    if (payload.department !== undefined && !payload.department.trim()) {
      throw new Error("Department cannot be empty");
    }
    if (payload.responsibilities && payload.responsibilities.length === 0) {
      throw new Error("Responsibilities cannot be empty");
    }
    if (payload.requirements && payload.requirements.length === 0) {
      throw new Error("Requirements cannot be empty");
    }
    // Allow clearing closing_date (null) but validate if a new value is given
    if (payload.closing_date != null) {
      this.validateClosingDate(payload.closing_date);
    }

    return CareersModel.updateJob(id, payload);
  }

  static async deleteJob(id: string): Promise<boolean> {
    const existingJob = await CareersModel.getJobById(id);
    if (!existingJob) {
      throw new Error("Job not found");
    }

    return CareersModel.deleteJob(id);
  }

  /* -------- APPLICATIONS -------- */

  static async submitApplication(
    jobId: string,
    payload: Omit<CreateApplicationInput, "job_id" | "resume_url">,
    resumeFile: Express.Multer.File
  ): Promise<Application> {
    // Validate job exists and is open
    const job = await CareersModel.getJobById(jobId);
    if (!job) {
      throw new Error("Job not found");
    }
    if (job.status !== "open") {
      throw new Error("This job is no longer accepting applications");
    }

    // Validate required fields
    if (!payload.full_name?.trim()) {
      throw new Error("Full name is required");
    }
    if (!payload.email?.trim()) {
      throw new Error("Email is required");
    }
    if (!this.validateEmail(payload.email)) {
      throw new Error("Invalid email format");
    }

    // Validate optional URLs
    if (payload.portfolio_url && !this.validateUrl(payload.portfolio_url)) {
      throw new Error("Invalid portfolio URL");
    }
    if (payload.github_url && !this.validateUrl(payload.github_url)) {
      throw new Error("Invalid GitHub URL");
    }
    if (payload.linkedin_url && !this.validateUrl(payload.linkedin_url)) {
      throw new Error("Invalid LinkedIn URL");
    }

    // Check duplicate application
    const isDuplicate = await CareersModel.checkDuplicateApplication(
      jobId,
      payload.email
    );
    if (isDuplicate) {
      throw new Error("You have already applied for this position");
    }

    // Validate and upload resume
    this.validateResumeFile(resumeFile);
    const resumeUrl = await CareersFileUploader.uploadApplicationResume(resumeFile);

    // Create application
    const applicationData: CreateApplicationInput = {
      job_id: jobId,
      full_name: payload.full_name.trim(),
      email: payload.email.trim().toLowerCase(),
      resume_url: resumeUrl,
      portfolio_url: payload.portfolio_url?.trim() || null,
      github_url: payload.github_url?.trim() || null,
      linkedin_url: payload.linkedin_url?.trim() || null,
      cover_note: payload.cover_note?.trim() || null,
    };

    return CareersModel.createApplication(applicationData);
  }

  static async getApplicationById(id: string): Promise<Application | null> {
    return CareersModel.getApplicationById(id);
  }

  static async getApplicationsByJobId(jobId: string): Promise<Application[]> {
    return CareersModel.getApplicationsByJobId(jobId);
  }

  /* -------- TALENT POOL -------- */

  static async joinTalentPool(
    payload: Omit<CreateTalentPoolInput, "resume_url">,
    resumeFile: Express.Multer.File
  ): Promise<TalentPoolEntry> {
    if (!payload.full_name?.trim()) {
      throw new Error("Full name is required");
    }
    if (!payload.email?.trim()) {
      throw new Error("Email is required");
    }
    if (!this.validateEmail(payload.email)) {
      throw new Error("Invalid email format");
    }
    if (!payload.area_of_interest?.trim()) {
      throw new Error("Area of interest is required");
    }

    const isDuplicate = await CareersModel.checkDuplicateTalentPoolEntry(
      payload.email
    );
    if (isDuplicate) {
      throw new Error("This email is already in our talent pool");
    }

    this.validateResumeFile(resumeFile);
    const resumeUrl = await CareersFileUploader.uploadTalentPoolResume(resumeFile);

    const talentPoolData: CreateTalentPoolInput = {
      full_name: payload.full_name.trim(),
      email: payload.email.trim().toLowerCase(),
      area_of_interest: payload.area_of_interest.trim(),
      resume_url: resumeUrl,
      notes: payload.notes?.trim() || null,
    };

    return CareersModel.createTalentPoolEntry(talentPoolData);
  }

  static async getTalentPoolEntryById(id: string): Promise<TalentPoolEntry | null> {
    return CareersModel.getTalentPoolEntryById(id);
  }

  static async getAllTalentPoolEntries(
    areaOfInterest?: string
  ): Promise<TalentPoolEntry[]> {
    return CareersModel.getAllTalentPoolEntries(areaOfInterest);
  }
}