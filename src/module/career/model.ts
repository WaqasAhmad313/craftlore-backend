import { db } from "../../config/db.ts";

/* ===== TYPES & INTERFACES ===== */

export type JobStatus = "open" | "closed" | "archived";
export type EmploymentType = "full-time" | "part-time" | "contract" | "internship";

/* ===== JOB INTERFACES ===== */

export interface CreateJobInput {
  title: string;
  department: string;
  location: string;
  employment_type: EmploymentType;
  description: string;
  responsibilities: string[];
  requirements: string[];
  compensation_range?: string | null;
  closing_date?: string | null; // ISO date string, e.g. "2025-12-31"
}

export interface UpdateJobInput {
  title?: string;
  department?: string;
  location?: string;
  employment_type?: EmploymentType;
  description?: string;
  responsibilities?: string[];
  requirements?: string[];
  compensation_range?: string | null;
  status?: JobStatus;
  closing_date?: string | null;
}

export interface Job {
  id: string;
  job_code: string;           // e.g. "CL-2025-001"
  title: string;
  department: string;
  location: string;
  employment_type: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  compensation_range: string | null;
  status: JobStatus;
  application_count: number;
  closing_date: string | null; // ISO timestamptz string
  days_until_closing: number | null; // computed: null if no closing_date or already passed
  published_at: string;
  created_at: string;
}

/* ===== APPLICATION INTERFACES ===== */

export interface CreateApplicationInput {
  job_id: string;
  full_name: string;
  email: string;
  resume_url: string;
  portfolio_url?: string | null;
  github_url?: string | null;
  linkedin_url?: string | null;
  cover_note?: string | null;
}

export interface Application {
  id: string;
  job_id: string;
  full_name: string;
  email: string;
  resume_url: string;
  portfolio_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  cover_note: string | null;
  created_at: string;
}

/* ===== TALENT POOL INTERFACES ===== */

export interface CreateTalentPoolInput {
  full_name: string;
  email: string;
  area_of_interest: string;
  resume_url: string;
  notes?: string | null;
}

export interface TalentPoolEntry {
  id: string;
  full_name: string;
  email: string;
  area_of_interest: string;
  resume_url: string;
  notes: string | null;
  created_at: string;
}

/* ===== RAW DB ROW (before computed field) ===== */

interface JobRow {
  id: string;
  job_code: string;
  title: string;
  department: string;
  location: string;
  employment_type: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  compensation_range: string | null;
  status: JobStatus;
  application_count: number;
  closing_date: string | null;
  published_at: string;
  created_at: string;
}

/* ===== HELPERS ===== */

/**
 * Generates the next sequential job code for the current year, e.g. "CL-2025-004".
 * Uses the DB helper function so it's race-safe within a single insert.
 */
async function generateJobCode(): Promise<string> {
  const result = await db.query<{ next_job_code: string }>(
    `SELECT content.next_job_code() AS next_job_code`
  );
  return result.rows[0]!.next_job_code;
}

/**
 * Computes days_until_closing from a closing_date ISO string.
 * Returns null if no date is set.
 * Returns 0 if the date has already passed (not negative).
 */
