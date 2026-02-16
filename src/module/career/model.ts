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
}

export interface Job {
  id: string;
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

/* ===== MODEL CLASS ===== */

class CareersModel {
  /* -------- JOBS -------- */

  static async createJob(payload: CreateJobInput): Promise<Job> {
    const query = `
      INSERT INTO content.careers_jobs (
        title,
        department,
        location,
        employment_type,
        description,
        responsibilities,
        requirements,
        compensation_range
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)
      RETURNING *
    `;

    const values = [
      payload.title,
      payload.department,
      payload.location,
      payload.employment_type,
      payload.description,
      JSON.stringify(payload.responsibilities),
      JSON.stringify(payload.requirements),
      payload.compensation_range ?? null,
    ];

    const result = await db.query<Job>(query, values);
    return result.rows[0]!;
  }

  static async getJobById(id: string): Promise<Job | null> {
    const result = await db.query<Job>(
      `SELECT * FROM content.careers_jobs WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  static async getAllJobs(status?: JobStatus): Promise<Job[]> {
    let query = `
      SELECT * FROM content.careers_jobs
    `;

    const values: string[] = [];

    if (status) {
      query += ` WHERE status = $1`;
      values.push(status);
    }

    query += ` ORDER BY published_at DESC`;

    const result = await db.query<Job>(query, values);
    return result.rows;
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

    const result = await db.query<Job>(query, values);
    return result.rows[0] ?? null;
  }

  static async deleteJob(id: string): Promise<boolean> {
    const result = await db.query(
      `DELETE FROM content.careers_jobs WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
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
    let query = `
      SELECT * FROM content.careers_talent_pool
    `;

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