function computeDaysUntilClosing(closingDate: string | null): number | null {
  if (!closingDate) return null;
  const now = Date.now();
  const end = new Date(closingDate).getTime();
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

/** Attaches the computed `days_until_closing` field to a raw DB row */
function toJob(row: JobRow): Job {
  return {
    ...row,
    days_until_closing: computeDaysUntilClosing(row.closing_date),
  };
}

/* ===== MODEL CLASS ===== */

class CareersModel {
  /* -------- JOBS -------- */

  static async createJob(payload: CreateJobInput): Promise<Job> {
    const jobCode = await generateJobCode();

    const query = `
      INSERT INTO content.careers_jobs (
        job_code,
        title,
        department,
        location,
        employment_type,
        description,
        responsibilities,
        requirements,
        compensation_range,
        closing_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10)
      RETURNING *
    `;

    const values = [
      jobCode,
      payload.title,
      payload.department,
      payload.location,
      payload.employment_type,
      payload.description,
      JSON.stringify(payload.responsibilities),
      JSON.stringify(payload.requirements),
      payload.compensation_range ?? null,
      payload.closing_date ?? null,
    ];

    const result = await db.query<JobRow>(query, values);
    return toJob(result.rows[0]!);
  }

  static async getJobById(id: string): Promise<Job | null> {
    const result = await db.query<JobRow>(
      `SELECT * FROM content.careers_jobs WHERE id = $1 LIMIT 1`,
      [id]
    );
    const row = result.rows[0];
    return row ? toJob(row) : null;
  }

  static async getAllJobs(status?: JobStatus): Promise<Job[]> {
    let query = `SELECT * FROM content.careers_jobs`;
    const values: string[] = [];

    if (status) {
      query += ` WHERE status = $1`;
      values.push(status);
    }

    query += ` ORDER BY published_at DESC`;

    const result = await db.query<JobRow>(query, values);
    return result.rows.map(toJob);
  }

  static async updateJob(id: string, payload: UpdateJobInput): Promise<Job | null> {
    const fields: string[] = [];
    const values: (string | string[] | null)[] = [];
    let paramIndex = 1;

    if (payload.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(payload.title);
    }
    if (payload.department !== undefined) {
      fields.push(`department = $${paramIndex++}`);
      values.push(payload.department);
    }
    if (payload.location !== undefined) {
      fields.push(`location = $${paramIndex++}`);
      values.push(payload.location);
    }
    if (payload.employment_type !== undefined) {
      fields.push(`employment_type = $${paramIndex++}`);
      values.push(payload.employment_type);
    }
    if (payload.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(payload.description);
    }
    if (payload.responsibilities !== undefined) {
      fields.push(`responsibilities = $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(payload.responsibilities));
    }
    if (payload.requirements !== undefined) {
      fields.push(`requirements = $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(payload.requirements));
    }
    if (payload.compensation_range !== undefined) {
      fields.push(`compensation_range = $${paramIndex++}`);
      values.push(payload.compensation_range);
    }
    if (payload.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(payload.status);
    }
    if (payload.closing_date !== undefined) {
      fields.push(`closing_date = $${paramIndex++}`);
      values.push(payload.closing_date);
    }

    if (fields.length === 0) {
      return this.getJobById(id);
    }

    values.push(id);

    const query = `
      UPDATE content.careers_jobs
      SET ${fields.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query<JobRow>(query, values);
    const row = result.rows[0];
    return row ? toJob(row) : null;
  }

  static async deleteJob(id: string): Promise<boolean> {
    const result = await db.query(
      `DELETE FROM content.careers_jobs WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Bulk-closes all open jobs whose closing_date is in the past.
   * Called opportunistically by the service layer on every getOpenJobs()
   * and getJobById() read as a safety net alongside the DB trigger + pg_cron.
   * Returns the number of rows closed.
   */
  static async closeExpiredJobs(): Promise<number> {
    const result = await db.query(
      `UPDATE content.careers_jobs
       SET    status = 'closed'
       WHERE  status = 'open'
         AND  closing_date IS NOT NULL
         AND  closing_date < NOW()`
    );
    return result.rowCount ?? 0;
  }

  /* -------- APPLICATIONS -------- */

  static async createApplication(payload: CreateApplicationInput): Promise<Application> {
    const query = `
      INSERT INTO content.careers_job_applications (
        job_id,
        full_name,
        email,
        resume_url,
        portfolio_url,
        github_url,
        linkedin_url,
        cover_note
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      payload.job_id,
      payload.full_name,
      payload.email,
      payload.resume_url,
      payload.portfolio_url ?? null,
      payload.github_url ?? null,
      payload.linkedin_url ?? null,
      payload.cover_note ?? null,
    ];

    const result = await db.query<Application>(query, values);
    return result.rows[0]!;
  }

  static async getApplicationById(id: string): Promise<Application | null> {
    const result = await db.query<Application>(
      `SELECT * FROM content.careers_job_applications WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  static async getApplicationsByJobId(jobId: string): Promise<Application[]> {
    const result = await db.query<Application>(
      `
      SELECT *
      FROM content.careers_job_applications
      WHERE job_id = $1
      ORDER BY created_at DESC
      `,
      [jobId]
    );
    return result.rows;
  }

  static async checkDuplicateApplication(
    jobId: string,
    email: string
  ): Promise<boolean> {
    const result = await db.query<{ exists: boolean }>(
      `
      SELECT EXISTS(
        SELECT 1
        FROM content.careers_job_applications
        WHERE job_id = $1 AND email = $2
      ) as exists
      `,
      [jobId, email]
    );
    return result.rows[0]?.exists ?? false;
  }

  /* -------- TALENT POOL -------- */

  static async createTalentPoolEntry(
    payload: CreateTalentPoolInput
  ): Promise<TalentPoolEntry> {
    const query = `
      INSERT INTO content.careers_talent_pool (
        full_name,
        email,
        area_of_interest,
        resume_url,
        notes
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      payload.full_name,
      payload.email,
      payload.area_of_interest,
      payload.resume_url,
      payload.notes ?? null,
    ];

    const result = await db.query<TalentPoolEntry>(query, values);
    return result.rows[0]!;
  }

  static async getTalentPoolEntryById(id: string): Promise<TalentPoolEntry | null> {
    const result = await db.query<TalentPoolEntry>(
      `SELECT * FROM content.careers_talent_pool WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  static async getAllTalentPoolEntries(
    areaOfInterest?: string
  ): Promise<TalentPoolEntry[]> {
    let query = `SELECT * FROM content.careers_talent_pool`;
    const values: string[] = [];

    if (areaOfInterest) {
      query += ` WHERE area_of_interest = $1`;
      values.push(areaOfInterest);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await db.query<TalentPoolEntry>(query, values);
    return result.rows;
  }

  static async checkDuplicateTalentPoolEntry(email: string): Promise<boolean> {
    const result = await db.query<{ exists: boolean }>(
      `
      SELECT EXISTS(
        SELECT 1
        FROM content.careers_talent_pool
        WHERE email = $1
      ) as exists
      `,
      [email]
    );
    return result.rows[0]?.exists ?? false;
  }
}

export default CareersModel;